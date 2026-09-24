/* Bước 6 của tính năng dầu diesel:
 *  (1) đưa số liệu ĐÃ TÍNH SẴN cho chatbot khi người dùng hỏi về dầu (AI chỉ đọc lại, không tự cộng trừ);
 *  (2) soạn lời nhắn ngay sau khi lưu phiếu: cảnh báo vượt định mức, tồn kho âm.
 * File này không dùng API riêng của Deno/npm để có thể chạy thử bằng Node. */
import { fmt, loadStockNow, normText, todayVN } from './fuel.ts'
import type { Kind } from './fuel.ts'

/* ---------- Nhận biết câu hỏi ---------- */

/* Câu hỏi có liên quan tới dầu/máy thi công không (để quyết định có nạp số liệu dầu vào câu trả lời).
 * "đầu tư", "đầu tiên"... cũng bỏ dấu thành "dau" nên chữ "dầu" chỉ tính khi gõ có dấu, hoặc đi kèm từ khoá khác. */
export function mentionsFuel(text: string): boolean {
  const raw = text.toLowerCase().normalize('NFC')
  if (/(^|[^\p{L}])dầu([^\p{L}]|$)/u.test(raw)) return true
  const t = normText(text)
  return (
    /\b(diesel|nhien lieu|lit|ton kho|dinh muc|tieu hao|cot bom|cay xang|xe bon|dong ho|gio may)\b/.test(t) ||
    /\bphieu (nhap|xuat)\b/.test(t) ||
    /\b(nhap|xuat) kho\b/.test(t) ||
    /\bmay[\s\-_]?\d{1,3}\b/.test(t) ||
    /\bmay (thi cong|nao|dao|ui|lu|xuc)\b/.test(t) ||
    (/\bdau\b/.test(t) && /\b(lit|xuat|nhap|ton|cap|do)\b/.test(t))
  )
}

/* Câu hỏi thuần tuý (hỏi số liệu) chứ không phải báo phiếu: bỏ qua bước phân tích phiếu cho nhanh.
 * Báo phiếu luôn có số lít ("xuất 90 lít..."), câu hỏi thì không. */
export function isPlainQuestion(text: string): boolean {
  const t = normText(text)
  if (/\d[\d.,]*\s?(lit|l)\b/.test(t)) return false
  return /\?|\b(bao nhieu|may nao|the nao|nhu the nao|con bao nhieu|tong|so voi|nhieu nhat|it nhat|bao lau|khi nao|nhu nao|co bao nhieu)\b/.test(t)
}

/* ---------- (1) Số liệu dầu cho câu trả lời ---------- */

function roundDeep(v: any, d = 3): any {
  if (typeof v === 'number') return Math.round(v * 10 ** d) / 10 ** d
  if (Array.isArray(v)) return v.map((x) => roundDeep(x, d))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x, d)]))
  return v
}

/* Lấy các bảng tổng hợp (giới hạn số dòng để câu trả lời không nặng dần khi dữ liệu nhiều lên).
 * Bảng nào lỗi thì bỏ qua bảng đó, không làm hỏng cả câu trả lời. */
export async function fetchFuelContext(supabase: any, now: Date = new Date()) {
  const ok = (r: any) => (r && !r.error && r.data ? r.data : null)
  const [settings, monthly, machines, machMonthly, recMonthly, receipts, issues] = await Promise.all([
    supabase.from('fuel_settings').select('thang_bat_dau,ton_dau_ky,nguong_may,nguong_ton').eq('id', 1).single(),
    supabase.from('fuel_stock_monthly').select('thang,ton_dau_ky,tong_nhap,tong_xuat,ton_cuoi_ly_thuyet,ton_do_thuc_te,chenh_lech_lit,chenh_lech_pct,canh_bao').order('thang', { ascending: false }).limit(24),
    supabase.from('fuel_machine_summary').select('ma_may,ten_may,chu_may,don_vi_do,dang_hoat_dong,so_lan_xuat,tong_lit_xuat,tong_don_vi_chay,tieu_hao_binh_quan,dinh_muc,dinh_muc_tam,chenh_lech_pct,danh_gia').order('ma_may'),
    supabase.from('fuel_machine_monthly').select('thang,ma_may,ten_may,don_vi_do,so_lan_xuat,tong_lit_xuat,tong_don_vi_chay,tieu_hao_binh_quan,dinh_muc,dinh_muc_tam,chenh_lech_pct,danh_gia').order('thang', { ascending: false }).order('ma_may').limit(200),
    supabase.from('fuel_receipts_monthly').select('thang,so_phieu,tong_lit,tong_tien,gia_binh_quan').order('thang', { ascending: false }).limit(24),
    supabase.from('fuel_receipts').select('ngay_nhap,so_phieu,nha_cung_cap,so_lit,don_gia,thanh_tien,bien_so_xe_bon').order('ngay_nhap', { ascending: false }).order('id', { ascending: false }).limit(40),
    supabase.from('fuel_issues_calc').select('ngay_xuat,so_phieu,ma_may,so_lit,so_don_vi_chay,tieu_hao_thuc_te,dinh_muc,dinh_muc_tam,chenh_lech_pct,canh_bao,nguoi_nhan,hang_muc').order('ngay_xuat', { ascending: false }).order('id', { ascending: false }).limit(60),
  ])
  const asc = (rows: any[] | null) => (rows ? rows.slice().reverse() : null)
  return roundDeep({
    hom_nay: todayVN(now),
    cau_hinh: ok(settings),
    ton_kho_theo_thang: asc(ok(monthly)),
    doi_chieu_theo_may: ok(machines),
    tieu_hao_may_theo_thang: asc(ok(machMonthly)),
    nhap_theo_thang: asc(ok(recMonthly)),
    phieu_nhap_gan_day: ok(receipts),
    phieu_xuat_gan_day: ok(issues),
  })
}

/* Đoạn chữ thêm vào câu lệnh gửi AI khi câu hỏi liên quan tới dầu */
export function buildFuelPromptBlock(ctx: any): string {
  const today = ctx && ctx.hom_nay ? ctx.hom_nay : ''
  return `

DỮ LIỆU NHIÊN LIỆU — dầu diesel cho máy thi công (các con số đã được hệ thống TÍNH SẴN, dạng JSON):
${JSON.stringify(ctx)}

QUY TẮC KHI TRẢ LỜI VỀ DẦU:
- Hôm nay là ${today}; "tháng này" là tháng của ngày đó. Dùng NGUYÊN các con số có trong dữ liệu trên; KHÔNG tự cộng, trừ, nhân, chia để tạo ra con số mới. Nếu cần một tổng mà dữ liệu không có sẵn (ví dụ theo tuần, theo hạng mục), hãy nói rõ hệ thống chưa tính sẵn rồi chỉ nêu các số có sẵn.
- ton_kho_theo_thang: mỗi dòng là một tháng (thang = ngày mùng 1 của tháng): ton_dau_ky + tong_nhap − tong_xuat = ton_cuoi_ly_thuyet; ton_do_thuc_te là số đo thực tế trong bồn (nếu có). "Tồn hiện tại" là ton_cuoi_ly_thuyet của tháng mới nhất.
- nhap_theo_thang: so_phieu, tong_lit, tong_tien (đồng), gia_binh_quan (đồng/lít).
- doi_chieu_theo_may (cả kỳ) và tieu_hao_may_theo_thang (từng tháng): tieu_hao_binh_quan tính bằng lít/giờ; riêng máy có don_vi_do = "km" (ô tô) tính bằng lít/100km. chenh_lech_pct là tỷ lệ so với định mức (0,25 = vượt 25%). Nếu danh_gia có chữ "(theo định mức tạm)" thì nhắc rằng định mức đó chưa được xác nhận.
- phieu_nhap_gan_day và phieu_xuat_gan_day chỉ là các phiếu gần nhất, KHÔNG phải toàn bộ.
- Chưa có dữ liệu (mảng rỗng hoặc null) thì nói là chưa có, đừng bịa.`
}

/* ---------- (2) Lời nhắn sau khi lưu phiếu ---------- */

export interface IssueCalc {
  ma_may: string
  ten_may: string
  don_vi_do: string
  so_lit: number
  so_don_vi_chay: number | null
  tieu_hao_thuc_te: number | null
  dinh_muc: number | null
  dinh_muc_tam: boolean
  chenh_lech_pct: number | null
  canh_bao: string | null
  dong_ho_lan_nay: number | null
}

export interface MachineSum {
  danh_gia: string | null
  tieu_hao_binh_quan: number | null
  dinh_muc: number | null
  dinh_muc_tam: boolean
  chenh_lech_pct: number | null
  don_vi_do: string
}

export type PostSaveAlert = 'vuot_dinh_muc' | 'thap_bat_thuong' | 'ton_am' | null

const rateUnit = (dv: string) => (dv === 'km' ? 'lít/100km' : 'lít/giờ')
const pctTxt = (p: number) => `${fmt(Math.abs(p) * 100, 1)}%`

export function formatPostSave(p: {
  kind: Kind
  issue: IssueCalc | null
  machine: MachineSum | null
  nguongMay: number
  stockNow: number | null
}): { text: string; canh_bao: PostSaveAlert } {
  const lines: string[] = []
  let alert: PostSaveAlert = null
  const ng = `${fmt(p.nguongMay * 100, 0)}%`

  if (p.kind === 'xuat' && p.issue) {
    const i = p.issue
    const u = rateUnit(i.don_vi_do)
    const dm = i.dinh_muc !== null && i.dinh_muc !== undefined ? `${fmt(Number(i.dinh_muc))} ${u}${i.dinh_muc_tam ? ' (định mức tạm)' : ''}` : ''
    const th = i.tieu_hao_thuc_te !== null && i.tieu_hao_thuc_te !== undefined ? Number(i.tieu_hao_thuc_te) : null
    const pc = i.chenh_lech_pct !== null && i.chenh_lech_pct !== undefined ? Number(i.chenh_lech_pct) : null
    const who = `${i.ma_may} (${i.ten_may})`

    if (i.canh_bao === 'dong_ho_bat_thuong') {
      lines.push(`⚠️ **Số đồng hồ bất thường:** ${who} có số đồng hồ lần này không lớn hơn lần trước nên chưa tính được tiêu hao. Bạn kiểm tra lại số đồng hồ, cần thì nhờ admin sửa phiếu.`)
    } else if (th === null) {
      lines.push(i.dong_ho_lan_nay === null || i.dong_ho_lan_nay === undefined
        ? `ℹ️ Phiếu này chưa có số đồng hồ nên chưa tính được mức tiêu hao của ${i.ma_may}.`
        : `ℹ️ Chưa tính được mức tiêu hao của ${i.ma_may} lần này (thiếu số đồng hồ lần trước — đây có thể là lần xuất đầu tiên của máy).`)
    } else if (i.canh_bao === 'vuot_dinh_muc' && pc !== null) {
      alert = 'vuot_dinh_muc'
      lines.push(`🚨 **CẢNH BÁO VƯỢT ĐỊNH MỨC:** ${who} lần này tiêu hao **${fmt(th)} ${u}**, định mức ${dm} → vượt **${pctTxt(pc)}** (ngưỡng cảnh báo ${ng}). Theo quy trình cần kiểm tra và giải trình.`)
    } else if (i.canh_bao === 'thap_bat_thuong' && pc !== null) {
      alert = 'thap_bat_thuong'
      lines.push(`⚠️ **Tiêu hao thấp bất thường:** ${who} lần này chỉ ${fmt(th)} ${u}, định mức ${dm} → thấp hơn ${pctTxt(pc)}. Kiểm tra lại số đồng hồ hoặc lượng dầu đã cấp.`)
    } else if (pc !== null) {
      lines.push(`✔️ Tiêu hao ${i.ma_may} lần này: ${fmt(th)} ${u} (định mức ${dm}, ${pc >= 0 ? 'cao hơn' : 'thấp hơn'} ${pctTxt(pc)}) — trong mức cho phép.`)
    } else {
      lines.push(`ℹ️ Tiêu hao ${i.ma_may} lần này: ${fmt(th)} ${u}. Máy chưa có định mức nên chưa đánh giá được.`)
    }

    // Bình quân cả kỳ của máy đang vượt (khác với lần này) thì nhắc thêm
    const m = p.machine
    if (m && m.danh_gia && m.danh_gia.startsWith('Vượt') && i.canh_bao !== 'vuot_dinh_muc' && m.tieu_hao_binh_quan !== null && m.chenh_lech_pct !== null) {
      lines.push(`ℹ️ Lưu ý: bình quân cả kỳ của ${i.ma_may} là ${fmt(Number(m.tieu_hao_binh_quan))} ${u}, đang vượt định mức ${pctTxt(Number(m.chenh_lech_pct))}${m.dinh_muc_tam ? ' (định mức tạm)' : ''}.`)
    }
  }

  if (p.stockNow !== null && p.stockNow !== undefined) {
    if (p.stockNow < 0) {
      if (!alert) alert = 'ton_am'
      lines.push(`🚨 **Tồn kho lý thuyết đang ÂM (${fmt(p.stockNow)} lít):** số dầu đã xuất nhiều hơn số dầu đã ghi nhận nhập. Kiểm tra xem còn phiếu nhập nào chưa ghi.`)
    } else {
      lines.push(`🛢️ Tồn kho lý thuyết hiện còn **${fmt(p.stockNow)} lít**.`)
    }
  }
  return { text: lines.join('\n'), canh_bao: alert }
}

/* Đọc số vừa tính cho phiếu vừa lưu rồi soạn lời nhắn. Lỗi ở đây không được làm hỏng việc lưu phiếu (người gọi tự bắt lỗi). */
export async function buildPostSave(supabase: any, kind: Kind, id: number, machineId: number | null) {
  const [settings, stockNow, issue, machine] = await Promise.all([
    supabase.from('fuel_settings').select('nguong_may').eq('id', 1).single(),
    loadStockNow(supabase),
    kind === 'xuat'
      ? supabase.from('fuel_issues_calc').select('ma_may,ten_may,don_vi_do,so_lit,so_don_vi_chay,tieu_hao_thuc_te,dinh_muc,dinh_muc_tam,chenh_lech_pct,canh_bao,dong_ho_lan_nay').eq('id', id).single()
      : Promise.resolve(null),
    kind === 'xuat' && machineId
      ? supabase.from('fuel_machine_summary').select('danh_gia,tieu_hao_binh_quan,dinh_muc,dinh_muc_tam,chenh_lech_pct,don_vi_do').eq('machine_id', machineId).single()
      : Promise.resolve(null),
  ])
  const nguong = settings && settings.data && settings.data.nguong_may !== undefined ? Number(settings.data.nguong_may) : 0.15
  const asRow = (r: any) => (r && !r.error && r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : null)
  return formatPostSave({
    kind,
    issue: asRow(issue) as IssueCalc | null,
    machine: asRow(machine) as MachineSum | null,
    nguongMay: nguong,
    stockNow,
  })
}
