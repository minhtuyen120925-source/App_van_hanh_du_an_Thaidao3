/* Tab "Nhiên liệu": thống kê xuất – nhập – tồn dầu diesel cho máy thi công.
   Đọc dữ liệu từ Supabase bằng phiên đăng nhập của người dùng (không chứa khoá bí mật nào ở đây).
   Ai đăng nhập cũng xem được; chỉ admin sửa/xoá phiếu, quản lý danh mục máy (đúng phân quyền ở cơ sở dữ liệu). */
(function () {
  'use strict';

  const BUCKET = 'fuel-slips';
  const TYPE_LABEL = { phieu: 'Phiếu', hoa_don: 'Hoá đơn GTGT', cot_bom: 'Cột bơm', bon: 'Bồn', kho: 'Kho', khac: 'Khác' };
  const MAX_SIDE = 1600;
  const MAX_BYTES = 600 * 1024;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n, d = 2) => (n === null || n === undefined || n === '' || isNaN(Number(n)) ? '—' : Number(n).toLocaleString('vi-VN', { maximumFractionDigits: d }));
  const money = (n) => (n === null || n === undefined || isNaN(Number(n)) ? '—' : Math.round(Number(n)).toLocaleString('vi-VN'));
  const pct = (x) => (x === null || x === undefined ? '—' : (x > 0 ? '+' : '') + (Number(x) * 100).toFixed(1).replace('.', ',') + '%');
  const fdate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
  const fmonth = (iso) => (iso ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  const ftime = (t) => (t ? String(t).slice(0, 5) : '');
  const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const unitOf = (m) => (m === 'km' ? 'km' : 'giờ');
  const rateUnit = (m) => (m === 'km' ? 'lít/100km' : 'lít/giờ');

  const S = {
    isAdmin: false, me: null,
    settings: { nguong_may: 0.15, nguong_ton: 0.02 },
    machines: [], receipts: [], issues: [], summary: [], monthly: [], counts: [], attach: [], emails: {},
    chart: null,
  };

  function showStatus(html, isErr) {
    $('status').innerHTML = html ? `<div class="banner${isErr ? ' err' : ''}">${html}</div>` : '';
  }

  /* ---------- Tải dữ liệu ---------- */

  async function loadAll() {
    const res = await Promise.all([
      db.from('fuel_machines').select('*').order('id'),
      db.from('fuel_receipts').select('*').order('ngay_nhap', { ascending: false }).order('id', { ascending: false }),
      db.from('fuel_issues_calc').select('*').order('ngay_xuat', { ascending: false }).order('id', { ascending: false }),
      db.from('fuel_machine_summary').select('*').order('ma_may'),
      db.from('fuel_stock_monthly').select('*').order('thang'),
      db.from('fuel_stock_counts').select('*'),
      db.from('fuel_attachments').select('id,receipt_id,issue_id,loai_anh,file_path,file_name,created_at').order('id'),
      db.from('fuel_settings').select('*').eq('id', 1).single(),
    ]);
    const bad = res.find((r) => r.error && r !== res[7]);
    if (bad) throw new Error(bad.error.message);
    [S.machines, S.receipts, S.issues, S.summary, S.monthly, S.counts, S.attach] = res.slice(0, 7).map((r) => r.data || []);
    if (res[7].data) S.settings = res[7].data;
    if (S.isAdmin) {
      const p = await db.from('profiles').select('id,email');
      S.emails = {};
      (p.data || []).forEach((u) => { S.emails[u.id] = u.email; });
    }
  }

  async function reload() {
    await loadAll();
    renderAll();
  }

  const attachmentsOf = (kind, id) => S.attach.filter((a) => (kind === 'nhap' ? a.receipt_id === id : a.issue_id === id));
  const machineById = (id) => S.machines.find((m) => m.id === id);

  /* ---------- Vẽ giao diện ---------- */

  function renderAll() {
    renderKpis();
    renderChart();
    fillFilters();
    renderReceipts();
    renderIssues();
    renderSummary();
    renderStock();
    renderMachines();
    $('btn-add-machine').hidden = !S.isAdmin;
  }

  function renderKpis() {
    const cur = S.monthly[S.monthly.length - 1];
    const monthKey = cur ? cur.thang.slice(0, 7) : null;
    const tienNhap = S.receipts.filter((r) => monthKey && r.ngay_nhap.startsWith(monthKey)).reduce((s, r) => s + (Number(r.thanh_tien) || 0), 0);
    const soPhieuXuat = S.issues.filter((r) => monthKey && r.ngay_xuat.startsWith(monthKey)).length;
    const canhBao = S.summary.filter((s) => s.danh_gia && (s.danh_gia.startsWith('Vượt') || s.danh_gia.startsWith('Thấp'))).length;
    const dangDung = S.summary.filter((s) => s.dang_hoat_dong).length;
    const lastRec = S.receipts[0];
    const stockWarn = S.monthly.filter((m) => m.canh_bao === true).length;
    const tonNow = cur ? Number(cur.ton_cuoi_ly_thuyet) : null;
    $('kpis').innerHTML = `
      <div class="card kpi b1"><div class="ic">🛢️</div><div class="lbl">Tồn kho hiện tại (lý thuyết)</div><div class="val">${num(tonNow)} lít</div><div class="pct" style="color:${stockWarn ? 'var(--orange)' : 'var(--gray)'}">${stockWarn ? `${stockWarn} tháng lệch số đo thực tế` : 'Tồn đầu + nhập − xuất'}</div></div>
      <div class="card kpi b2"><div class="ic">📥</div><div class="lbl">Nhập tháng ${cur ? fmonth(cur.thang) : ''}</div><div class="val">${num(cur && cur.tong_nhap)} lít</div><div class="pct" style="color:var(--gray)">${money(tienNhap)} đ</div></div>
      <div class="card kpi b3"><div class="ic">📤</div><div class="lbl">Xuất tháng ${cur ? fmonth(cur.thang) : ''}</div><div class="val">${num(cur && cur.tong_xuat)} lít</div><div class="pct" style="color:var(--gray)">${soPhieuXuat} phiếu xuất</div></div>
      <div class="card kpi b5"><div class="ic">⚠️</div><div class="lbl">Máy đang bị cảnh báo</div><div class="val" style="color:${canhBao ? 'var(--red)' : 'var(--navy)'}">${canhBao} / ${dangDung}</div><div class="pct" style="color:var(--gray)">Tiêu hao lệch định mức &gt; ${Math.round((S.settings.nguong_may || 0.15) * 100)}%</div></div>
      <div class="card kpi b4"><div class="ic">💵</div><div class="lbl">Giá nhập gần nhất</div><div class="val">${lastRec && lastRec.don_gia != null ? money(lastRec.don_gia) + ' đ/lít' : '—'}</div><div class="pct" style="color:var(--gray)">${lastRec ? fdate(lastRec.ngay_nhap) : 'Chưa có phiếu nhập'}</div></div>`;
  }

  function renderChart() {
    const note = $('chart-note');
    if (typeof Chart === 'undefined') { note.textContent = 'Không tải được thư viện vẽ biểu đồ (kiểm tra mạng).'; return; }
    const labels = S.monthly.map((m) => fmonth(m.thang));
    const cfg = {
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Nhập (lít)', data: S.monthly.map((m) => Number(m.tong_nhap)), backgroundColor: '#16a34a', borderRadius: 4 },
          { type: 'bar', label: 'Xuất (lít)', data: S.monthly.map((m) => Number(m.tong_xuat)), backgroundColor: '#f59e0b', borderRadius: 4 },
          { type: 'line', label: 'Tồn cuối kỳ lý thuyết (lít)', data: S.monthly.map((m) => Number(m.ton_cuoi_ly_thuyet)), borderColor: '#0f2a4a', backgroundColor: '#0f2a4a', tension: 0.25, pointRadius: 4 },
          { type: 'line', label: 'Tồn đo thực tế (lít)', data: S.monthly.map((m) => (m.ton_do_thuc_te == null ? null : Number(m.ton_do_thuc_te))), showLine: false, pointStyle: 'triangle', pointRadius: 8, backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${num(c.parsed.y)}` } } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'lít' } } },
      },
    };
    if (S.chart) S.chart.destroy();
    S.chart = new Chart($('chart').getContext('2d'), cfg);
    note.textContent = S.monthly.length ? 'Cột xanh = nhập, cột cam = xuất, đường xanh đen = tồn lý thuyết cuối tháng, tam giác tím = số đo thực tế.' : 'Chưa có dữ liệu để vẽ biểu đồ.';
  }

  function fillFilters() {
    const months = [...new Set([...S.receipts.map((r) => r.ngay_nhap.slice(0, 7)), ...S.issues.map((r) => r.ngay_xuat.slice(0, 7))])].sort().reverse();
    const monthOpts = '<option value="">Tất cả tháng</option>' + months.map((m) => `<option value="${m}">${m.slice(5)}/${m.slice(0, 4)}</option>`).join('');
    ['f-in-month', 'f-out-month'].forEach((id) => {
      const el = $(id);
      const keep = el.value;
      el.innerHTML = monthOpts;
      if (months.includes(keep)) el.value = keep;
    });
    const mEl = $('f-out-machine');
    const keepM = mEl.value;
    mEl.innerHTML = '<option value="">Tất cả máy</option>' + S.machines.map((m) => `<option value="${m.id}">${esc(m.ma_may)} — ${esc(m.ten_may)}</option>`).join('');
    if (S.machines.some((m) => String(m.id) === keepM)) mEl.value = keepM;
  }

  const who = (uid) => (uid ? esc(S.emails[uid] || 'tài khoản khác') : '—');

  function renderReceipts() {
    const ym = $('f-in-month').value;
    const rows = S.receipts.filter((r) => !ym || r.ngay_nhap.startsWith(ym));
    const adminCol = S.isAdmin;
    const head = `<thead><tr><th class="l">Ngày</th><th class="l">Số phiếu</th><th class="l">Nhà cung cấp</th><th>Số lít</th><th>Đơn giá (đ/lít)</th><th>Thành tiền (đ)</th><th class="l">Biển số xe bồn</th><th class="l">Người nhận</th><th>Ảnh</th>${adminCol ? '<th class="l">Người nhập</th>' : ''}</tr></thead>`;
    if (!rows.length) { $('tb-in').innerHTML = head + `<tbody><tr><td colspan="${adminCol ? 10 : 9}" class="empty">Chưa có phiếu nhập${ym ? ' trong tháng này' : ''}. Nhập phiếu bằng cách nhắn hoặc chụp ảnh trong khung chat 💬.</td></tr></tbody>`; return; }
    const body = rows.map((r) => `<tr class="clickable" data-act="open-slip" data-kind="nhap" data-id="${r.id}">
      <td class="l">${fdate(r.ngay_nhap)} <span class="small">${esc(ftime(r.gio_nhap))}</span></td><td class="l">${esc(r.so_phieu) || '—'}</td><td class="l">${esc(r.nha_cung_cap) || '—'}</td>
      <td>${num(r.so_lit)}</td><td>${money(r.don_gia)}</td><td>${money(r.thanh_tien)}</td><td class="l">${esc(r.bien_so_xe_bon) || '—'}</td><td class="l">${esc(r.nguoi_nhan) || '—'}</td>
      <td>${attachmentsOf('nhap', r.id).length ? '📎 ' + attachmentsOf('nhap', r.id).length : '—'}</td>${adminCol ? `<td class="l small">${who(r.created_by)}</td>` : ''}</tr>`).join('');
    const tl = rows.reduce((s, r) => s + Number(r.so_lit), 0);
    const tm = rows.reduce((s, r) => s + (Number(r.thanh_tien) || 0), 0);
    $('tb-in').innerHTML = head + `<tbody>${body}</tbody><tfoot><tr><td class="l" colspan="3">Tổng (${rows.length} phiếu)</td><td>${num(tl)}</td><td></td><td>${money(tm)}</td><td colspan="${adminCol ? 4 : 3}"></td></tr></tfoot>`;
  }

  function tagFor(cb) {
    if (cb === 'vuot_dinh_muc') return '<span class="tag t-red">Vượt định mức</span>';
    if (cb === 'thap_bat_thuong') return '<span class="tag t-yel">Thấp bất thường</span>';
    if (cb === 'dong_ho_bat_thuong') return '<span class="tag t-gray">Đồng hồ bất thường</span>';
    if (cb === 'binh_thuong') return '<span class="tag t-grn">Bình thường</span>';
    return '<span class="small">—</span>';
  }

  function renderIssues() {
    const ym = $('f-out-month').value;
    const mid = $('f-out-machine').value;
    const rows = S.issues.filter((r) => (!ym || r.ngay_xuat.startsWith(ym)) && (!mid || String(r.machine_id) === mid));
    const adminCol = S.isAdmin;
    const head = `<thead><tr><th class="l">Ngày</th><th class="l">Máy</th><th>Số lít</th><th>Đồng hồ trước</th><th>Đồng hồ nay</th><th>Đã chạy</th><th>Tiêu hao thực tế</th><th>Định mức</th><th>Lệch</th><th class="l">Đánh giá</th><th class="l">Người nhận</th><th class="l">Hạng mục</th><th>Ảnh</th>${adminCol ? '<th class="l">Người nhập</th>' : ''}</tr></thead>`;
    if (!rows.length) { $('tb-out').innerHTML = head + `<tbody><tr><td colspan="${adminCol ? 14 : 13}" class="empty">Chưa có phiếu xuất${ym || mid ? ' theo bộ lọc này' : ''}.</td></tr></tbody>`; return; }
    const body = rows.map((r) => {
      const u = unitOf(r.don_vi_do);
      const cls = r.canh_bao === 'vuot_dinh_muc' ? 'cell-red' : r.canh_bao === 'thap_bat_thuong' ? 'cell-orange' : '';
      const tam = r.dinh_muc != null && r.dinh_muc_tam ? ' <span class="small">(tạm)</span>' : '';
      return `<tr class="clickable" data-act="open-slip" data-kind="xuat" data-id="${r.id}">
        <td class="l">${fdate(r.ngay_xuat)} <span class="small">${esc(ftime(r.gio_xuat))}</span></td><td class="l">${esc(r.ma_may)} <span class="small">${esc(r.ten_may)}</span></td>
        <td>${num(r.so_lit)}</td><td>${num(r.dong_ho_lan_truoc)}</td><td>${num(r.dong_ho_lan_nay)}</td><td>${r.so_don_vi_chay == null ? '—' : num(r.so_don_vi_chay) + ' ' + u}</td>
        <td>${r.tieu_hao_thuc_te == null ? '—' : num(r.tieu_hao_thuc_te) + ' ' + rateUnit(r.don_vi_do)}</td><td>${r.dinh_muc == null ? '—' : num(r.dinh_muc) + tam}</td>
        <td class="${cls}">${pct(r.chenh_lech_pct)}</td><td class="l">${tagFor(r.canh_bao)}</td><td class="l">${esc(r.nguoi_nhan) || '—'}</td><td class="l wrap">${esc(r.hang_muc) || '—'}</td>
        <td>${attachmentsOf('xuat', r.id).length ? '📎 ' + attachmentsOf('xuat', r.id).length : '—'}</td>${adminCol ? `<td class="l small">${who(r.created_by)}</td>` : ''}</tr>`;
    }).join('');
    const tl = rows.reduce((s, r) => s + Number(r.so_lit), 0);
    $('tb-out').innerHTML = head + `<tbody>${body}</tbody><tfoot><tr><td class="l" colspan="2">Tổng (${rows.length} phiếu)</td><td>${num(tl)}</td><td colspan="${adminCol ? 11 : 10}"></td></tr></tfoot>`;
  }

  function renderSummary() {
    const head = '<thead><tr><th class="l">Mã</th><th class="l">Tên máy</th><th class="l">Chủ máy</th><th>Số lần xuất</th><th>Tổng lít xuất</th><th>Đã chạy (đủ số đồng hồ)</th><th>Tiêu hao bình quân</th><th>Định mức</th><th>Lệch</th><th class="l">Đánh giá</th></tr></thead>';
    if (!S.summary.length) { $('tb-sum').innerHTML = head + '<tbody><tr><td colspan="10" class="empty">Chưa có máy nào trong danh mục.</td></tr></tbody>'; return; }
    const body = S.summary.map((s) => {
      const u = unitOf(s.don_vi_do);
      const dg = s.danh_gia || '';
      const cls = dg.startsWith('Vượt') ? 'cell-red' : dg.startsWith('Thấp') ? 'cell-orange' : '';
      const tag = !dg ? '<span class="small">Chưa đủ dữ liệu</span>' : dg.startsWith('Vượt') ? `<span class="tag t-red">${esc(dg)}</span>` : dg.startsWith('Thấp') ? `<span class="tag t-yel">${esc(dg)}</span>` : `<span class="tag t-grn">${esc(dg)}</span>`;
      const tam = s.dinh_muc != null && s.dinh_muc_tam ? ' <span class="small">(tạm)</span>' : '';
      return `<tr${s.dang_hoat_dong ? '' : ' style="opacity:.55"'}><td class="l"><b>${esc(s.ma_may)}</b></td><td class="l">${esc(s.ten_may)}${s.dang_hoat_dong ? '' : ' <span class="small">(ngừng)</span>'}</td><td class="l">${esc(s.chu_may) || '—'}</td>
        <td>${num(s.so_lan_xuat, 0)}</td><td>${num(s.tong_lit_xuat)}</td><td>${s.tong_don_vi_chay == null ? '—' : num(s.tong_don_vi_chay) + ' ' + u}</td>
        <td>${s.tieu_hao_binh_quan == null ? '—' : num(s.tieu_hao_binh_quan) + ' ' + rateUnit(s.don_vi_do)}</td><td>${s.dinh_muc == null ? '—' : num(s.dinh_muc) + ' ' + rateUnit(s.don_vi_do) + tam}</td>
        <td class="${cls}">${pct(s.chenh_lech_pct)}</td><td class="l">${tag}</td></tr>`;
    }).join('');
    $('tb-sum').innerHTML = head + `<tbody>${body}</tbody>`;
    const tam = S.summary.some((s) => s.dinh_muc != null && s.dinh_muc_tam);
    $('sum-note').textContent = `Tiêu hao bình quân chỉ tính các lần xuất có đủ số đồng hồ trước/nay. Ô đỏ = vượt định mức quá ${Math.round((S.settings.nguong_may || 0.15) * 100)}%.${tam ? ' "(tạm)" = định mức chưa được xác nhận, kết quả chỉ mang tính tham khảo.' : ''}`;
  }

  function renderStock() {
    const head = '<thead><tr><th class="l">Tháng</th><th>Tồn đầu (lít)</th><th>Nhập (lít)</th><th>Xuất (lít)</th><th>Tồn cuối lý thuyết</th><th>Đo thực tế cuối tháng</th><th>Chênh lệch (lít)</th><th>Chênh lệch (%)</th></tr></thead>';
    if (!S.monthly.length) { $('tb-stock').innerHTML = head + '<tbody><tr><td colspan="8" class="empty">Chưa có dữ liệu tồn kho.</td></tr></tbody>'; return; }
    const body = S.monthly.slice().reverse().map((m) => {
      const cnt = S.counts.find((c) => c.thang === m.thang);
      let cell;
      if (cnt) {
        cell = `<b>${num(cnt.ton_do_thuc_te)}</b> ${S.isAdmin ? `<button class="btn ghost sm" data-act="edit-count" data-id="${cnt.id}">Sửa</button>` : ''}`;
      } else {
        cell = `<input class="num-in" type="number" step="any" min="0" id="cnt-${m.thang}" placeholder="lít"> <button class="btn sm" data-act="save-count" data-thang="${m.thang}">Lưu</button>`;
      }
      const cls = m.canh_bao === true ? 'cell-orange' : '';
      return `<tr><td class="l"><b>${fmonth(m.thang)}</b></td><td>${num(m.ton_dau_ky)}</td><td>${num(m.tong_nhap)}</td><td>${num(m.tong_xuat)}</td><td><b>${num(m.ton_cuoi_ly_thuyet)}</b></td><td>${cell}</td><td class="${cls}">${m.chenh_lech_lit == null ? '—' : (m.chenh_lech_lit > 0 ? '+' : '') + num(m.chenh_lech_lit)}</td><td class="${cls}">${pct(m.chenh_lech_pct)}</td></tr>`;
    }).join('');
    $('tb-stock').innerHTML = head + `<tbody>${body}</tbody>`;
  }

  function renderMachines() {
    const admin = S.isAdmin;
    const head = `<thead><tr><th class="l">Mã</th><th class="l">Tên máy</th><th class="l">Loại</th><th class="l">Chủ máy</th><th class="l">Đo bằng</th><th>Định mức</th><th class="l">Trạng thái định mức</th><th class="l">Hoạt động</th><th class="l">Ghi chú</th>${admin ? '<th></th>' : ''}</tr></thead>`;
    if (!S.machines.length) { $('tb-machines').innerHTML = head + `<tbody><tr><td colspan="${admin ? 10 : 9}" class="empty">Chưa có máy nào.</td></tr></tbody>`; return; }
    const body = S.machines.map((m) => {
      const st = m.dinh_muc == null ? '<span class="tag t-gray">Chưa có</span>' : m.dinh_muc_tam ? '<span class="tag t-yel">Tạm — chưa xác nhận</span>' : '<span class="tag t-grn">Đã xác nhận</span>';
      return `<tr><td class="l"><b>${esc(m.ma_may)}</b></td><td class="l">${esc(m.ten_may)}</td><td class="l">${esc(m.loai_may) || '—'}</td><td class="l">${esc(m.chu_may) || '—'}</td><td class="l">${m.don_vi_do === 'km' ? 'Km (ô tô)' : 'Giờ máy'}</td>
        <td>${m.dinh_muc == null ? '—' : num(m.dinh_muc) + ' ' + rateUnit(m.don_vi_do)}</td><td class="l">${st}</td><td class="l">${m.dang_hoat_dong ? '✅' : '⛔ ngừng'}</td><td class="l wrap small">${esc(m.ghi_chu) || ''}</td>
        ${admin ? `<td class="l"><button class="btn ghost sm" data-act="edit-machine" data-id="${m.id}">✏️ Sửa</button> <button class="btn ghost sm" data-act="del-machine" data-id="${m.id}" style="color:var(--red)">🗑️</button></td>` : ''}</tr>`;
    }).join('');
    $('tb-machines').innerHTML = head + `<tbody>${body}</tbody>`;
    $('machines-note').textContent = admin
      ? 'Bạn là admin: có thể thêm/sửa máy. Khi có định mức thật, sửa máy và bỏ dấu chọn "Định mức tạm". Máy đã có phiếu xuất thì không xoá được — hãy bỏ chọn "Đang hoạt động".'
      : 'Chỉ admin mới thêm/sửa được danh mục máy.';
  }

  /* ---------- Cửa sổ chi tiết / biểu mẫu ---------- */

  const modalBack = $('modal-back');
  const modal = $('modal');
  function openModal(html) { modal.innerHTML = html; modalBack.classList.add('open'); modal.scrollTop = 0; }
  function closeModal() { modalBack.classList.remove('open'); modal.innerHTML = ''; }
  function setMsg(text, ok) { const el = $('modal-msg'); if (el) { el.className = 'msg ' + (ok ? 'ok' : 'err'); el.textContent = text || ''; } }

  function friendly(err) {
    const c = err && err.code;
    if (c === '23503') return 'Còn dữ liệu liên quan (ví dụ máy đã có phiếu xuất) nên không xoá được. Với máy, hãy bỏ chọn "Đang hoạt động" thay vì xoá.';
    if (c === '23505') return 'Bị trùng (ví dụ trùng mã máy hoặc đã có số đo của tháng này).';
    if (c === '23514') return 'Dữ liệu chưa hợp lệ (ví dụ số lít phải lớn hơn 0, đồng hồ nay không nhỏ hơn lần trước).';
    if (c === '42501') return 'Tài khoản của bạn không có quyền thực hiện thao tác này.';
    return (err && err.message) || 'Có lỗi xảy ra.';
  }

  /* Chạy 1 lệnh sửa/xoá bằng quyền admin; nếu cơ sở dữ liệu âm thầm bỏ qua (không có quyền) thì báo lỗi */
  async function mutate(query) {
    const { data, error } = await query;
    if (error) return { error: friendly(error) };
    if (Array.isArray(data) && !data.length) return { error: 'Không thực hiện được (không có quyền hoặc không tìm thấy dòng).' };
    return { data };
  }

  function slipKv(kind, r) {
    const items = kind === 'nhap'
      ? [['Ngày giờ nhập', fdate(r.ngay_nhap) + ' ' + ftime(r.gio_nhap)], ['Số phiếu', r.so_phieu], ['Nhà cung cấp', r.nha_cung_cap], ['Số lít', num(r.so_lit)], ['Đơn giá', r.don_gia == null ? '' : money(r.don_gia) + ' đ/lít'], ['Thành tiền', r.thanh_tien == null ? '' : money(r.thanh_tien) + ' đ'], ['Biển số xe bồn', r.bien_so_xe_bon], ['Người giao', r.nguoi_giao], ['Người nhận (thủ kho)', r.nguoi_nhan], ['Ghi chú', r.ghi_chu]]
      : [['Ngày giờ xuất', fdate(r.ngay_xuat) + ' ' + ftime(r.gio_xuat)], ['Máy', r.ma_may + ' — ' + r.ten_may], ['Số phiếu', r.so_phieu], ['Số lít', num(r.so_lit)], ['Đồng hồ trước', r.dong_ho_lan_truoc == null ? '' : num(r.dong_ho_lan_truoc) + ' ' + unitOf(r.don_vi_do)], ['Đồng hồ nay', r.dong_ho_lan_nay == null ? '' : num(r.dong_ho_lan_nay) + ' ' + unitOf(r.don_vi_do)], ['Đã chạy', r.so_don_vi_chay == null ? '' : num(r.so_don_vi_chay) + ' ' + unitOf(r.don_vi_do)], ['Tiêu hao thực tế', r.tieu_hao_thuc_te == null ? '' : num(r.tieu_hao_thuc_te) + ' ' + rateUnit(r.don_vi_do)], ['Định mức', r.dinh_muc == null ? '' : num(r.dinh_muc) + ' ' + rateUnit(r.don_vi_do) + (r.dinh_muc_tam ? ' (tạm)' : '')], ['Lệch định mức', r.chenh_lech_pct == null ? '' : pct(r.chenh_lech_pct)], ['Người nhận (lái máy)', r.nguoi_nhan], ['Hạng mục thi công', r.hang_muc], ['Ghi chú', r.ghi_chu]];
    const extra = [['Nhập qua', { chat: 'Chat (gõ chữ)', anh: 'Chat (ảnh)', web: 'Trên tab' }[r.nguon_nhap] || r.nguon_nhap], ['Nhập lúc', r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '']];
    if (S.isAdmin) extra.push(['Người nhập', S.emails[r.created_by] || (r.created_by ? 'tài khoản khác' : '')]);
    return items.concat(extra).filter(([, v]) => v !== '' && v != null && v !== '—').map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v)}</div>`).join('');
  }

  async function openSlip(kind, id) {
    const rec = (kind === 'nhap' ? S.receipts : S.issues).find((r) => r.id === id);
    if (!rec) return;
    const atts = attachmentsOf(kind, id);
    openModal(`<h3><span>${kind === 'nhap' ? '📥 Phiếu nhập' : '📤 Phiếu xuất'} #${id}</span><button class="x" data-act="close" title="Đóng">✕</button></h3>
      <div class="kv">${slipKv(kind, rec)}</div>
      <b style="font-size:13px;color:var(--navy)">Ảnh đính kèm (${atts.length})</b>
      <div class="photos" id="photos">${atts.length ? '<span class="small">Đang tải ảnh…</span>' : '<span class="small">Chưa có ảnh đính kèm.</span>'}</div>
      ${S.isAdmin ? `<div class="actions" id="admin-actions">
        <button class="btn sm" data-act="edit-slip" data-kind="${kind}" data-id="${id}">✏️ Sửa phiếu</button>
        <select id="add-type" class="num-in" style="width:auto;text-align:left">${Object.keys(TYPE_LABEL).map((k) => `<option value="${k}">${TYPE_LABEL[k]}</option>`).join('')}</select>
        <button class="btn ghost sm" data-act="add-photo">➕ Thêm ảnh</button>
        <input type="file" id="add-file" accept="image/*" multiple hidden data-kind="${kind}" data-id="${id}">
        <button class="btn danger sm" data-act="del-slip" data-kind="${kind}" data-id="${id}" style="margin-left:auto">🗑️ Xoá phiếu</button>
      </div>` : '<p class="note">Chỉ admin mới sửa/xoá phiếu.</p>'}
      <div class="msg" id="modal-msg"></div>`);
    if (atts.length) loadPhotos(atts);
  }

  async function loadPhotos(atts) {
    const box = $('photos');
    const { data, error } = await db.storage.from(BUCKET).createSignedUrls(atts.map((a) => a.file_path), 3600);
    if (!box) return;
    if (error || !data) { box.innerHTML = `<span class="small" style="color:var(--red)">Không tải được ảnh: ${esc(error && error.message)}</span>`; return; }
    box.innerHTML = atts.map((a) => {
      const u = data.find((d) => d.path === a.file_path);
      const src = u && u.signedUrl;
      return `<figure>${src ? `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="${esc(a.file_name)}" loading="lazy"></a>` : '<div class="small">Không mở được ảnh</div>'}
        <figcaption>${esc(TYPE_LABEL[a.loai_anh] || 'Khác')}</figcaption>${S.isAdmin ? `<button class="btn ghost sm rm" data-act="rm-photo" data-id="${a.id}" style="color:var(--red)">Gỡ ảnh</button>` : ''}</figure>`;
    }).join('');
  }

  /* ----- Biểu mẫu sửa (dùng chung cho phiếu nhập, phiếu xuất, máy) ----- */

  const RECEIPT_FIELDS = [
    { k: 'ngay_nhap', l: 'Ngày nhập', t: 'date', req: true }, { k: 'gio_nhap', l: 'Giờ', t: 'time' },
    { k: 'so_phieu', l: 'Số phiếu' }, { k: 'nha_cung_cap', l: 'Nhà cung cấp' },
    { k: 'so_lit', l: 'Số lít', t: 'number', req: true }, { k: 'don_gia', l: 'Đơn giá (đ/lít)', t: 'number' },
    { k: 'bien_so_xe_bon', l: 'Biển số xe bồn' }, { k: 'nguoi_giao', l: 'Người giao' },
    { k: 'nguoi_nhan', l: 'Người nhận (thủ kho)' }, { k: 'ghi_chu', l: 'Ghi chú', wide: true },
  ];
  const issueFields = () => [
    { k: 'ngay_xuat', l: 'Ngày xuất', t: 'date', req: true }, { k: 'gio_xuat', l: 'Giờ', t: 'time' },
    { k: 'machine_id', l: 'Máy', t: 'select', req: true, opts: S.machines.map((m) => [m.id, `${m.ma_may} — ${m.ten_may}`]) },
    { k: 'so_phieu', l: 'Số phiếu' }, { k: 'so_lit', l: 'Số lít', t: 'number', req: true },
    { k: 'dong_ho_lan_truoc', l: 'Đồng hồ lần trước (chỉ điền cho lần đầu của máy)', t: 'number' },
    { k: 'dong_ho_lan_nay', l: 'Đồng hồ lần này', t: 'number' }, { k: 'nguoi_nhan', l: 'Người nhận (lái máy)' },
    { k: 'hang_muc', l: 'Hạng mục thi công' }, { k: 'ghi_chu', l: 'Ghi chú', wide: true },
  ];
  const MACHINE_FIELDS = [
    { k: 'ma_may', l: 'Mã máy (ví dụ MAY-08)', req: true }, { k: 'ten_may', l: 'Tên máy', req: true },
    { k: 'loai_may', l: 'Loại máy' }, { k: 'chu_may', l: 'Chủ máy' },
    { k: 'don_vi_do', l: 'Đồng hồ đo bằng', t: 'select', req: true, opts: [['gio', 'Giờ máy'], ['km', 'Km (ô tô)']] },
    { k: 'dinh_muc', l: 'Định mức (lít/giờ hoặc lít/100km)', t: 'number' },
    { k: 'dinh_muc_tam', l: 'Định mức tạm (chưa xác nhận)', t: 'checkbox' }, { k: 'dang_hoat_dong', l: 'Đang hoạt động', t: 'checkbox' },
    { k: 'ghi_chu', l: 'Ghi chú', wide: true },
  ];

  function formHtml(fields, v) {
    return `<div class="form-grid">${fields.map((f) => {
      const val = v[f.k];
      const id = 'f_' + f.k;
      if (f.t === 'checkbox') return `<label class="chk"><input type="checkbox" id="${id}" ${val ? 'checked' : ''}> ${esc(f.l)}</label>`;
      if (f.t === 'select') return `<label>${esc(f.l)}<select id="${id}">${f.opts.map(([o, t]) => `<option value="${esc(o)}" ${String(val) === String(o) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
      const type = f.t === 'number' ? 'number" step="any' : f.t || 'text';
      const shown = f.t === 'time' && val ? String(val).slice(0, 5) : val == null ? '' : val;
      return `<label class="${f.wide ? 'wide' : ''}">${esc(f.l)}${f.req ? ' *' : ''}<input type="${type}" id="${id}" value="${esc(shown)}"></label>`;
    }).join('')}</div>`;
  }

  function readForm(fields) {
    const out = {};
    for (const f of fields) {
      const el = $('f_' + f.k);
      if (f.t === 'checkbox') out[f.k] = el.checked;
      else if (f.t === 'number') out[f.k] = el.value === '' ? null : Number(el.value);
      else if (f.t === 'select' && f.k === 'machine_id') out[f.k] = Number(el.value);
      else { const s = el.value.trim(); out[f.k] = s === '' ? null : s; }
      if (f.req && (out[f.k] === null || out[f.k] === '' || Number.isNaN(out[f.k]))) return { error: `Cần điền: ${f.l}` };
    }
    return { values: out };
  }

  async function editSlip(kind, id) {
    const table = kind === 'nhap' ? 'fuel_receipts' : 'fuel_issues';
    const { data, error } = await db.from(table).select('*').eq('id', id).single();
    if (error || !data) { setMsg('Không đọc được phiếu: ' + friendly(error), false); return; }
    const fields = kind === 'nhap' ? RECEIPT_FIELDS : issueFields();
    openModal(`<h3><span>✏️ Sửa phiếu ${kind === 'nhap' ? 'nhập' : 'xuất'} #${id}</span><button class="x" data-act="close">✕</button></h3>
      ${formHtml(fields, data)}
      <div class="actions"><button class="btn sm" data-act="save-slip" data-kind="${kind}" data-id="${id}">💾 Lưu</button><button class="btn ghost sm" data-act="open-slip" data-kind="${kind}" data-id="${id}">Huỷ</button></div>
      <div class="msg" id="modal-msg"></div>`);
  }

  async function saveSlip(kind, id) {
    const fields = kind === 'nhap' ? RECEIPT_FIELDS : issueFields();
    const r = readForm(fields);
    if (r.error) { setMsg(r.error, false); return; }
    if (!(r.values.so_lit > 0)) { setMsg('Số lít phải lớn hơn 0.', false); return; }
    setMsg('Đang lưu…', true);
    const res = await mutate(db.from(kind === 'nhap' ? 'fuel_receipts' : 'fuel_issues').update(r.values).eq('id', id).select('id'));
    if (res.error) { setMsg(res.error, false); return; }
    await reload();
    openSlip(kind, id);
  }

  async function deleteSlip(kind, id) {
    const atts = attachmentsOf(kind, id);
    const label = kind === 'nhap' ? 'nhập' : 'xuất';
    if (!confirm(`Xoá phiếu ${label} #${id}${atts.length ? ` và ${atts.length} ảnh đính kèm` : ''}? Không khôi phục được.`)) return;
    setMsg('Đang xoá…', true);
    const res = await mutate(db.from(kind === 'nhap' ? 'fuel_receipts' : 'fuel_issues').delete().eq('id', id).select('id'));
    if (res.error) { setMsg(res.error, false); return; }
    let warn = '';
    if (atts.length) {
      const rm = await db.storage.from(BUCKET).remove(atts.map((a) => a.file_path));
      if (rm.error) warn = 'Phiếu đã xoá nhưng chưa xoá được ảnh trong kho ảnh: ' + rm.error.message;
    }
    closeModal();
    await reload();
    if (warn) alert(warn);
  }

  /* ----- Ảnh đính kèm (admin) ----- */

  async function fileToJpeg(file) {
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {
      src = await new Promise((res, rej) => { const u = URL.createObjectURL(file); const im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); }; im.src = u; });
    }
    const sw = src.naturalWidth || src.width;
    const sh = src.naturalHeight || src.height;
    const k = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * k));
    const h = Math.max(1, Math.round(sh * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.drawImage(src, 0, 0, w, h);
    if (src.close) src.close();
    let q = 0.82, blob;
    do { blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', q)); q -= 0.1; } while (blob && blob.size > MAX_BYTES && q > 0.4);
    if (!blob) throw new Error('encode');
    return { blob, name: ((file.name || 'anh').replace(/\.[^.]+$/, '') || 'anh') + '.jpg' };
  }

  async function addPhotos(kind, id, files) {
    const rec = (kind === 'nhap' ? S.receipts : S.issues).find((r) => r.id === id);
    const date = (kind === 'nhap' ? rec.ngay_nhap : rec.ngay_xuat) || todayVN();
    const [yyyy, mm] = date.split('-');
    const loai = $('add-type').value;
    let ok = 0;
    for (const f of files) {
      setMsg(`Đang tải ảnh ${ok + 1}/${files.length}…`, true);
      try {
        const jp = await fileToJpeg(f);
        const path = `${kind === 'nhap' ? 'nhap' : 'xuat'}/${yyyy}/${mm}/${crypto.randomUUID()}.jpg`;
        const up = await db.storage.from(BUCKET).upload(path, jp.blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw new Error(up.error.message);
        const row = { loai_anh: loai, file_path: path, file_name: jp.name };
        row[kind === 'nhap' ? 'receipt_id' : 'issue_id'] = id;
        const ins = await db.from('fuel_attachments').insert(row).select('id');
        if (ins.error) { await db.storage.from(BUCKET).remove([path]); throw new Error(friendly(ins.error)); }
        ok += 1;
      } catch (e) {
        setMsg(`Không thêm được ảnh "${f.name}": ${e.message}`, false);
        break;
      }
    }
    if (ok) { await reload(); await openSlip(kind, id); setMsg(`Đã thêm ${ok} ảnh.`, true); }
  }

  async function removePhoto(attId) {
    const a = S.attach.find((x) => x.id === attId);
    if (!a || !confirm('Gỡ ảnh này khỏi phiếu? Không khôi phục được.')) return;
    const res = await mutate(db.from('fuel_attachments').delete().eq('id', attId).select('id'));
    if (res.error) { setMsg(res.error, false); return; }
    const rm = await db.storage.from(BUCKET).remove([a.file_path]);
    const kind = a.receipt_id ? 'nhap' : 'xuat';
    const id = a.receipt_id || a.issue_id;
    await reload();
    await openSlip(kind, id);
    setMsg(rm.error ? 'Đã gỡ ảnh khỏi phiếu, nhưng file trong kho ảnh chưa xoá được.' : 'Đã gỡ ảnh.', !rm.error);
  }

  /* ----- Danh mục máy (admin) ----- */

  function openMachine(id) {
    const m = id ? machineById(id) : { don_vi_do: 'gio', dinh_muc_tam: true, dang_hoat_dong: true };
    openModal(`<h3><span>${id ? '✏️ Sửa máy ' + esc(m.ma_may) : '➕ Thêm máy mới'}</span><button class="x" data-act="close">✕</button></h3>
      ${formHtml(MACHINE_FIELDS, m)}
      <div class="actions"><button class="btn sm" data-act="save-machine" data-id="${id || ''}">💾 Lưu</button><button class="btn ghost sm" data-act="close">Huỷ</button></div>
      <div class="msg" id="modal-msg"></div>`);
  }

  async function saveMachine(id) {
    const r = readForm(MACHINE_FIELDS);
    if (r.error) { setMsg(r.error, false); return; }
    const v = r.values;
    if (v.dinh_muc !== null && !(v.dinh_muc > 0)) { setMsg('Định mức phải lớn hơn 0 (hoặc để trống nếu chưa có).', false); return; }
    setMsg('Đang lưu…', true);
    const res = id
      ? await mutate(db.from('fuel_machines').update(v).eq('id', Number(id)).select('id'))
      : await mutate(db.from('fuel_machines').insert(v).select('id'));
    if (res.error) { setMsg(res.error, false); return; }
    closeModal();
    await reload();
  }

  async function deleteMachine(id) {
    const m = machineById(id);
    if (!m || !confirm(`Xoá máy ${m.ma_may} — ${m.ten_may}? Máy đã có phiếu xuất thì không xoá được.`)) return;
    const res = await mutate(db.from('fuel_machines').delete().eq('id', id).select('id'));
    if (res.error) { alert(res.error); return; }
    await reload();
  }

  /* ----- Số đo thực tế cuối tháng ----- */

  async function saveCount(thang) {
    const el = $('cnt-' + thang);
    const v = el && el.value !== '' ? Number(el.value) : NaN;
    if (!(v >= 0)) { alert('Nhập số lít đo thực tế trong bồn (số không âm).'); return; }
    if (!confirm(`Lưu số đo thực tế tháng ${fmonth(thang)}: ${num(v)} lít?\nSau khi lưu chỉ admin mới sửa được.`)) return;
    const { error } = await db.from('fuel_stock_counts').insert({ thang, ngay_do: todayVN(), ton_do_thuc_te: v });
    if (error) { alert(friendly(error)); return; }
    await reload();
  }

  function editCount(id) {
    const c = S.counts.find((x) => x.id === id);
    if (!c) return;
    openModal(`<h3><span>✏️ Số đo thực tế tháng ${fmonth(c.thang)}</span><button class="x" data-act="close">✕</button></h3>
      <div class="form-grid"><label>Số lít đo thực tế *<input type="number" step="any" min="0" id="f_cnt" value="${esc(c.ton_do_thuc_te)}"></label></div>
      <div class="actions"><button class="btn sm" data-act="update-count" data-id="${id}">💾 Lưu</button><button class="btn ghost sm" data-act="close">Huỷ</button>
      <button class="btn danger sm" data-act="del-count" data-id="${id}" style="margin-left:auto">🗑️ Xoá số đo</button></div><div class="msg" id="modal-msg"></div>`);
  }

  async function updateCount(id) {
    const v = Number($('f_cnt').value);
    if (!($('f_cnt').value !== '' && v >= 0)) { setMsg('Nhập số lít không âm.', false); return; }
    const res = await mutate(db.from('fuel_stock_counts').update({ ton_do_thuc_te: v }).eq('id', id).select('id'));
    if (res.error) { setMsg(res.error, false); return; }
    closeModal(); await reload();
  }

  async function deleteCount(id) {
    if (!confirm('Xoá số đo thực tế này?')) return;
    const res = await mutate(db.from('fuel_stock_counts').delete().eq('id', id).select('id'));
    if (res.error) { setMsg(res.error, false); return; }
    closeModal(); await reload();
  }

  /* ---------- Sự kiện ---------- */

  document.addEventListener('click', (e) => {
    if (e.target === modalBack) { closeModal(); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const d = el.dataset;
    const id = d.id ? Number(d.id) : null;
    switch (d.act) {
      case 'close': closeModal(); break;
      case 'open-slip': openSlip(d.kind, id); break;
      case 'edit-slip': editSlip(d.kind, id); break;
      case 'save-slip': saveSlip(d.kind, id); break;
      case 'del-slip': deleteSlip(d.kind, id); break;
      case 'add-photo': $('add-file').click(); break;
      case 'rm-photo': removePhoto(id); break;
      case 'edit-machine': openMachine(id); break;
      case 'del-machine': deleteMachine(id); break;
      case 'save-machine': saveMachine(d.id); break;
      case 'save-count': saveCount(d.thang); break;
      case 'edit-count': editCount(id); break;
      case 'update-count': updateCount(id); break;
      case 'del-count': deleteCount(id); break;
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'add-file') {
      const t = e.target;
      const files = Array.from(t.files || []).filter((f) => f.type.startsWith('image/'));
      const kind = t.dataset.kind; const id = Number(t.dataset.id);
      t.value = '';
      if (files.length) addPhotos(kind, id, files);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  $('btn-add-machine').addEventListener('click', () => openMachine(null));
  $('f-in-month').addEventListener('change', renderReceipts);
  $('f-out-month').addEventListener('change', renderIssues);
  $('f-out-machine').addEventListener('change', renderIssues);

  /* ---------- Khởi động ---------- */

  (async function init() {
    showStatus('Đang tải dữ liệu nhiên liệu…', false);
    const { data: sd } = await db.auth.getSession();
    if (!sd || !sd.session) {
      showStatus('Bạn chưa đăng nhập. <a href="../login.html" target="_top">Bấm vào đây để đăng nhập</a>.', true);
      return;
    }
    S.me = sd.session.user;
    const { data: prof } = await db.from('profiles').select('role').eq('id', S.me.id).single();
    S.isAdmin = !!prof && prof.role === 'admin';
    try {
      await loadAll();
    } catch (e) {
      showStatus('Không tải được dữ liệu nhiên liệu: ' + esc(e.message), true);
      return;
    }
    showStatus('', false);
    $('content').hidden = false;
    renderAll();
  })();
})();
