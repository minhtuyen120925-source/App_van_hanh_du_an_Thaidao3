/* Nhập/xuất dầu diesel qua chatbot.
 * AI (Gemini) chỉ ĐỌC CHỮ và trích các trường; việc tìm máy, kiểm tra và lưu do luật cố định ở đây làm.
 * File này không dùng API riêng của Deno/npm để có thể chạy thử bằng Node. */

export type Kind = 'nhap' | 'xuat'

export interface DraftFields {
  ngay: string | null // YYYY-MM-DD
  gio: string | null // HH:MM
  so_phieu: string | null
  so_lit: number | null
  don_gia: number | null
  nha_cung_cap: string | null
  bien_so_xe_bon: string | null
  nguoi_giao: string | null
  nguoi_nhan: string | null // nhập = thủ kho; xuất = lái máy
  may: string | null // nguyên văn cách người dùng gọi máy
  dong_ho_lan_truoc: number | null // chỉ khi người dùng tự nói; nếu không, hệ thống tự lấy
  dong_ho_lan_nay: number | null
  hang_muc: string | null
  ghi_chu: string | null
  thanh_tien_phieu: number | null // thành tiền ghi trên phiếu/cột bơm: chỉ để đối chiếu với lít × đơn giá, không lưu
}

export interface Machine {
  id: number
  ma_may: string
  ten_may: string
  loai_may: string | null
  chu_may: string | null
  don_vi_do: 'gio' | 'km'
  dang_hoat_dong: boolean
}

export type MachineRes =
  | { status: 'empty' }
  | { status: 'none' }
  | { status: 'ok'; machine: Machine }
  | { status: 'ambiguous'; candidates: Machine[] }

export interface Lookups {
  today: string
  machines: Machine[]
  machineRes: MachineRes
  dup: { ngay: string; so_lit: number } | null
  prev: { value: number; ngay: string } | null
  stockNow: number | null
}

export interface Analysis {
  kind: Kind
  fields: DraftFields
  ngay: string
  ngay_la_hom_nay: boolean
  machine: Machine | null
  dong_ho_truoc: number | null
  dong_ho_truoc_nguon: 'nhap_tay' | 'tu_dong' | null
  dong_ho_truoc_ngay: string | null
  so_don_vi_chay: number | null
  thanh_tien: number | null
  missing_required: string[]
  missing_soft: string[]
  errors: string[]
  warnings: string[]
  can_confirm: boolean
  image_types: string[] // loại từng ảnh sẽ đính kèm phiếu này
}

export const IMAGE_TYPES = ['phieu', 'hoa_don', 'cot_bom', 'bon', 'kho', 'khac'] as const
export const IMAGE_TYPE_LABEL: Record<string, string> = {
  phieu: 'Phiếu', hoa_don: 'Hoá đơn', cot_bom: 'Cột bơm', bon: 'Bồn', kho: 'Kho', khac: 'Khác',
}

const FIELD_LABEL: Record<string, string> = {
  ngay: 'ngày', gio: 'giờ', so_phieu: 'số phiếu', so_lit: 'số lít', don_gia: 'đơn giá',
  nha_cung_cap: 'nhà cung cấp', bien_so_xe_bon: 'biển số xe bồn', nguoi_giao: 'người giao',
  nguoi_nhan: 'người nhận', may: 'máy', dong_ho_lan_truoc: 'đồng hồ lần trước',
  dong_ho_lan_nay: 'đồng hồ lần này', hang_muc: 'hạng mục', ghi_chu: 'ghi chú',
  thanh_tien_phieu: 'thành tiền trên phiếu',
}

const TZ = 'Asia/Ho_Chi_Minh'

/* ---------- Ngày giờ, số, chữ ---------- */

export function todayVN(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function nowHHMM(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
}

export function fmt(n: number, maxFrac = 2): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: maxFrac }).format(n)
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso + 'T00:00:00Z') - Date.parse(fromIso + 'T00:00:00Z')) / 86400000)
}

export function normText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase()
}

/* Số kiểu Việt Nam: dấu chấm ngăn hàng nghìn, dấu phẩy là thập phân. "19.500" -> 19500; "1207,5" -> 1207.5 */
export function parseVnNumber(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  if (typeof input !== 'string') return null
  let s = input.trim().replace(/[^\d.,\-]/g, '')
  const neg = s.startsWith('-')
  s = s.replace(/-/g, '')
  if (!s) return null
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  let normalized: string
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ','
    const thou = dec === '.' ? ',' : '.'
    normalized = s.split(thou).join('').replace(dec, '.')
  } else if (hasComma) {
    const parts = s.split(',')
    normalized = parts.length > 2 ? parts.join('') : parts[0] + '.' + parts[1]
  } else if (hasDot) {
    normalized = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s
  } else {
    normalized = s
  }
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return neg ? -n : n
}

function validIsoDate(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(v + 'T00:00:00Z')
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null
  const y = d.getUTCFullYear()
  return y >= 2000 && y <= 2100 ? v : null
}

function validTime(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const m = v.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

export function emptyFields(): DraftFields {
  return {
    ngay: null, gio: null, so_phieu: null, so_lit: null, don_gia: null,
    nha_cung_cap: null, bien_so_xe_bon: null, nguoi_giao: null, nguoi_nhan: null,
    may: null, dong_ho_lan_truoc: null, dong_ho_lan_nay: null, hang_muc: null, ghi_chu: null,
    thanh_tien_phieu: null,
  }
}

/* Danh sách tên trường AI "đọc chưa chắc": chỉ giữ tên trường hợp lệ */
export function sanitizeUncertain(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map((x) => String(x)).filter((x) => x in FIELD_LABEL))]
}

export function sanitizeImageTypes(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => ((IMAGE_TYPES as readonly string[]).includes(String(x)) ? String(x) : 'khac'))
}

const FIELD_KEYS = Object.keys(emptyFields()) as (keyof DraftFields)[]

/* Làm sạch dữ liệu từ bên ngoài (AI hoặc trình duyệt): ép đúng kiểu, bỏ giá trị vô lý */
export function sanitizeFields(input: any): DraftFields {
  const f = emptyFields()
  if (!input || typeof input !== 'object') return f
  const str = (v: unknown, max = 200): string | null => {
    if (v === null || v === undefined) return null
    const s = String(v).replace(/\s+/g, ' ').trim()
    return s ? s.slice(0, max) : null
  }
  const num = (v: unknown, minExclusive: boolean): number | null => {
    const n = parseVnNumber(v)
    if (n === null) return null
    if (minExclusive ? n <= 0 : n < 0) return null
    return n
  }
  f.ngay = validIsoDate(input.ngay)
  f.gio = validTime(input.gio)
  f.so_phieu = str(input.so_phieu, 60)
  f.so_lit = num(input.so_lit, true)
  f.don_gia = num(input.don_gia, false)
  f.nha_cung_cap = str(input.nha_cung_cap)
  f.bien_so_xe_bon = str(input.bien_so_xe_bon, 30)
  f.nguoi_giao = str(input.nguoi_giao)
  f.nguoi_nhan = str(input.nguoi_nhan)
  f.may = str(input.may, 100)
  f.dong_ho_lan_truoc = num(input.dong_ho_lan_truoc, false)
  f.dong_ho_lan_nay = num(input.dong_ho_lan_nay, false)
  f.hang_muc = str(input.hang_muc)
  f.ghi_chu = str(input.ghi_chu, 500)
  f.thanh_tien_phieu = num(input.thanh_tien_phieu, false)
  return f
}

/* Gộp phần người dùng vừa nói thêm vào bản nháp: trường nào có giá trị mới thì ghi đè */
export function mergeFields(base: DraftFields, delta: DraftFields): DraftFields {
  const out: any = { ...base }
  for (const k of FIELD_KEYS) {
    if (delta[k] !== null && delta[k] !== undefined) out[k] = delta[k]
  }
  return out as DraftFields
}

/* ---------- Tìm máy trong danh mục (luật cố định, không nhờ AI đoán) ---------- */

const STOP_WORDS = new Set(['may', 'cho', 'la', 'cua', 'loai', 'so', 'chiec', 'con'])

const words = (s: string): string[] => s.split(/[^a-z0-9]+/).filter(Boolean)
const canonWord = (w: string): string => (/^\d+$/.test(w) ? String(Number(w)) : w)
const compactOf = (s: string): string => normText(s).replace(/[^a-z0-9]/g, '')

export function machineLabel(m: Machine): string {
  return `${m.ma_may} — ${m.ten_may}${m.chu_may ? ` (${m.chu_may})` : ''}`
}

export function resolveMachine(raw: string | null, machines: Machine[]): MachineRes {
  if (!raw || !raw.trim()) return { status: 'empty' }
  const norm = normText(raw)
  const compact = norm.replace(/[^a-z0-9]/g, '')
  if (!compact) return { status: 'none' }

  // 1) đúng mã máy: "MAY-01", "may 01", "may01"
  const byCode = machines.filter((m) => compactOf(m.ma_may) === compact)
  if (byCode.length === 1) return { status: 'ok', machine: byCode[0] }

  // 2) chỉ nói số máy: "1", "01", "máy 1"
  const numOnly = norm.match(/^\s*(?:may[\s\-_]*)?0*(\d{1,3})\s*$/)
  if (numOnly) {
    const n = Number(numOnly[1])
    const hit = machines.filter((m) => {
      const mm = compactOf(m.ma_may).match(/^may0*(\d+)$/)
      return !!mm && Number(mm[1]) === n
    })
    if (hit.length === 1) return { status: 'ok', machine: hit[0] }
    return hit.length > 1 ? { status: 'ambiguous', candidates: hit } : { status: 'none' }
  }

  // 3) theo từ khoá: mọi từ người dùng nói đều phải có trong mã/tên/loại/chủ máy.
  // Hai máy cùng model (vd 2 máy ủi D31) luôn bị coi là nhập nhằng để hỏi lại, tránh ghi nhầm dầu sang máy khác.
  const tokens = words(norm).filter((t) => !STOP_WORDS.has(t))
  if (!tokens.length) return { status: 'none' }
  const cands = machines.filter((m) => {
    const hay = normText(`${m.ma_may} ${m.ten_may} ${m.loai_may ?? ''} ${m.chu_may ?? ''}`)
    const hayWords = new Set(words(hay).map(canonWord))
    return tokens.every((t) => (t.length <= 2 ? hayWords.has(canonWord(t)) : hay.includes(t)))
  })
  if (cands.length === 1) return { status: 'ok', machine: cands[0] }
  return cands.length > 1 ? { status: 'ambiguous', candidates: cands } : { status: 'none' }
}

/* ---------- Kiểm tra bản nháp (phần thuần, không đụng cơ sở dữ liệu) ---------- */

export function analyze(
  kind: Kind,
  fields: DraftFields,
  lk: Lookups,
  extra: { uncertain?: string[]; imageTypes?: string[] } = {},
): Analysis {
  const errors: string[] = []
  const warnings: string[] = []
  const missingReq: string[] = []
  const missingSoft: string[] = []

  const ngay = fields.ngay ?? lk.today
  const machine = kind === 'xuat' && lk.machineRes.status === 'ok' ? lk.machineRes.machine : null
  const unit = machine?.don_vi_do === 'km' ? 'km' : 'giờ'

  if (fields.so_lit === null) missingReq.push('số lít')

  if (kind === 'xuat') {
    const r = lk.machineRes
    if (r.status === 'empty') {
      missingReq.push('máy nhận dầu (mã máy hoặc tên máy)')
    } else if (r.status === 'ambiguous') {
      errors.push(`Có nhiều máy khớp với "${fields.may}": ${r.candidates.map(machineLabel).join('; ')}. Bạn cho mình biết mã máy nào nhé.`)
    } else if (r.status === 'none') {
      const active = lk.machines.filter((m) => m.dang_hoat_dong).map((m) => m.ma_may).join(', ')
      errors.push(`Máy "${fields.may}" chưa có trong danh mục máy nên mình chưa lưu được. Bạn kiểm tra lại mã máy, hoặc nhờ admin thêm máy này vào danh mục. Các máy hiện có: ${active || '(chưa có máy nào)'}.`)
    }
  }

  // Số đồng hồ giờ máy / km
  let truoc: number | null = null
  let nguon: 'nhap_tay' | 'tu_dong' | null = null
  let truocNgay: string | null = null
  let soDonVi: number | null = null
  if (kind === 'xuat') {
    if (fields.dong_ho_lan_truoc !== null) {
      truoc = fields.dong_ho_lan_truoc
      nguon = 'nhap_tay'
    } else if (lk.prev) {
      truoc = lk.prev.value
      nguon = 'tu_dong'
      truocNgay = lk.prev.ngay
    }
    const nay = fields.dong_ho_lan_nay
    if (nay !== null && truoc !== null) {
      if (nay < truoc) {
        if (nguon === 'nhap_tay') {
          errors.push(`Số đồng hồ lần này (${fmt(nay)}) nhỏ hơn số lần trước bạn nhập (${fmt(truoc)}). Bạn kiểm tra lại giúp mình.`)
        } else {
          warnings.push(`Số đồng hồ lần này (${fmt(nay)} ${unit}) nhỏ hơn lần trước (${fmt(truoc)} ${unit}, phiếu xuất ngày ${fmtDate(truocNgay as string)}). Kiểm tra lại số đồng hồ nhé.`)
        }
      } else {
        soDonVi = nay - truoc
        if (soDonVi === 0) warnings.push('Số đồng hồ không đổi so với lần trước nên không tính được mức tiêu hao.')
      }
    }
  }

  // Thông tin nên có (không bắt buộc)
  if (kind === 'nhap') {
    if (fields.don_gia === null) missingSoft.push('đơn giá')
    if (!fields.nha_cung_cap) missingSoft.push('nhà cung cấp')
    if (!fields.so_phieu) missingSoft.push('số phiếu')
    if (!fields.nguoi_nhan) missingSoft.push('người nhận (thủ kho)')
  } else {
    if (machine && fields.dong_ho_lan_nay === null) missingSoft.push(`số đồng hồ lần này (${unit})`)
    if (machine && fields.dong_ho_lan_nay !== null && truoc === null) {
      missingSoft.push(`số đồng hồ lần trước (đây là lần xuất đầu tiên của máy này, cần số khởi điểm để tính tiêu hao)`)
    }
    if (!fields.nguoi_nhan) missingSoft.push('người nhận (lái máy)')
    if (!fields.hang_muc) missingSoft.push('hạng mục thi công')
    if (!fields.so_phieu) missingSoft.push('số phiếu')
  }

  // Cảnh báo (không chặn lưu)
  if (fields.so_phieu && lk.dup) {
    warnings.push(`Số phiếu "${fields.so_phieu}" đã có: phiếu ${kind === 'nhap' ? 'nhập' : 'xuất'} ngày ${fmtDate(lk.dup.ngay)}, ${fmt(lk.dup.so_lit)} lít. Có thể bị nhập trùng, hãy kiểm tra trước khi xác nhận.`)
  }
  if (kind === 'nhap' && fields.don_gia !== null) {
    if (fields.don_gia > 0 && fields.don_gia < 1000) {
      warnings.push(`Đơn giá ${fmt(fields.don_gia)} đ/lít thấp bất thường. Có phải ý bạn là ${fmt(fields.don_gia * 1000)} đ/lít?`)
    } else if (fields.don_gia > 100000) {
      warnings.push(`Đơn giá ${fmt(fields.don_gia)} đ/lít cao bất thường. Kiểm tra lại nhé.`)
    }
  }
  if (fields.so_lit !== null) {
    if (kind === 'nhap' && fields.so_lit > 10000) warnings.push(`Số lít ${fmt(fields.so_lit)} khá lớn cho một lần nhập, kiểm tra lại nhé.`)
    if (kind === 'xuat' && fields.so_lit > 1000) warnings.push(`Số lít ${fmt(fields.so_lit)} khá lớn cho một lần cấp cho máy, kiểm tra lại nhé.`)
  }
  if (ngay > lk.today) {
    warnings.push(`Ngày ${fmtDate(ngay)} nằm ở tương lai.`)
  } else if (daysBetween(ngay, lk.today) > 60) {
    warnings.push(`Ngày ${fmtDate(ngay)} cách hôm nay hơn 60 ngày. Kiểm tra lại ngày/tháng/năm nhé.`)
  }
  if (machine && !machine.dang_hoat_dong) warnings.push(`Máy ${machine.ma_may} đang được đánh dấu là ngừng hoạt động.`)
  if (kind === 'xuat' && fields.so_lit !== null && lk.stockNow !== null && fields.so_lit > lk.stockNow + 1e-9) {
    warnings.push(`Tồn kho lý thuyết hiện chỉ còn khoảng ${fmt(lk.stockNow)} lít, ít hơn số lít xuất (${fmt(fields.so_lit)} lít). Kiểm tra đã ghi đủ phiếu nhập chưa.`)
  }

  // Đối chiếu thành tiền ghi trên phiếu/cột bơm với số lít × đơn giá (bắt lỗi đọc sai chữ số, đặc biệt dấu chấm/phẩy trên cột bơm)
  if (fields.thanh_tien_phieu !== null && fields.so_lit !== null && fields.don_gia !== null) {
    const calc = fields.so_lit * fields.don_gia
    if (Math.abs(calc - fields.thanh_tien_phieu) > Math.max(1000, 0.005 * fields.thanh_tien_phieu)) {
      const implied = fields.don_gia > 0 ? fields.thanh_tien_phieu / fields.don_gia : null
      warnings.push(
        `Thành tiền ghi trên phiếu (${fmt(fields.thanh_tien_phieu, 0)} đ) khác số lít × đơn giá (${fmt(calc, 0)} đ)${implied !== null ? `; theo thành tiền ÷ đơn giá thì số lít khoảng ${fmt(implied)}` : ''}. Kiểm tra lại số lít và đơn giá với ảnh.`,
      )
    }
  }
  // AI tự nhận là đọc chưa chắc: đặt lên đầu để người dùng chú ý
  const unc = (extra.uncertain ?? []).filter((k) => k in FIELD_LABEL)
  if (unc.length) {
    warnings.unshift(`AI đọc chưa chắc: ${unc.map((k) => FIELD_LABEL[k]).join(', ')}. Bạn đối chiếu kỹ các ô này với ảnh trước khi xác nhận.`)
  }

  return {
    kind,
    fields,
    ngay,
    ngay_la_hom_nay: ngay === lk.today,
    machine,
    dong_ho_truoc: truoc,
    dong_ho_truoc_nguon: nguon,
    dong_ho_truoc_ngay: truocNgay,
    so_don_vi_chay: soDonVi,
    thanh_tien: fields.so_lit !== null && fields.don_gia !== null ? fields.so_lit * fields.don_gia : null,
    missing_required: missingReq,
    missing_soft: missingSoft,
    errors,
    warnings,
    can_confirm: missingReq.length === 0 && errors.length === 0,
    image_types: extra.imageTypes ?? [],
  }
}

/* ---------- Nội dung hiển thị cho người dùng ---------- */

export function renderSummary(a: Analysis): string {
  const isNhap = a.kind === 'nhap'
  const f = a.fields
  const title = isNhap ? 'Phiếu NHẬP dầu' : 'Phiếu XUẤT dầu'
  const unit = a.machine?.don_vi_do === 'km' ? 'km' : 'giờ'
  const L: string[] = []

  L.push(a.can_confirm ? `${isNhap ? '📥' : '📤'} **${title}** — chờ bạn xác nhận` : `📝 **Bản nháp ${title}** — chưa đủ để lưu`)
  L.push(`• Ngày ${isNhap ? 'nhập' : 'xuất'}: ${fmtDate(a.ngay)}${a.ngay_la_hom_nay ? ' (hôm nay)' : ''}${f.gio ? ' ' + f.gio : ''}`)

  if (isNhap) {
    L.push(`• Số lít: ${f.so_lit !== null ? fmt(f.so_lit) : '—'}`)
    if (f.don_gia !== null) L.push(`• Đơn giá: ${fmt(f.don_gia)} đ/lít${a.thanh_tien !== null ? ` → Thành tiền: ${fmt(a.thanh_tien, 0)} đ` : ''}`)
    if (f.nha_cung_cap) L.push(`• Nhà cung cấp: ${f.nha_cung_cap}`)
    if (f.so_phieu) L.push(`• Số phiếu: ${f.so_phieu}`)
    if (f.bien_so_xe_bon) L.push(`• Biển số xe bồn: ${f.bien_so_xe_bon}`)
    if (f.nguoi_giao) L.push(`• Người giao: ${f.nguoi_giao}`)
    if (f.nguoi_nhan) L.push(`• Người nhận (thủ kho): ${f.nguoi_nhan}`)
  } else {
    L.push(`• Máy: ${a.machine ? machineLabel(a.machine) : f.may ? `"${f.may}" (chưa xác định)` : '—'}`)
    L.push(`• Số lít: ${f.so_lit !== null ? fmt(f.so_lit) : '—'}`)
    if (a.dong_ho_truoc !== null) {
      const src = a.dong_ho_truoc_nguon === 'tu_dong' ? `tự lấy từ phiếu xuất ngày ${fmtDate(a.dong_ho_truoc_ngay as string)}` : 'bạn nhập'
      L.push(`• Đồng hồ lần trước: ${fmt(a.dong_ho_truoc)} ${unit} (${src})`)
    }
    if (f.dong_ho_lan_nay !== null) {
      L.push(`• Đồng hồ lần này: ${fmt(f.dong_ho_lan_nay)} ${unit}${a.so_don_vi_chay !== null ? ` → đã chạy: ${fmt(a.so_don_vi_chay)} ${unit}` : ''}`)
    }
    if (f.nguoi_nhan) L.push(`• Người nhận (lái máy): ${f.nguoi_nhan}`)
    if (f.hang_muc) L.push(`• Hạng mục thi công: ${f.hang_muc}`)
    if (f.so_phieu) L.push(`• Số phiếu: ${f.so_phieu}`)
  }
  if (f.ghi_chu) L.push(`• Ghi chú: ${f.ghi_chu}`)
  if (a.image_types.length) L.push(`• Ảnh đính kèm: ${a.image_types.length} (${a.image_types.map((t) => IMAGE_TYPE_LABEL[t] ?? 'Khác').join(', ')})`)

  if (a.missing_required.length) L.push('', `❓ Mình cần thêm: ${a.missing_required.join(', ')}. Bạn nhắn giúp mình nhé.`)
  for (const e of a.errors) L.push('', `⛔ ${e}`)
  if (a.missing_soft.length) {
    L.push('', `Chưa có: ${a.missing_soft.join(', ')}.${a.can_confirm ? ' Bạn có thể nhắn thêm để bổ sung, hoặc bấm Xác nhận để lưu như trên.' : ''}`)
  }
  if (a.warnings.length) {
    L.push('')
    for (const w of a.warnings) L.push(`⚠️ ${w}`)
  }
  if (a.can_confirm && !a.missing_soft.length) L.push('', 'Bạn kiểm tra rồi bấm Xác nhận để lưu nhé.')
  return L.join('\n')
}

export function renderSaved(a: Analysis, id: number, att: { ok: number; failed: number } = { ok: 0, failed: 0 }): string {
  const f = a.fields
  const photo =
    (att.ok ? ` Đã đính kèm ${att.ok} ảnh.` : '') +
    (att.failed ? ` ⚠️ ${att.failed} ảnh chưa lưu được, bạn nhờ admin đính kèm lại sau.` : '')
  if (a.kind === 'nhap') {
    const gia = f.don_gia !== null ? `, đơn giá ${fmt(f.don_gia)} đ/lít${a.thanh_tien !== null ? ` (thành tiền ${fmt(a.thanh_tien, 0)} đ)` : ''}` : ''
    return `✅ Đã lưu phiếu NHẬP dầu #${id}: ${fmt(f.so_lit as number)} lít${gia}, ngày ${fmtDate(a.ngay)}${f.nha_cung_cap ? `, từ ${f.nha_cung_cap}` : ''}.${photo}`
  }
  const m = a.machine as Machine
  return `✅ Đã lưu phiếu XUẤT dầu #${id}: ${fmt(f.so_lit as number)} lít cho ${m.ma_may} (${m.ten_may}), ngày ${fmtDate(a.ngay)}.${photo}`
}

/* ---------- Ghi vào cơ sở dữ liệu ---------- */

export function toInsert(a: Analysis): { table: string; row: Record<string, unknown> } {
  const f = a.fields
  if (a.kind === 'nhap') {
    return {
      table: 'fuel_receipts',
      row: {
        ngay_nhap: a.ngay, gio_nhap: f.gio, so_phieu: f.so_phieu, nha_cung_cap: f.nha_cung_cap,
        so_lit: f.so_lit, don_gia: f.don_gia, bien_so_xe_bon: f.bien_so_xe_bon,
        nguoi_giao: f.nguoi_giao, nguoi_nhan: f.nguoi_nhan, ghi_chu: f.ghi_chu, nguon_nhap: a.image_types.length ? 'anh' : 'chat',
      },
    }
  }
  return {
    table: 'fuel_issues',
    row: {
      ngay_xuat: a.ngay, gio_xuat: f.gio, so_phieu: f.so_phieu, machine_id: (a.machine as Machine).id,
      so_lit: f.so_lit,
      dong_ho_lan_truoc: f.dong_ho_lan_truoc, // chỉ có khi người dùng tự nhập (số khởi điểm); còn lại hệ thống tự nối từ lần trước
      dong_ho_lan_nay: f.dong_ho_lan_nay, nguoi_nhan: f.nguoi_nhan, hang_muc: f.hang_muc,
      ghi_chu: f.ghi_chu, nguon_nhap: a.image_types.length ? 'anh' : 'chat',
    },
  }
}

export async function loadMachines(supabase: any): Promise<Machine[]> {
  const { data, error } = await supabase
    .from('fuel_machines')
    .select('id,ma_may,ten_may,loai_may,chu_may,don_vi_do,dang_hoat_dong')
    .order('id')
  if (error) throw new Error(`Không đọc được danh mục máy: ${error.message}`)
  return (data ?? []) as Machine[]
}

async function findDuplicate(supabase: any, kind: Kind, soPhieu: string | null) {
  if (!soPhieu) return null
  const pattern = soPhieu.replace(/[\\%_]/g, (c) => '\\' + c)
  const q =
    kind === 'nhap'
      ? supabase.from('fuel_receipts').select('ngay_nhap,so_lit').ilike('so_phieu', pattern).order('id', { ascending: false }).limit(1)
      : supabase.from('fuel_issues').select('ngay_xuat,so_lit').ilike('so_phieu', pattern).order('id', { ascending: false }).limit(1)
  const { data, error } = await q
  if (error || !data || !data.length) return null
  const row = data[0]
  return { ngay: String(kind === 'nhap' ? row.ngay_nhap : row.ngay_xuat), so_lit: Number(row.so_lit) }
}

async function findPrevReading(supabase: any, machineId: number, ngay: string) {
  const { data, error } = await supabase
    .from('fuel_issues')
    .select('dong_ho_lan_nay,ngay_xuat')
    .eq('machine_id', machineId)
    .not('dong_ho_lan_nay', 'is', null)
    .lte('ngay_xuat', ngay)
    .order('ngay_xuat', { ascending: false })
    .order('gio_xuat', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(1)
  if (error || !data || !data.length) return null
  return { value: Number(data[0].dong_ho_lan_nay), ngay: String(data[0].ngay_xuat) }
}

export async function loadStockNow(supabase: any): Promise<number | null> {
  const { data, error } = await supabase
    .from('fuel_stock_monthly')
    .select('ton_cuoi_ly_thuyet')
    .order('thang', { ascending: false })
    .limit(1)
  if (error || !data || !data.length) return null
  return Number(data[0].ton_cuoi_ly_thuyet)
}

/* Tra cứu dữ liệu cần thiết rồi kiểm tra bản nháp */
export async function analyzeDraft(
  supabase: any,
  kind: Kind,
  fields: DraftFields,
  machines: Machine[],
  now: Date = new Date(),
  extra: { uncertain?: string[]; imageTypes?: string[] } = {},
): Promise<Analysis> {
  const today = todayVN(now)
  const ngay = fields.ngay ?? today
  const machineRes: MachineRes = kind === 'xuat' ? resolveMachine(fields.may, machines) : { status: 'empty' }
  const [dup, prev, stockNow] = await Promise.all([
    findDuplicate(supabase, kind, fields.so_phieu),
    kind === 'xuat' && machineRes.status === 'ok' ? findPrevReading(supabase, machineRes.machine.id, ngay) : Promise.resolve(null),
    kind === 'xuat' ? loadStockNow(supabase) : Promise.resolve(null),
  ])
  return analyze(kind, fields, { today, machines, machineRes, dup, prev, stockNow }, extra)
}

/* ---------- Nhờ AI đọc chữ ---------- */

export function looksLikeFuelEntry(text: string): boolean {
  const t = normText(text)
  return (
    /\b(lit|dau|diesel|dong ho|do dau|cap dau)\b/.test(t) ||
    /\b\d[\d.,]*\s?l\b/.test(t) ||
    /\bphieu (nhap|xuat)\b/.test(t) ||
    /\bmay[\s\-_]?\d{1,3}\b/.test(t)
  )
}

export function sanitizeHistory(h: unknown): { role: 'user' | 'bot'; text: string }[] {
  if (!Array.isArray(h)) return []
  return h
    .slice(-6)
    .map((x: any) => ({ role: x?.role === 'user' ? ('user' as const) : ('bot' as const), text: String(x?.text ?? '').slice(0, 600) }))
    .filter((x) => x.text.trim())
}

const nullableStr = { type: 'STRING', nullable: true }
const nullableNum = { type: 'NUMBER', nullable: true }

export const ROUTER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    y_dinh: { type: 'STRING', enum: ['phieu_nhap', 'phieu_xuat', 'huy', 'hoi_dap'] },
    phieu_moi: { type: 'BOOLEAN' },
    ngay: nullableStr,
    gio: nullableStr,
    so_phieu: nullableStr,
    so_lit: nullableNum,
    don_gia: nullableNum,
    nha_cung_cap: nullableStr,
    bien_so_xe_bon: nullableStr,
    nguoi_giao: nullableStr,
    nguoi_nhan: nullableStr,
    may: nullableStr,
    dong_ho_lan_truoc: nullableNum,
    dong_ho_lan_nay: nullableNum,
    hang_muc: nullableStr,
    ghi_chu: nullableStr,
    thanh_tien_phieu: nullableNum,
    khong_chac: { type: 'ARRAY', items: { type: 'STRING' } },
    anh: { type: 'ARRAY', items: { type: 'STRING', enum: ['phieu', 'hoa_don', 'cot_bom', 'bon', 'kho', 'khac'] } },
    mo_ta_anh: nullableStr,
  },
  required: ['y_dinh', 'phieu_moi'],
}

/* Phần hướng dẫn thêm cho AI khi người dùng gửi ảnh */
function imageInstructions(n: number): string {
  return `
NGƯỜI DÙNG GỬI KÈM ${n} ẢNH (theo thứ tự: ảnh 1, ảnh 2, ...). Hãy ĐỌC chữ và số trên ảnh để điền các trường.
- "anh": mảng loại của TỪNG ảnh theo đúng thứ tự, mỗi phần tử là một trong: "phieu" (phiếu nhập/xuất kho, giấy in hoặc viết tay), "hoa_don" (hoá đơn GTGT), "cot_bom" (màn hình cột bơm xăng dầu), "bon" (ảnh bồn dầu / xe bồn / thùng dầu), "kho" (ảnh kho), "khac".
- Ảnh cột bơm ở cây xăng nghĩa là dầu MUA về kho (phieu_nhap), trừ khi người dùng nói khác. Trên màn hình cột bơm: hàng trên = tổng tiền (đồng), hàng giữa = số LÍT, hàng dưới = ĐƠN GIÁ (đồng/lít). Số lít trên cột bơm dùng dấu chấm làm dấu THẬP PHÂN (ví dụ "300.000" nghĩa là 300 lít, "250.000" nghĩa là 250 lít); hãy chọn cách đọc sao cho số lít × đơn giá ≈ tổng tiền. Đặt tổng tiền vào "thanh_tien_phieu". Nếu ảnh có hai màn hình (hai mặt cột bơm), dùng màn hình nằm phía trên số cột bơm bên trái (thường là màn hình bên trái); nếu không chắc, đưa so_lit và don_gia vào "khong_chac". Loại dầu ghi ở chân cột bơm (ví dụ "DO 0,05S-II") có thể ghi vào ghi_chu.
- Ngày giờ có thể là dấu in ở góc ảnh (ví dụ "29 Th8, 2026 07:47:58" nghĩa là ngày 29 tháng 8 năm 2026, 07:47) hoặc ghi trên phiếu; dùng để điền "ngay" và "gio".
- Hoá đơn GTGT: dùng để bổ sung nhà cung cấp, ngày, số lít; đơn giá và thành tiền ưu tiên theo phiếu/cột bơm; số hoá đơn ghi vào ghi_chu (ví dụ "HĐ GTGT số 0001234").
- Ảnh bồn/kho thường không có số liệu, chỉ cần phân loại; nếu thấy rõ tên nhà cung cấp hoặc biển số xe bồn thì có thể điền.
- Chữ hoặc số nào đọc không rõ / nghi ngờ (chữ viết tay, ảnh mờ, bị che khuất, chói sáng) thì để null, hoặc điền giá trị tốt nhất và LIỆT KÊ tên trường đó vào "khong_chac" (mảng tên trường, ví dụ ["don_gia","so_phieu"]). KHÔNG đoán bừa. Nếu một ảnh có nhiều phiếu, trích phiếu rõ nhất và ghi "Ảnh có nhiều phiếu" vào ghi_chu.
- "mo_ta_anh": một câu ngắn mô tả những gì thấy trong ảnh. Nếu ảnh không liên quan tới dầu diesel (không phải phiếu, hoá đơn, cột bơm, bồn dầu) thì y_dinh = "hoi_dap".
`
}

export function buildRouterPrompt(p: {
  today: string
  hhmm: string
  pending: { kind: Kind; fields: DraftFields } | null
  history: { role: 'user' | 'bot'; text: string }[]
  message: string
  imageCount?: number
}): string {
  const pendingText = p.pending
    ? JSON.stringify({ loai: p.pending.kind === 'nhap' ? 'phieu_nhap' : 'phieu_xuat', ...p.pending.fields })
    : 'không có'
  const hist = p.history.length
    ? p.history.map((h) => `[${h.role === 'user' ? 'Người dùng' : 'Trợ lý'}]: ${h.text}`).join('\n')
    : '(chưa có)'
  return `Bạn là bộ phân tích tin nhắn cho trợ lý AI của dự án xây dựng "Thái Đảo 3". Việc của bạn: xác định người dùng có đang BÁO PHIẾU về DẦU DIESEL cho máy thi công (phiếu nhập kho / phiếu xuất cấp cho máy) hay không, và trích các trường thông tin. Bạn KHÔNG trả lời câu hỏi thay người dùng.

Hôm nay là ${p.today} (năm-tháng-ngày, giờ Việt Nam), bây giờ là ${p.hhmm}.

"y_dinh" (bắt buộc):
- "phieu_nhap": người dùng báo NHẬP dầu vào kho (mua, nhận dầu từ nhà cung cấp/cây xăng).
- "phieu_xuat": người dùng báo XUẤT/cấp/đổ dầu cho một máy thi công.
- "huy": người dùng muốn huỷ/bỏ bản nháp đang chờ (ví dụ "thôi", "huỷ đi", "bỏ phiếu này").
- "hoi_dap": mọi trường hợp còn lại (hỏi số liệu, hỏi hợp đồng/thanh toán/tiến độ, chào hỏi, hỏi về dầu nhưng không phải báo phiếu...).

"phieu_moi" (bắt buộc): true nếu tin nhắn bắt đầu một phiếu MỚI (khác bản nháp đang chờ, hoặc chưa có bản nháp). false nếu chỉ bổ sung / sửa / trả lời câu hỏi lại cho bản nháp đang chờ.

Quy tắc trích:
- Chỉ ghi những gì người dùng nói trong TIN NHẮN HIỆN TẠI. Không bịa. Trường không được nhắc tới thì để null. Không lặp lại trường của bản nháp cũ nếu tin nhắn không nhắc tới.
- Dựa vào tin nhắn gần nhất của Trợ lý để hiểu câu trả lời ngắn (ví dụ Trợ lý vừa hỏi đơn giá, người dùng trả "19.500" thì don_gia = 19500; Trợ lý hỏi máy nào, người dùng trả "01" thì may = "01").
- Số kiểu Việt Nam: dấu chấm ngăn cách hàng nghìn, dấu phẩy là thập phân. "19.500" = 19500; "2.000 lít" = 2000; "1207,5" = 1207.5.
- ngay: dạng YYYY-MM-DD. Quy "hôm nay", "hôm qua", "hôm kia", "22/9" theo ngày hôm nay; thiếu năm thì dùng năm hiện tại. Người dùng không nói ngày thì null.
- gio: dạng HH:MM (24 giờ) hoặc null.
- may: chép NGUYÊN VĂN cách người dùng gọi máy (ví dụ "MAY-01", "máy đào Kobelco"). Không tự đổi sang mã khác.
- so_phieu: số phiếu / số chứng từ nếu có (ví dụ "PN-001", "PX-002").
- so_lit: số lít. don_gia: đồng trên MỖI LÍT (không nhân với số lít).
- nha_cung_cap: tên công ty/cây xăng bán dầu (phiếu nhập). bien_so_xe_bon: biển số xe bồn chở dầu (phiếu nhập). nguoi_giao: người giao dầu (phiếu nhập).
- nguoi_nhan: thủ kho nhận dầu (phiếu nhập) hoặc lái máy / người nhận dầu (phiếu xuất).
- dong_ho_lan_nay: số đồng hồ giờ máy (hoặc km với ô tô) lúc đổ dầu lần này. dong_ho_lan_truoc: số đồng hồ LẦN TRƯỚC, CHỈ điền khi người dùng nói rõ ("lần trước", "khởi điểm", "trước khi đổ").
- hang_muc: hạng mục thi công (ví dụ "san nền khu A"). ghi_chu: thông tin khác đáng ghi chú.
- thanh_tien_phieu: tổng tiền ghi trên phiếu/cột bơm (đồng), chỉ để đối chiếu; không tự tính.
${p.imageCount ? imageInstructions(p.imageCount) : ''}
BẢN NHÁP ĐANG CHỜ (JSON): ${pendingText}

CÁC TIN NHẮN GẦN ĐÂY (cũ đến mới):
${hist}

TIN NHẮN HIỆN TẠI: ${JSON.stringify(p.message)}

Chỉ trả về JSON đúng cấu trúc yêu cầu.`
}

export interface Routed {
  y_dinh: 'phieu_nhap' | 'phieu_xuat' | 'huy' | 'hoi_dap'
  phieu_moi: boolean
  fields: DraftFields
  khong_chac: string[]
  anh: string[]
  mo_ta_anh: string | null
}

export function parseRouterOutput(text: string): Routed | null {
  let j: any
  try {
    j = JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      j = JSON.parse(m[0])
    } catch {
      return null
    }
  }
  if (!j || typeof j !== 'object') return null
  const allowed = ['phieu_nhap', 'phieu_xuat', 'huy', 'hoi_dap']
  return {
    y_dinh: allowed.includes(j.y_dinh) ? j.y_dinh : 'hoi_dap',
    phieu_moi: j.phieu_moi === true,
    fields: sanitizeFields(j),
    khong_chac: sanitizeUncertain(j.khong_chac),
    anh: sanitizeImageTypes(j.anh),
    mo_ta_anh: typeof j.mo_ta_anh === 'string' && j.mo_ta_anh.trim() ? j.mo_ta_anh.trim().slice(0, 300) : null,
  }
}
