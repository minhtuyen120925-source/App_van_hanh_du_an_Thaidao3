/* Tải dữ liệu từ Supabase và chuyển về đúng cấu trúc mà dashboard.js đang dùng,
   để không phải sửa lại toàn bộ code render có sẵn. */

const WORK_ITEM_ORDER = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","TB-I","TB-II","VG-1","VG-2","VG-3"];

function fmtDMY(isoDate){
  if (!isoDate) return null;
  const [y,m,d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

window.SB_READY = (async () => {
  const [c, w, p, adj, tl, ho, doc] = await Promise.all([
    db.from('contracts').select('*'),
    db.from('work_items').select('*'),
    db.from('payments').select('*').order('id'),
    db.from('contract_adjustments').select('*').order('id'),
    db.from('timeline').select('*').order('id'),
    db.from('handovers').select('*').order('id'),
    db.from('documents').select('*').order('ngay'),
  ]);

  [c, w, p, adj, tl, ho, doc].forEach(r => { if (r.error) console.error('Supabase load error:', r.error); });

  /* contracts: {TT:{...}, VG:{...}} */
  const contracts = {};
  (c.data || []).forEach(r => {
    contracts[r.id] = {
      ten: r.ten, tenNgan: r.ten_ngan, goi: r.goi_thau, soHD: r.so_hop_dong, ngayKy: r.ngay_ky,
      giaTri: r.gia_tri, nghiemThu: r.nghiem_thu, giaiNgan: r.giai_ngan, tamUng: r.tam_ung,
      tamUngConLai: r.tam_ung_con_lai, mocHT: r.moc_hoan_thanh, mocGoc: r.moc_goc,
      blTHHD: r.bao_lanh_thuc_hien_hd, blTamUng: r.bao_lanh_tam_ung, hanBL: r.han_bao_lanh
    };
  });

  /* hangMuc: mảng theo đúng thứ tự gốc I..XV, TB-I, TB-II, VG-1..3 */
  const hangMuc = (w.data || [])
    .slice()
    .sort((a,b) => WORK_ITEM_ORDER.indexOf(a.id) - WORK_ITEM_ORDER.indexOf(b.id))
    .map(r => ({
      id: r.id, nt: r.contract_id, ten: r.ten, giaTriHD: r.gia_tri_hd, sanLuong: r.san_luong,
      nghiemThu: r.nghiem_thu, slTodo: r.sl_todo, ghiChu: r.ghi_chu || undefined, thanhToan: r.thanh_toan
    }));

  /* thanhToan */
  const thanhToan = (p.data || []).map(r => ({
    hd: r.contract_id, lan: r.lan, ngay: r.ngay, bienBan: r.bien_ban, nghiemThu: r.nghiem_thu,
    giaiNgan: r.giai_ngan, thuHoiTU: r.thu_hoi_tam_ung, traNT: r.tra_nha_thau, baoHanh: r.bao_hanh, todo: r.todo || undefined
  }));

  /* dieuChinhHD */
  const dieuChinhHD = (adj.data || []).map(r => ({
    hd: r.contract_id, noiDung: r.noi_dung, pl: r.phu_luc, ngay: r.ngay, gia: r.gia_tri
  }));

  /* tiendo: cần dựng lại các dòng {grp} phân nhóm */
  const tiendo = [];
  let lastGrp = null;
  (tl.data || []).forEach(r => {
    if (r.nhom !== lastGrp) { tiendo.push({ grp: r.nhom }); lastGrp = r.nhom; }
    tiendo.push({ stt: r.stt, nt: r.contract_id, ten: r.ten, batDau: r.bat_dau, ketThuc: r.ket_thuc });
  });

  /* giaoDien */
  const giaoDien = (ho.data || []).map(r => ({
    ten: r.ten, giao: r.ben_giao, nhan: r.ben_nhan, han: r.han, trangThai: r.trang_thai, ghiChu: r.ghi_chu
  }));

  /* vanBanData */
  const vanBanData = (doc.data || []).map(r => ({
    ngay: fmtDMY(r.ngay), so: r.so_hieu, gd: r.giai_doan, donVi: r.don_vi, ten: r.ten, link: r.link
  }));

  window.SB_DATA = { contracts, hangMuc, thanhToan, dieuChinhHD, tiendo, giaoDien, vanBanData };
})();
