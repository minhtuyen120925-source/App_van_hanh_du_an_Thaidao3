import { withSupabase } from 'npm:@supabase/server'
import {
  IMAGE_TYPES,
  ROUTER_SCHEMA,
  analyzeDraft,
  buildRouterPrompt,
  emptyFields,
  loadMachines,
  looksLikeFuelEntry,
  mergeFields,
  normText,
  nowHHMM,
  parseRouterOutput,
  renderSaved,
  renderSummary,
  sanitizeFields,
  sanitizeHistory,
  sanitizeImageTypes,
  sanitizeUncertain,
  todayVN,
  toInsert,
} from './fuel.ts'
import type { DraftFields, Kind } from './fuel.ts'
import { buildFuelPromptBlock, buildPostSave, fetchFuelContext, isPlainQuestion, mentionsFuel } from './fuel-report.ts'

const GEMINI_MODEL = 'gemini-3.6-flash'

const BUCKET = 'fuel-slips'
const MAX_IMAGES_PER_MESSAGE = 4
const MAX_IMAGES_PER_SLIP = 6
const MAX_IMAGE_BASE64 = 1_500_000 // khung chat đã thu nhỏ ảnh; mỗi ảnh thường chỉ vài trăm KB
const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const ROUTER_JSON_HINT = `

Cấu trúc JSON cần trả về (đủ các khóa này): {"y_dinh": "phieu_nhap" | "phieu_xuat" | "huy" | "hoi_dap", "phieu_moi": true | false, "ngay": "YYYY-MM-DD" | null, "gio": "HH:MM" | null, "so_phieu": chuỗi | null, "so_lit": số | null, "don_gia": số | null, "nha_cung_cap": chuỗi | null, "bien_so_xe_bon": chuỗi | null, "nguoi_giao": chuỗi | null, "nguoi_nhan": chuỗi | null, "may": chuỗi | null, "dong_ho_lan_truoc": số | null, "dong_ho_lan_nay": số | null, "hang_muc": chuỗi | null, "ghi_chu": chuỗi | null, "thanh_tien_phieu": số | null, "khong_chac": [tên trường đọc chưa chắc], "anh": ["phieu" | "hoa_don" | "cot_bom" | "bon" | "kho" | "khac", ... theo thứ tự ảnh], "mo_ta_anh": chuỗi | null}`

async function fetchProjectContext(supabase: any) {
  const [contracts, workItems, payments, adjustments, timeline, handovers, documents] =
    await Promise.all([
      supabase.from('contracts').select('*'),
      supabase.from('work_items').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('contract_adjustments').select('*'),
      supabase.from('timeline').select('*'),
      supabase.from('handovers').select('*'),
      supabase.from('documents').select('*'),
    ])

  return {
    contracts: contracts.data,
    work_items: workItems.data,
    payments: payments.data,
    contract_adjustments: adjustments.data,
    timeline: timeline.data,
    handovers: handovers.data,
    documents: documents.data,
  }
}

async function callGemini(apiKey: string, payload: unknown): Promise<{ ok: true; text: string } | { ok: false; detail: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
  )
  if (!res.ok) return { ok: false, detail: await res.text() }
  const data = await res.json()
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? []
  return { ok: true, text: parts.map((p) => p?.text ?? '').join('') }
}

/* ---------- Ảnh gửi từ khung chat ---------- */

interface InImage {
  data: string // base64, không có tiền tố data:
  mime: string
  name: string
  loai: string
}

function sanitizeImages(raw: unknown, max: number): InImage[] {
  if (!Array.isArray(raw)) return []
  const out: InImage[] = []
  for (const x of raw.slice(0, max)) {
    const data = typeof x?.data === 'string' ? x.data.replace(/^data:[^,]*,/, '').replace(/\s+/g, '') : ''
    const mime = String(x?.mime ?? '')
    if (!data || data.length > MAX_IMAGE_BASE64 || !(mime in EXT_BY_MIME) || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) continue
    const name = String(x?.name ?? 'anh').replace(/[^\w.\-() ]+/g, '_').slice(0, 80) || 'anh'
    const loai = (IMAGE_TYPES as readonly string[]).includes(String(x?.loai)) ? String(x.loai) : 'khac'
    out.push({ data, mime, name, loai })
  }
  return out
}

function decodeBase64(data: string): Uint8Array {
  return Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
}

/* Xoá ảnh vừa tải lên nếu phiếu không lưu được. Người dùng thường không có quyền xoá trong kho ảnh,
 * nên dùng quyền hệ thống — chỉ cho đúng những file hàm này vừa tạo. */
async function removeFiles(ctx: any, paths: string[]) {
  if (!paths.length) return
  try {
    await ctx.supabaseAdmin.storage.from(BUCKET).remove(paths)
  } catch (e) {
    console.error('fuel cleanup failed', paths, e)
  }
}

/* ---------- Nhập liệu phiếu dầu (chữ hoặc ảnh) ---------- */

/* Trả về null nếu tin nhắn không phải nhập liệu (để chạy hỏi đáp thường).
 * AI chỉ đọc chữ/ảnh và trích trường; KHÔNG ghi gì vào cơ sở dữ liệu ở bước này. */
async function handleFuelChat(ctx: any, apiKey: string, question: string, body: any): Promise<Response | null> {
  const draftIn = body?.draft
  const pending: { kind: Kind; fields: DraftFields } | null =
    draftIn && (draftIn.kind === 'nhap' || draftIn.kind === 'xuat')
      ? { kind: draftIn.kind, fields: sanitizeFields(draftIn.fields) }
      : null
  const pendingUncertain = sanitizeUncertain(draftIn?.khong_chac)
  const attachedTypes = sanitizeImageTypes(body?.attached_types).slice(0, MAX_IMAGES_PER_SLIP)

  const images = sanitizeImages(body?.images, MAX_IMAGES_PER_MESSAGE)
  if (Array.isArray(body?.images) && body.images.length && !images.length) {
    return Response.json({ error: 'Không đọc được ảnh (định dạng hoặc dung lượng không phù hợp). Bạn chụp lại hoặc chọn ảnh khác nhé.' }, { status: 400 })
  }

  const now = new Date()
  const prompt = buildRouterPrompt({
    today: todayVN(now),
    hhmm: nowHHMM(now),
    pending,
    history: sanitizeHistory(body?.history),
    message: question,
    imageCount: images.length,
  })
  const imageParts = images.map((im) => ({ inlineData: { mimeType: im.mime, data: im.data } }))

  // Lần 1: bắt AI trả JSON đúng cấu trúc. Nếu lỗi, lần 2: chỉ yêu cầu JSON và mô tả cấu trúc ngay trong câu lệnh.
  let r = await callGemini(apiKey, {
    contents: [{ role: 'user', parts: [...imageParts, { text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: ROUTER_SCHEMA },
  })
  let routed = r.ok ? parseRouterOutput(r.text) : null
  if (!routed) {
    console.error('fuel router attempt 1 failed', r.ok ? r.text.slice(0, 300) : r.detail.slice(0, 300))
    r = await callGemini(apiKey, {
      contents: [{ role: 'user', parts: [...imageParts, { text: prompt + ROUTER_JSON_HINT }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    })
    routed = r.ok ? parseRouterOutput(r.text) : null
  }
  if (!routed) {
    console.error('fuel router attempt 2 failed', r.ok ? r.text.slice(0, 300) : r.detail.slice(0, 300))
    // Lệnh nhập phiếu rõ ràng (chữ hoặc ảnh) không được âm thầm chuyển sang hỏi đáp thường
    const isEntryCommand = /\b(nhap|xuat|do|cap|mua)\b.*\b(lit|dau)\b/.test(normText(question))
    if (pending || images.length || isEntryCommand) {
      return Response.json({ error: 'Mình chưa đọc được tin nhắn này (lỗi AI). Bạn thử nhắn lại giúp mình nhé.' }, { status: 502 })
    }
    return null
  }

  if (routed.y_dinh === 'hoi_dap') {
    if (images.length) {
      const seen = routed.mo_ta_anh ? ` (mình thấy: ${routed.mo_ta_anh})` : ''
      return Response.json({
        type: 'answer',
        answer: `Mình chưa nhận ra ảnh này là phiếu, hoá đơn hay cột bơm dầu diesel${seen}. Bạn chụp lại rõ hơn, hoặc nhắn thêm bạn muốn làm gì với ảnh nhé.`,
      })
    }
    return null
  }

  if (routed.y_dinh === 'huy') {
    if (!pending) return null
    return Response.json({ type: 'huy', answer: 'Đã huỷ bản nháp — chưa lưu gì vào hệ thống.' })
  }

  const kind: Kind = routed.y_dinh === 'phieu_nhap' ? 'nhap' : 'xuat'
  const isNewDraft = !(pending && !routed.phieu_moi && pending.kind === kind)
  const base = isNewDraft ? emptyFields() : (pending as { kind: Kind; fields: DraftFields }).fields
  const fields = mergeFields(base, routed.fields)

  // Trường nào người dùng/AI vừa nói lại thì không còn "chưa chắc"; trường cũ chưa được đụng tới thì giữ nguyên cảnh báo
  const touched = Object.entries(routed.fields).filter(([, v]) => v !== null && v !== undefined).map(([k]) => k)
  const carried = isNewDraft ? [] : pendingUncertain.filter((k) => !touched.includes(k))
  const uncertain = [...new Set([...carried, ...routed.khong_chac])]

  const imageTypes = images.map((_, i) => routed.anh[i] ?? 'phieu')
  const allTypes = (isNewDraft ? [] : attachedTypes).concat(imageTypes).slice(0, MAX_IMAGES_PER_SLIP)

  const machines = await loadMachines(ctx.supabase)
  const analysis = await analyzeDraft(ctx.supabase, kind, fields, machines, now, { uncertain, imageTypes: allTypes })

  return Response.json({
    type: 'draft',
    answer: renderSummary(analysis),
    draft: { kind, fields, can_confirm: analysis.can_confirm, khong_chac: uncertain, image_types: imageTypes, new_draft: isNewDraft },
  })
}

/* Bấm "Xác nhận": kiểm tra lại toàn bộ, cất ảnh vào kho, rồi mới ghi phiếu và gắn ảnh. Không gọi AI.
 * Ghi bằng quyền của chính người dùng (ai đăng nhập cũng thêm được; người tạo được ghi tự động). */
async function handleConfirm(ctx: any, body: any): Promise<Response> {
  const draft = body?.draft
  if (!draft || (draft.kind !== 'nhap' && draft.kind !== 'xuat')) {
    return Response.json({ error: 'Không có bản nháp để lưu.' }, { status: 400 })
  }
  const kind: Kind = draft.kind
  const fields = sanitizeFields(draft.fields)

  const rawCount = Array.isArray(body?.images) ? body.images.length : 0
  if (rawCount > MAX_IMAGES_PER_SLIP) {
    return Response.json({ error: `Mỗi phiếu chỉ đính kèm tối đa ${MAX_IMAGES_PER_SLIP} ảnh. Bạn huỷ bản nháp rồi gửi lại với ít ảnh hơn nhé.` }, { status: 400 })
  }
  const images = sanitizeImages(body?.images, MAX_IMAGES_PER_SLIP)
  if (rawCount > images.length) {
    return Response.json({ error: 'Có ảnh không hợp lệ (định dạng hoặc dung lượng) nên mình chưa lưu. Bạn gỡ ảnh đó rồi thử lại nhé.' }, { status: 400 })
  }

  const machines = await loadMachines(ctx.supabase)
  const analysis = await analyzeDraft(ctx.supabase, kind, fields, machines, new Date(), { imageTypes: images.map((i) => i.loai) })
  if (!analysis.can_confirm) {
    return Response.json({ error: 'Phiếu chưa đủ điều kiện để lưu, bạn xem lại bản nháp nhé.', answer: renderSummary(analysis) }, { status: 422 })
  }

  // 1) Cất ảnh vào kho ảnh riêng. Lỗi ở bước này thì chưa lưu gì, không để phiếu thiếu ảnh.
  const [yyyy, mm] = analysis.ngay.split('-')
  const folder = `${kind === 'nhap' ? 'nhap' : 'xuat'}/${yyyy}/${mm}`
  const uploaded: { path: string; loai: string; name: string }[] = []
  for (const im of images) {
    const path = `${folder}/${crypto.randomUUID()}.${EXT_BY_MIME[im.mime]}`
    const { error: upErr } = await ctx.supabase.storage.from(BUCKET).upload(path, decodeBase64(im.data), { contentType: im.mime, upsert: false })
    if (upErr) {
      console.error('fuel upload failed', path, upErr)
      await removeFiles(ctx, uploaded.map((u) => u.path))
      return Response.json({ error: 'Không cất được ảnh vào kho ảnh nên mình chưa lưu phiếu. Bạn thử lại giúp mình nhé.', detail: upErr.message }, { status: 502 })
    }
    uploaded.push({ path, loai: im.loai, name: im.name })
  }

  // 2) Ghi phiếu
  const { table, row } = toInsert(analysis)
  const { data, error } = await ctx.supabase.from(table).insert(row).select('id').single()
  if (error) {
    console.error('fuel insert failed', table, error)
    await removeFiles(ctx, uploaded.map((u) => u.path))
    const msg =
      error.code === '42501'
        ? 'Tài khoản của bạn không có quyền lưu phiếu này.'
        : error.code === '23514'
          ? 'Dữ liệu chưa hợp lệ (số lít phải lớn hơn 0, số đồng hồ lần này không được nhỏ hơn lần trước).'
          : 'Không lưu được phiếu, bạn thử lại giúp mình nhé.'
    return Response.json({ error: msg, detail: error.message }, { status: 400 })
  }

  // 3) Gắn ảnh vào phiếu
  let attached = { ok: 0, failed: 0 }
  if (uploaded.length) {
    const link = kind === 'nhap' ? 'receipt_id' : 'issue_id'
    const rows = uploaded.map((u) => ({ [link]: data.id, loai_anh: u.loai, file_path: u.path, file_name: u.name }))
    const { error: attErr } = await ctx.supabase.from('fuel_attachments').insert(rows)
    if (attErr) {
      console.error('fuel attachment insert failed', attErr)
      await removeFiles(ctx, uploaded.map((u) => u.path))
      attached = { ok: 0, failed: uploaded.length }
    } else {
      attached = { ok: uploaded.length, failed: 0 }
    }
  }

  // 4) Báo ngay kết quả: tiêu hao so với định mức (cảnh báo nếu vượt), tồn kho còn lại. Lỗi ở đây không làm mất việc đã lưu.
  let post: { text: string; canh_bao: string | null } = { text: '', canh_bao: null }
  try {
    post = await buildPostSave(ctx.supabase, kind, data.id, analysis.machine ? analysis.machine.id : null)
  } catch (e) {
    console.error('fuel post-save failed', e)
  }
  const saved = renderSaved(analysis, data.id, attached)
  return Response.json({
    type: 'saved',
    id: data.id,
    attached: attached.ok,
    canh_bao: post.canh_bao,
    answer: post.text ? `${saved}\n\n${post.text}` : saved,
  })
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Chỉ hỗ trợ phương thức POST' }, { status: 405 })
    }

    let body: {
      question?: string
      action?: string
      fuel?: unknown
      draft?: unknown
      history?: unknown
      images?: unknown
      attached_types?: unknown
    }
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Body request không hợp lệ (cần JSON)' }, { status: 400 })
    }

    if (body.action === 'confirm') {
      try {
        return await handleConfirm(ctx, body)
      } catch (e) {
        console.error('fuel confirm error', e)
        return Response.json({ error: 'Có lỗi khi lưu phiếu, bạn thử lại giúp mình nhé.' }, { status: 500 })
      }
    }

    const hasImages = Array.isArray(body.images) && body.images.length > 0
    const question = body.question?.trim() || (hasImages ? 'Đây là ảnh phiếu dầu, bạn đọc giúp mình.' : '')
    if (!question) {
      return Response.json({ error: 'Thiếu câu hỏi (question)' }, { status: 400 })
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return Response.json({ error: 'Server chưa cấu hình GEMINI_API_KEY' }, { status: 500 })
    }

    // Chỉ khung chat bản mới (gửi kèm fuel: 1) mới dùng tính năng nhập phiếu dầu.
    // Câu hỏi thuần tuý (vd "tháng này nhập bao nhiêu lít?") đi thẳng sang trả lời, khỏi tốn thêm 1 lần gọi AI.
    const skipEntryCheck = !body.draft && !hasImages && isPlainQuestion(question)
    if (body.fuel && !skipEntryCheck && (body.draft || hasImages || looksLikeFuelEntry(question))) {
      try {
        const res = await handleFuelChat(ctx, geminiApiKey, question, body)
        if (res) return res
      } catch (e) {
        console.error('fuel chat error', e)
        if (body.draft || hasImages) {
          return Response.json({ error: 'Có lỗi khi xử lý phiếu dầu, bạn thử lại giúp mình nhé.' }, { status: 500 })
        }
      }
    }

    // Câu hỏi về dầu: nạp thêm số liệu dầu đã tính sẵn (chạy song song, lỗi thì bỏ qua phần này)
    const wantFuel = mentionsFuel(question)
    const [context, fuelBlock] = await Promise.all([
      fetchProjectContext(ctx.supabase),
      wantFuel
        ? fetchFuelContext(ctx.supabase).then(buildFuelPromptBlock).catch((e: unknown) => {
            console.error('fuel context failed', e)
            return ''
          })
        : Promise.resolve(''),
    ])

    const prompt = `Bạn là trợ lý AI của dự án xây dựng "Thái Đảo 3". Trả lời câu hỏi của người dùng CHỈ dựa trên dữ liệu JSON dưới đây, bằng tiếng Việt, ngắn gọn, rõ ràng, có số liệu cụ thể khi có thể. Nếu dữ liệu không đủ để trả lời chính xác, hãy nói rõ là chưa có đủ thông tin, đừng bịa số liệu.

DỮ LIỆU DỰ ÁN (JSON):
${JSON.stringify(context)}${fuelBlock}

CÂU HỎI: ${question}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    )

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      return Response.json({ error: 'Lỗi khi gọi Gemini API', detail }, { status: 502 })
    }

    const geminiData = await geminiRes.json()
    const answer =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'Xin lỗi, mình chưa nhận được câu trả lời từ Gemini.'

    return Response.json({ answer })
  }),
}
