/* ================= DỮ LIỆU ================= */
const fmt = n => (n===null||n===undefined) ? '<span class="todo-tag">CẦN CẬP NHẬT</span>' : (Math.round((n||0)/1000)*1000).toLocaleString('vi-VN');
const fmtTy = n => (n===null||n===undefined) ? '—' : (n/1e9).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' tỷ';
const fmtD = s => { if(!s) return '—'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; };
const TODAY = new Date();
const MOC = new Date('2026-10-30');
const KHOICONG = new Date('2025-07-20');

const contracts = window.SB_DATA.contracts;

/* Hạng mục hợp nhất — nt: TT|VG. Số V-Green theo Phụ lục I HĐ 68/2026; sanLuong/nghiemThu VG chưa có hồ sơ */
const hangMuc = window.SB_DATA.hangMuc;

const thanhToan = window.SB_DATA.thanhToan;

const dieuChinhHD = window.SB_DATA.dieuChinhHD;

/* Gantt: TT theo v03 + VG theo v01 */
const tiendo = window.SB_DATA.tiendo;

const giaoDien = window.SB_DATA.giaoDien;

const vanBanData = window.SB_DATA.vanBanData;

const missingDocs = [
  ["Phụ lục gia hạn tiến độ HĐ 1507 (mốc 31/08 → 30/10/2026)", "Rủi ro cao — ảnh hưởng quyền phạt chậm tiến độ và hiệu lực bảo lãnh"],
  ["Giấy phép môi trường / xác nhận hoàn thành công trình BVMT trước vận hành trạm XLNT", "Bắt buộc trước khi V-Green vận hành thử nghiệm xả thải (Luật BVMT 2020, NĐ 08/2022)"],
  ["Giấy phép xả thải / đấu nối điểm xả sau xử lý", "Xác nhận với cơ quan quản lý trước 02/10/2026"],
  ["Bảo lãnh thực hiện HĐ + bảo lãnh tạm ứng của cả 2 nhà thầu (bản còn hiệu lực)", "Chú chưa thấy trong hồ sơ — cần Sếp bổ sung để theo dõi hạn hiệu lực"],
  ["Thỏa thuận đấu nối cấp điện, cấp nước với đơn vị quản lý vận hành", "Phục vụ nghiệm thu đưa vào sử dụng"],
  ["Văn bản nghiệm thu PCCC hoàn thành trước khi đưa công trình vào sử dụng", "CA PCCC Tỉnh"]
];

/* ================= TIỆN ÍCH ================= */
function pctTime(bd,kt){const s=new Date(bd),e=new Date(kt);if(TODAY<s)return 0;if(TODAY>e)return 100;return Math.round((TODAY-s)/(e-s)*100);}
const pct = (a,b)=> b? (a/b*100) : 0;

document.getElementById('hd-sub').textContent = "Chủ đầu tư: Công ty CP Đầu tư và Phát triển Bắc Hà";
document.getElementById('hd-today').textContent = TODAY.toLocaleDateString('vi-VN');

/* ================= TAB 1 ================= */
const TONG = contracts.TT.giaTri + contracts.VG.giaTri;
const NT_DA = contracts.TT.nghiemThu + (contracts.VG.nghiemThu||0);
const GN_DA = contracts.TT.giaiNgan + (contracts.VG.giaiNgan||0);
document.getElementById('k-tong').textContent = fmtTy(TONG);
document.getElementById('k-nt').textContent = fmtTy(NT_DA);
document.getElementById('k-nt-p').textContent = pct(NT_DA,TONG).toFixed(1)+'% tổng 2 HĐ (V-Green tạm = 0)';
document.getElementById('k-gn').textContent = fmtTy(GN_DA);
document.getElementById('k-gn-p').textContent = pct(GN_DA,TONG).toFixed(1)+'% (gồm tạm ứng)';
document.getElementById('k-tu').textContent = fmtTy(contracts.TT.tamUngConLai);
const daysLeft = Math.ceil((MOC-TODAY)/86400000);
document.getElementById('k-days').textContent = daysLeft+' ngày';
const pTimeAll = pctTime('2025-07-20','2026-10-30');
document.getElementById('k-time-p').textContent = pTimeAll+'% thời gian đã trôi qua';

document.getElementById('nt-tb').innerHTML = Object.values(contracts).map(c=>{
  const pnt=c.nghiemThu!=null?pct(c.nghiemThu,c.giaTri):null;
  const pgn=c.giaiNgan!=null?pct(c.giaiNgan,c.giaTri):null;
  const pt=pctTime(c===contracts.TT?'2025-07-20':'2026-05-05', c.mocHT);
  const cham = pnt!=null && (pt-pnt)>20;
  return `<tr>
    <td><b class="${c===contracts.TT?'ntTT':'ntVG'}">${c.tenNgan}</b></td>
    <td style="text-align:left">${c.goi}<br><span class="note" style="margin:0">${c.soHD}</span></td>
    <td>${fmt(c.giaTri)}</td>
    <td class="${c.nghiemThu==null?'todo':''}">${fmt(c.nghiemThu)}</td>
    <td>${pnt!=null?pnt.toFixed(1)+'%':'—'}</td>
    <td class="${c.giaiNgan==null?'todo':''}">${fmt(c.giaiNgan)}</td>
    <td>${pgn!=null?pgn.toFixed(1)+'%':'—'}</td>
    <td>${fmtD(c.mocHT)}${c.mocHT!==c.mocGoc?'<br><span class="tag t-yel">chưa ký PL gia hạn</span>':''}</td>
    <td>${c.nghiemThu==null?'<span class="tag t-gray">Chưa có số liệu</span>':(cham?'<span class="tag t-red">🔴 Chậm tài chính</span>':'<span class="tag t-yel">🟡 Theo dõi</span>')}</td>
  </tr>`;
}).join('');
document.getElementById('nt-tf').innerHTML = `<tr style="font-weight:800;background:var(--sky)">
  <td>TỔNG</td><td style="text-align:left">Toàn dự án (xây lắp)</td><td>${fmt(TONG)}</td>
  <td>${fmt(NT_DA)}</td><td>${pct(NT_DA,TONG).toFixed(1)}%</td>
  <td>${fmt(GN_DA)}</td><td>${pct(GN_DA,TONG).toFixed(1)}%</td><td>30/10/2026</td><td></td></tr>`;

const alerts = [
  ['red','🔴','Tiến độ tài chính Trọng Tín chậm sâu so với thời gian',
   `Nghiệm thu mới đạt ${pct(contracts.TT.nghiemThu,contracts.TT.giaTri).toFixed(1)}% trong khi thời gian đã trôi ${pTimeAll}%. 10/15 hạng mục chưa có khối lượng nghiệm thu. Còn ${daysLeft} ngày đến mốc 30/10/2026.`],
  ['red','🏦','Tạm ứng Trọng Tín còn treo 20,11 tỷ đồng',
   'Qua 2 kỳ thanh toán mới thu hồi 0,89 tỷ (4,2%). Cần đẩy tỷ lệ thu hồi theo từng kỳ, đối chiếu bảo lãnh tạm ứng còn hiệu lực.'],
  ['orange','📋','Chưa có phụ lục gia hạn HĐ Trọng Tín cho mốc 30/10/2026',
   'Mốc mới đang chỉ là kế hoạch nội bộ (tiến độ v03). Không ký phụ lục = rủi ro pháp lý khi xử lý phạt chậm tiến độ.'],
  ['orange','⚡','Xung đột tiến độ cấp điện cho trạm XLNT',
   'V-Green cần điện chạy thử từ 03/09/2026 nhưng kế hoạch đóng điện TBA của Trọng Tín là 20/09/2026. Cần phương án cấp điện tạm hoặc đẩy sớm đóng điện.'],
  ['blue','📄','Chưa có số liệu nghiệm thu / thanh toán V-Green',
   'HĐ ký 15/04/2026, khởi công 05/05/2026 — theo kế hoạch phần bể xử lý đã xong 02/07/2026 nhưng chưa thấy hồ sơ nghiệm thu/tạm ứng nào. Sếp bổ sung để theo dõi.']
];
document.getElementById('alerts').innerHTML = alerts.map(a=>
  `<div class="alert ${a[0]}"><div class="ai">${a[1]}</div><div><b>${a[2]}</b>${a[3]}</div></div>`).join('');

const decisions = [
  ['1','Ký phụ lục gia hạn HĐ 1507 (kèm gia hạn bảo lãnh) hay giữ mốc 31/08 để bảo lưu quyền phạt?','Trước 31/07/2026'],
  ['2','Duyệt phương án cấp điện tạm cho trạm XLNT chạy thử (máy phát / kéo sớm tuyến 22kV)','Trước 15/08/2026'],
  ['3','Chốt cơ chế thu hồi tạm ứng Trọng Tín các kỳ tới (kiến nghị nâng tỷ lệ thu hồi)','Kỳ thanh toán lần 3'],
  ['4','Yêu cầu V-Green nộp hồ sơ nghiệm thu giai đoạn bể xử lý + kế hoạch thanh toán','Ngay trong tháng 7/2026']
];
document.getElementById('decisions').innerHTML = '<table><thead><tr><th>#</th><th style="text-align:left">Nội dung</th><th>Hạn</th></tr></thead><tbody>'+
  decisions.map(d=>`<tr><td>${d[0]}</td><td style="text-align:left">${d[1]}</td><td>${d[2]}</td></tr>`).join('')+'</tbody></table>';

const pNT_all = pct(NT_DA,TONG);
document.getElementById('pb1').style.width=Math.max(pNT_all,3)+'%';
document.getElementById('pb1').textContent=pNT_all.toFixed(1)+'%';
document.getElementById('pb1v').textContent=pNT_all.toFixed(1)+'%';
document.getElementById('pb2').style.width=pTimeAll+'%';
document.getElementById('pb2').textContent=pTimeAll+'%';
document.getElementById('pb2v').textContent=pTimeAll+'%';

/* ================= TAB 2: GANTT ================= */
(function(){
  const start=new Date('2025-07-01'), end=new Date('2026-11-30');
  const months=[]; let d=new Date(start);
  while(d<=end){months.push(new Date(d)); d.setMonth(d.getMonth()+1);}
  const span=end-start;
  let html='<table class="gtable"><tr><th class="gname">Hạng mục</th>';
  months.forEach(m=>html+=`<th class="gmonth" colspan="1">${(m.getMonth()+1)}/${String(m.getFullYear()).slice(2)}</th>`);
  html+='</tr>';
  tiendo.forEach(t=>{
    if(t.grp){ html+=`<tr><td class="gname ghead" colspan="${months.length+1}">${t.grp}</td></tr>`; return; }
    html+=`<tr><td class="gname">${t.stt} · ${t.ten}</td><td class="gcell" colspan="${months.length}" style="position:relative">`;
    const s=new Date(t.batDau), e=new Date(t.ketThuc);
    const l=Math.max(0,(s-start)/span*100), w=Math.max(0.5,(e-s)/span*100);
    const p=pctTime(t.batDau,t.ketThuc);
    html+=`<div class="gbar ${t.nt==='VG'?'vg':''}" style="left:${l}%;width:${w}%"><div class="done" style="width:${p}%"></div></div>`;
    const td=(TODAY-start)/span*100;
    if(td>0&&td<100) html+=`<div class="gtoday" style="left:${td}%"></div>`;
    const md=(MOC-start)/span*100;
    html+=`<div class="gmilestone" style="left:${md}%"></div>`;
    html+='</td></tr>';
  });
  html+='</table>';
  document.getElementById('gantt').innerHTML=html;
})();

document.getElementById('gd-tb').innerHTML = giaoDien.map((g,i)=>{
  const tag = g.trangThai==='done' ? '<span class="tag t-grn">✅ Đã xong</span>'
    : g.trangThai==='risk' ? '<span class="tag t-red">🔴 Rủi ro cao</span>' : '<span class="tag t-yel">🟡 Theo dõi</span>';
  return `<tr><td>${i+1}</td><td style="text-align:left">${g.ten}<br><span class="note" style="margin:0">${g.ghiChu}</span></td>
    <td style="text-align:left">${g.giao}</td><td>${g.nhan}</td><td>${g.han}</td><td>${tag}</td></tr>`;
}).join('');

document.getElementById('g-tb').innerHTML = tiendo.filter(t=>!t.grp).map(t=>{
  const p=pctTime(t.batDau,t.ketThuc);
  const days=Math.round((new Date(t.ketThuc)-new Date(t.batDau))/86400000);
  const st = p<=0?'<span class="tag t-gray">Chưa bắt đầu</span>':p>=100?'<span class="tag t-blue">Hết thời gian KH</span>':'<span class="tag t-yel">Đang trong kỳ</span>';
  return `<tr><td>${t.stt}</td><td style="text-align:left">${t.ten}</td>
    <td><b class="${t.nt==='VG'?'ntVG':'ntTT'}">${t.nt==='VG'?'V-Green':'Trọng Tín'}</b></td>
    <td>${fmtD(t.batDau)}</td><td>${fmtD(t.ketThuc)}</td><td>${days}</td><td>${p}%</td><td>${st}</td></tr>`;
}).join('');

/* ================= TAB 3 ================= */
const hmTenNgan = { "I":"Giao thông","II":"Cấp nước","III":"PCCC","IV":"San nền","V":"TNM","VI":"TNT","VII":"Rãnh KT","VIII":"Cống ngang","IX":"Khuôn viên","X":"Trung áp 22kV","XI":"TBA","XII":"Điện hạ thế","XIII":"Chiếu sáng","XIV":"Tháo dỡ ĐD","XV":"TTLL","TB-I":"TB trung áp","TB-II":"TB trạm BA","VG-1":"XLNT xây dựng","VG-2":"XLNT thiết bị","VG-3":"XLNT lắp đặt" };
let chKL=null;
const pluginGiaTri = { id:'giaTriCot', afterDatasetsDraw(chart){
  if(!document.getElementById('f-showval').checked) return;
  const {ctx}=chart;
  const _fhm=getFHM(); const big=_fhm.tong||( _fhm.ids.length>0 && _fhm.ids.length<=3);
  const fVal=big?'700 13px "Segoe UI",Arial':'700 10px "Segoe UI",Arial';
  const fPct=big?'700 12px "Segoe UI",Arial':'700 9px "Segoe UI",Arial';
  ctx.save(); ctx.font=fVal; ctx.fillStyle='#1e293b'; ctx.textAlign='center';
  chart.data.datasets.forEach((ds,i)=>{
    const meta=chart.getDatasetMeta(i); if(meta.hidden) return;
    meta.data.forEach((bar,j)=>{
      const v=ds.data[j]; if(!v) return;
      ctx.fillStyle='#1e293b'; ctx.font=fVal;
      ctx.fillText(v.toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2}), bar.x, bar.y-4);
      if(i>0){ /* % so với giá trị HĐ của hạng mục (cột dataset 0) */
        const base=chart.data.datasets[0].data[j];
        if(base){
          const yMid=(bar.y+bar.base)/2;
          ctx.save(); ctx.translate(bar.x, yMid); ctx.rotate(-Math.PI/2);
          ctx.fillStyle='#ffffff'; ctx.font=fPct;
          ctx.fillText(Math.round(v/base*100)+'%', 0, big?4:3);
          ctx.restore();
        }
      }
    });
  });
  ctx.restore();
}};
(function initFHM(){
  const s=document.getElementById('fhm-list');
  s.innerHTML = hangMuc.map(h=>`<label style="display:block;margin:3px 0"><input type="checkbox" class="fhm-cb" value="${h.id}" onchange="renderKL()"> ${h.id} · ${h.ten}</label>`).join('');
  document.addEventListener('click',e=>{
    const p=document.getElementById('f-hm-panel'), b=document.getElementById('f-hm-btn');
    if(!p.hidden && !p.contains(e.target) && e.target!==b) p.hidden=true;
  });
})();
function getFHM(){
  const tong=document.getElementById('fhm-tong').checked;
  const ids=[...document.querySelectorAll('.fhm-cb:checked')].map(c=>c.value);
  const b=document.getElementById('f-hm-btn');
  b.textContent = tong?'Tổng tất cả ▾':(ids.length?ids.join(', ')+' ▾':'Tất cả ▾');
  return {tong, ids};
}
function renderKL(){
  const f=document.getElementById('f-nt').value;
  updateKPIg(f);
  const fhm=getFHM();
  const rows=hangMuc.filter(h=>(!f||h.nt===f)&&(fhm.tong||!fhm.ids.length||fhm.ids.includes(h.id)));
  document.getElementById('kl-tb').innerHTML = rows.map(h=>{
    const psl=h.sanLuong!=null?pct(h.sanLuong,h.giaTriHD):null;
    const pnt=h.nghiemThu!=null?pct(h.nghiemThu,h.giaTriHD):null;
    const chenh=(h.sanLuong!=null&&h.nghiemThu!=null)?h.sanLuong-h.nghiemThu:null;
    const dg = h.sanLuong==null?'<span class="tag t-gray">Chưa có số liệu</span>'
      : pnt===0?'<span class="tag t-red">Chưa nghiệm thu</span>'
      : pnt<50?'<span class="tag t-yel">Đang thực hiện</span>':'<span class="tag t-grn">Khá</span>';
    return `<tr class="${h.slTodo&&h.sanLuong==null?'todo':''}">
      <td>${h.id}</td><td style="text-align:left">${h.ten}${h.slTodo?'<span class="todo-tag">TẠM TÍNH</span>':''}${h.ghiChu?'<br><span class="note" style="margin:0">'+h.ghiChu+'</span>':''}</td>
      <td style="white-space:nowrap"><b class="${h.nt==='VG'?'ntVG':'ntTT'}">${h.nt==='VG'?'V-Green':'Trọng Tín'}</b></td>
      <td>${fmt(h.giaTriHD)}</td><td>${fmt(h.sanLuong)}</td>
      <td>${fmt(h.nghiemThu)}</td><td>${h.thanhToan!=null?fmt(h.thanhToan):'—'}</td>
      <td>${chenh!=null?chenh.toLocaleString('vi-VN'):'—'}</td></tr>`;
  }).join('');
  const tHD=rows.reduce((s,h)=>s+h.giaTriHD,0);
  const tSL=rows.reduce((s,h)=>s+(h.sanLuong||0),0);
  const tNT=rows.reduce((s,h)=>s+(h.nghiemThu||0),0);
  const tTT=rows.reduce((s,h)=>s+(h.thanhToan||0),0);
  document.getElementById('kl-tf').innerHTML=`<tr style="font-weight:800;background:var(--sky)">
    <td colspan="3">TỔNG</td><td>${fmt(tHD)}</td><td>${fmt(tSL)}</td>
    <td>${fmt(tNT)}</td><td>${fmt(tTT)}</td><td>${(Math.round((tSL-tNT)/1000)*1000).toLocaleString('vi-VN')}</td></tr>`;
  let crows=[...rows].sort((a,b)=>(a.nt==='VG')-(b.nt==='VG') || a.giaTriHD-b.giaTriHD);
  if(fhm.tong){ crows=[{ id:'TỔNG', giaTriHD:rows.reduce((s,h)=>s+h.giaTriHD,0), sanLuong:rows.reduce((s,h)=>s+(h.sanLuong||0),0), nghiemThu:rows.reduce((s,h)=>s+(h.nghiemThu||0),0), thanhToan:rows.reduce((s,h)=>s+(h.thanhToan||0),0) }]; }
  if(chKL) chKL.destroy();
  chKL=new Chart(document.getElementById('barKL'),{
    type:'bar',
    plugins:[pluginGiaTri],
    data:{labels:crows.map(h=>h.id==='TỔNG'?'TỔNG TẤT CẢ HẠNG MỤC':(hmTenNgan[h.id]||h.id)),
      datasets:[
        {label:'Giá trị HĐ theo hạng mục',data:crows.map(h=>h.giaTriHD/1e9),backgroundColor:'rgba(30,99,179,.85)'},
        {label:'Sản lượng thi công',data:crows.map(h=>(h.sanLuong||0)/1e9),backgroundColor:'rgba(124,58,237,.7)'},
        {label:'Nghiệm thu',data:crows.map(h=>(h.nghiemThu||0)/1e9),backgroundColor:'rgba(22,163,74,.8)'},
        {label:'Thanh toán luỹ kế',data:crows.map(h=>(h.thanhToan||0)/1e9),backgroundColor:'rgba(245,158,11,.85)'}
      ]},
    options:{responsive:true,maintainAspectRatio:false,
            scales:{y:{title:{display:true,text:'tỷ đồng'}}},
      plugins:{title:{display:true,position:'bottom',text:'Cơ cấu theo hạng mục — tổng giá trị HĐ (bộ lọc hiện tại): '+fmtTy(rows.reduce((s,h)=>s+h.giaTriHD,0))},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y.toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ'}}}}
  });
}
renderKL();

/* ================= TAB 4 ================= */
document.getElementById('tl').innerHTML = thanhToan.filter(t=>t.ngay).map(t=>`
  <div class="item"><div class="dt">${fmtD(t.ngay)} · <b class="${t.hd==='VG'?'ntVG':'ntTT'}">${t.hd==='VG'?'V-Green':'Trọng Tín'}</b></div>
    <div class="hd">${t.lan} — ${t.bienBan}</div>
    <div class="meta"><div>NT: ${fmtTy(t.nghiemThu)}</div><div>Giải ngân: ${fmtTy(t.giaiNgan)}</div><div>Thu hồi TƯ: ${fmtTy(t.thuHoiTU)}</div></div>
  </div>`).join('') + `
  <div class="item pending"><div class="dt">— · <b class="ntVG">V-Green</b></div>
    <div class="hd">Chưa có hồ sơ tạm ứng / thanh toán <span class="todo-tag">CẦN CẬP NHẬT</span></div>
  </div>`;

document.getElementById('tu-tb').innerHTML = `
  <tr><td style="text-align:left"><b class="ntTT">Trọng Tín</b></td><td>${fmt(contracts.TT.tamUng)}</td>
    <td>${fmt(contracts.TT.tamUng-contracts.TT.tamUngConLai)}</td><td style="color:var(--red);font-weight:800">${fmt(contracts.TT.tamUngConLai)}</td></tr>
  <tr class="todo"><td style="text-align:left"><b class="ntVG">V-Green</b></td><td>${fmt(null)}</td><td>${fmt(null)}</td><td>${fmt(null)}</td></tr>`;

document.getElementById('ct-tb').innerHTML = `
  <tr><td style="text-align:left"><b class="ntTT">Trọng Tín</b></td><td>${fmt(contracts.TT.giaTri)}</td><td>${fmt(contracts.TT.giaiNgan)}</td><td>${fmt(contracts.TT.giaTri-contracts.TT.giaiNgan)}</td></tr>
  <tr class="todo"><td style="text-align:left"><b class="ntVG">V-Green</b></td><td>${fmt(contracts.VG.giaTri)}</td><td>${fmt(null)}</td><td>${fmt(contracts.VG.giaTri)} <span class="note">(nếu chưa giải ngân)</span></td></tr>
  <tr style="font-weight:800;background:var(--sky)"><td style="text-align:left">TỔNG (tối đa)</td><td>${fmt(TONG)}</td><td>${fmt(GN_DA)}</td><td>${fmt(TONG-GN_DA)}</td></tr>`;

document.getElementById('tt-tb').innerHTML = thanhToan.map(t=>`
  <tr class="${t.todo?'todo':''}"><td><b class="${t.hd==='VG'?'ntVG':'ntTT'}">${t.hd==='VG'?'V-Green':'Trọng Tín'}</b></td>
  <td style="text-align:left">${t.lan}</td><td>${fmtD(t.ngay)}</td><td>${t.bienBan}${t.todo?'<span class="todo-tag">CẦN CẬP NHẬT</span>':''}</td>
  <td>${fmt(t.nghiemThu)}</td><td>${fmt(t.giaiNgan)}</td><td>${t.traNT!=null?fmt(t.traNT):'—'}</td><td>${t.baoHanh!=null?fmt(t.baoHanh):'—'}</td><td>${fmt(t.thuHoiTU)}</td></tr>`).join('');
document.getElementById('tt-tf').innerHTML = `<tr style="font-weight:800;background:var(--sky)">
  <td colspan="4">LŨY KẾ TRỌNG TÍN (đến hết lần 2)</td>
  <td>${fmt(8919343186)}</td><td>${fmt(29027409000)}</td><td>${fmt(8501768000)}</td><td>${fmt(417575000)}</td><td>${fmt(891934000)}</td></tr>
  <tr><td colspan="9" class="note" style="text-align:left">Giải ngân lũy kế 29,03 tỷ = thanh toán KL hoàn thành 8,92 tỷ + tạm ứng còn chưa thu hồi 20,11 tỷ. Nguồn: PL3a thanh toán lần 1 (ký 11/05/2026) và lần 2 — file ai_3_thanhtoan_TrongTin_lan1/lan2.xlsx. V-Green: chưa thanh toán đợt nào.</td></tr>`;

document.getElementById('dc-tb').innerHTML = dieuChinhHD.map(d=>`
  <tr><td><b class="${d.hd==='VG'?'ntVG':'ntTT'}">${d.hd==='VG'?'V-Green':'Trọng Tín'}</b></td>
  <td style="text-align:left">${d.noiDung}</td><td style="text-align:left">${d.pl}</td><td>${fmtD(d.ngay)}</td><td>${fmt(d.gia)}</td></tr>`).join('');

/* ================= TAB 5 ================= */
document.getElementById('hd-tb').innerHTML = Object.values(contracts).map(c=>`
  <tr><td style="text-align:left">${c.soHD}<br><span class="note" style="margin:0">ký ${fmtD(c.ngayKy)} · ${c.goi}</span></td>
  <td><b class="${c===contracts.VG?'ntVG':'ntTT'}">${c.tenNgan}</b></td><td>${fmt(c.giaTri)}</td>
  <td>đến ${fmtD(c.mocGoc)}${c.mocHT!==c.mocGoc?' <span class="tag t-yel">cần PL gia hạn → '+fmtD(c.mocHT)+'</span>':''}</td>
  <td class="todo">${fmt(c.blTHHD)}</td><td class="todo">${fmt(c.blTamUng)}</td><td class="todo">${c.hanBL||'<span class="todo-tag">CẦN CẬP NHẬT</span>'}</td></tr>`).join('');

(function initVB(){
  const sd=document.getElementById('vb-dv'), sg=document.getElementById('vb-gd');
  [...new Set(vanBanData.map(v=>v.donVi))].forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;sd.appendChild(o);});
  [...new Set(vanBanData.map(v=>v.gd))].forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;sg.appendChild(o);});
})();
function renderVB(){
  const dv=document.getElementById('vb-dv').value, gd=document.getElementById('vb-gd').value;
  const q=(document.getElementById('vb-search').value||'').toLowerCase();
  const rows=vanBanData.filter(v=>(!dv||v.donVi===dv)&&(!gd||v.gd===gd)&&(!q||(v.ten+' '+v.so).toLowerCase().includes(q)));
  document.getElementById('vb-tb').innerHTML = rows.map((v,i)=>`<tr>
    <td>${i+1}</td><td style="white-space:nowrap">${v.ngay}</td>
    <td style="text-align:left;white-space:nowrap">${v.so}</td>
    <td><span class="tag ${v.gd==='Thi công'?'t-blue':v.gd==='Đất đai / GPMB'?'t-purple':v.gd==='Thiết kế'?'t-teal':'t-gray'}">${v.gd}</span></td>
    <td style="text-align:left">${v.donVi}</td>
    <td style="text-align:left">${v.link?`<a href="${v.link}" target="_blank" rel="noopener" style="color:var(--blue);font-weight:600;text-decoration:none">${v.ten} 🔗</a>`:v.ten}</td>
    <td>${v.link?'<span class="tag t-grn">Có file gốc</span>':'<span class="tag t-yel">Chưa có link</span>'}</td>
  </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--gray)">Không có văn bản phù hợp</td></tr>';
  document.getElementById('vb-count').textContent=`Hiển thị ${rows.length}/${vanBanData.length}`;
}
renderVB();

document.getElementById('missing-tb').innerHTML='<table><thead><tr><th style="text-align:left">Hồ sơ</th><th style="text-align:left">Lý do / căn cứ</th></tr></thead><tbody>'+
  missingDocs.map(m=>`<tr class="todo"><td style="text-align:left">${m[0]}</td><td style="text-align:left">${m[1]}</td></tr>`).join('')+'</tbody></table>';

/* ================= TAB 6 ================= */
const tmdt=[
  ["A. TIỀN SỬ DỤNG ĐẤT (17.742 m² đất ở)",222032785852,null,"TTr 494/TTr-SNNMT 22/6/2025 — TẠM TÍNH, chờ QĐ phê duyệt chính thức; đã nộp từng phần (45 tỷ ngày 01/10/2025 + chứng từ thuế) — cần tổng hợp số đã nộp",1],
  ["B. TMĐT XÂY DỰNG theo QĐ 014/BH (= tổng 6 khoản B1–B6 dưới đây)",72670754000,null,"Chưa gồm tiền SDĐ; trước điều chỉnh 66,22 tỷ (QĐ 100722/BH)",1],
  ["&nbsp;&nbsp;&nbsp;B1. Chi phí bồi thường GPMB",14259020000,null,"QĐ 1109/QĐ-UBND — kiểm tra khấu trừ vào tiền SDĐ, tránh tính trùng với mục A",0],
  ["&nbsp;&nbsp;&nbsp;B2. Chi phí xây dựng + thiết bị",44665356000,58161974457,"HĐ Trọng Tín 54,00 tỷ + HĐ V-Green 4,16 tỷ — VƯỢT cơ cấu duyệt 13,50 tỷ (30%)",0],
  ["&nbsp;&nbsp;&nbsp;B3. Chi phí quản lý dự án",1018370000,null,"QĐ 014/BH",0],
  ["&nbsp;&nbsp;&nbsp;B4. Chi phí tư vấn ĐTXD",3369446000,null,"QĐ 014/BH",0],
  ["&nbsp;&nbsp;&nbsp;B5. Chi phí khác",2752130000,null,"QĐ 014/BH (đất trồng lúa 1,58 tỷ; rà phá bom mìn; kiểm toán…)",0],
  ["&nbsp;&nbsp;&nbsp;B6. Chi phí dự phòng",6606432000,null,"QĐ 014/BH — 10% phát sinh khối lượng",0],
  ["TỔNG VỐN NHÀ ĐẦU TƯ = A + B (không cộng lại B1–B6)",294703539852,null,"TẠM TÍNH ≈ 294,70 tỷ; nếu GPMB (B1) được khấu trừ vào tiền SDĐ (A) thì ≈ 280,44 tỷ",1]
];
document.getElementById('tmdt-tb').innerHTML=tmdt.map(r=>`<tr class="${r[1]==null?'todo':''}" ${r[4]?'style="font-weight:800;background:var(--sky)"':''}>
  <td style="text-align:left">${r[0]}</td><td>${fmt(r[1])}</td><td>${fmt(r[2])}</td><td style="text-align:left">${r[3]}</td></tr>`).join('');

document.getElementById('thu-tb').innerHTML=`
  <tr><td style="text-align:left">Đất ở liền kề LK-01 → LK-08 (không xây thô)</td><td>173</td><td>17.742,0</td>
    <td style="text-align:left">14,6 – 29,38 triệu đ/m² theo mặt cắt (giá tính doanh thu của HĐ thẩm định giá đất; bình quân ≈ 19,8 tr/m²)</td>
    <td>${fmt(351254633600)}<br><span class="note">doanh thu phát triển chiết khấu về hiện tại, r=10,31%</span></td>
    <td style="text-align:left">Hoàn thành HTKT theo tiến độ duyệt (mốc 30/10/2026) + hoàn thành nghĩa vụ tài chính đất đai</td></tr>
  <tr class="todo"><td style="text-align:left">Phân bổ 173 lô theo nhóm giá/mặt cắt <span class="todo-tag">CẦN CẬP NHẬT</span></td><td colspan="5" style="text-align:left">Chờ phụ lục tính toán của đơn vị tư vấn định giá (kèm chứng thư) hoặc bản vẽ QH-03.1/QH-05 để gán từng lô — Sếp Tuyền sẽ cung cấp</td></tr>`;

const hqRows=[
  ["Tổng doanh thu phát triển (PV, r=10,31%)","351,25 tỷ (TTr 494)",null,null,null],
  ["Tổng vốn đầu tư (TMĐT + tiền SDĐ, tạm)","≈ 294,70 tỷ",null,null,null],
  ["Lợi nhuận gộp sơ bộ (chưa tính lãi vay, thuế TNDN)","≈ 56,55 tỷ — biên ≈ 16,1% doanh thu",null,null,null],
  ["NPV / IRR / Thời gian hoàn vốn",null,null,null,null],
  ["Nhu cầu vốn đỉnh (dòng tiền âm sâu nhất)",null,null,null,null]
];
document.getElementById('hq-tb').innerHTML=hqRows.map(r=>`<tr class="${r[1]==null?'todo':''}"><td style="text-align:left">${r[0]}</td>
  <td>${r[1]!=null?r[1]+' <span class="todo-tag">TẠM TÍNH</span>':fmt(null)}</td><td>${fmt(null)}</td><td>${fmt(null)}</td><td>${fmt(null)}</td></tr>`).join('')
  +`<tr><td colspan="5" class="note" style="text-align:left">Lưu ý: 56,55 tỷ = 351,25 − 222,03 (tiền SDĐ) − 72,67 (TMĐT). Nếu GPMB 14,26 tỷ được khấu trừ vào tiền SDĐ thì lợi nhuận gộp ≈ 70,81 tỷ. Con số theo phương pháp thặng dư đã "để lại" cho nhà đầu tư 20% lợi nhuận định mức trong 96,40 tỷ chi phí phát triển — cần mô hình dòng tiền theo quý để ra NPV/IRR thực.</td></tr>`;

const sens=[
  ["Giá bán đất nền","RẤT CAO","Mỗi 1% giá bán thường tác động mạnh nhất đến NPV/IRR của dự án KĐT"],
  ["Tiến độ hoàn thành hạ tầng (điều kiện mở bán)","RẤT CAO","Chậm 1 quý = lùi toàn bộ dòng thu + tăng lãi vay; hiện tiến độ đã lùi 31/08 → 30/10/2026"],
  ["Tốc độ hấp thụ (tỷ lệ bán theo quý)","CAO","Phụ thuộc thị trường BĐS Bắc Ninh và hạ tầng kết nối"],
  ["Nghĩa vụ tài chính đất đai","CAO","Số tiền sử dụng đất quyết định biên lợi nhuận gốc"],
  ["Chi phí xây lắp phát sinh","TRUNG BÌNH","2 HĐ đã khóa giá ~58,16 tỷ; rủi ro còn ở phát sinh và trượt giá"],
  ["Chi phí vốn (lãi suất vay)","TRUNG BÌNH","Nhạy cảm khi dòng thu bị lùi"]
];
document.getElementById('sens-tb').innerHTML='<table><thead><tr><th style="text-align:left">Biến số</th><th>Mức ảnh hưởng</th><th style="text-align:left">Nhận định</th></tr></thead><tbody>'+
  sens.map(s=>`<tr><td style="text-align:left">${s[0]}</td><td><span class="tag ${s[1]==='RẤT CAO'?'t-red':s[1]==='CAO'?'t-yel':'t-gray'}">${s[1]}</span></td><td style="text-align:left">${s[2]}</td></tr>`).join('')+'</tbody></table>';


/* ================= TAB 7: BÁO CÁO TUẦN ================= */
/* Báo cáo tuần được nhúng TRỰC TIẾP (base64) — toàn bộ dashboard chỉ 1 file duy nhất.
   Thêm tuần mới: nhờ Chú Dương nhúng, hoặc thêm phần tử { label:"...", b64:"..." } (mã hóa base64 của file HTML báo cáo). */
const baoCaoTuan = [
  { label:"Tuần 1 tháng 7/2026 (01–10/07/2026)", b64:"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InZpIj4KPGhlYWQ+CiAgICA8bWV0YSBjaGFyc2V0PSJVVEYtOCI+CiAgICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgICA8IS0tID09PT09IFRJw4pVIMSQ4buAIFRBQiBUUsOMTkggRFVZ4buGVCDigJMgY+G6rXAgbmjhuq10IG3hu5dpIHR14bqnbiA9PT09PSAtLT4KICAgIDx0aXRsZT5Cw6FvIGPDoW8gdHXhuqduIDEgKDAx4oCTMTAvNy8yMDI2KSDigJMgVGhlbyBkw7VpIGPDtG5nIHZp4buHYyBCQkhHQiB0aMOhbmcgNy8yMDI2IOKAkyBLxJBUIFRow6FpIMSQw6BvIDM8L3RpdGxlPgogICAgPHN0eWxlPgogICAgICAgICogewogICAgICAgICAgICBtYXJnaW46IDA7CiAgICAgICAgICAgIHBhZGRpbmc6IDA7CiAgICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIGJvZHkgewogICAgICAgICAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBSb2JvdG8sICdIZWx2ZXRpY2EgTmV1ZScsIEFyaWFsLCBzYW5zLXNlcmlmOwogICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1OwogICAgICAgICAgICBjb2xvcjogIzMzMzsKICAgICAgICAgICAgbGluZS1oZWlnaHQ6IDEuNjsKICAgICAgICAgICAgcGFkZGluZzogMjBweDsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLmJ0bi1wcmludC1jb250YWluZXIgewogICAgICAgICAgICBkaXNwbGF5OiBmbGV4OwogICAgICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kOwogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAyMHB4OwogICAgICAgICAgICBwb3NpdGlvbjogZml4ZWQ7CiAgICAgICAgICAgIHRvcDogMjBweDsKICAgICAgICAgICAgcmlnaHQ6IDIwcHg7CiAgICAgICAgICAgIHotaW5kZXg6IDEwMDA7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIC5idG4tcHJpbnQtcGRmIHsKICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2RjMzU0NTsKICAgICAgICAgICAgY29sb3I6IHdoaXRlOwogICAgICAgICAgICBib3JkZXI6IG5vbmU7CiAgICAgICAgICAgIHBhZGRpbmc6IDEycHggMjRweDsKICAgICAgICAgICAgZm9udC1zaXplOiAxNHB4OwogICAgICAgICAgICBmb250LXdlaWdodDogNjAwOwogICAgICAgICAgICBib3JkZXItcmFkaXVzOiA2cHg7CiAgICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjsKICAgICAgICAgICAgYm94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMjIwLCA1MywgNjksIDAuMyk7CiAgICAgICAgICAgIHRyYW5zaXRpb246IGFsbCAwLjNzIGVhc2U7CiAgICAgICAgICAgIGRpc3BsYXk6IGZsZXg7CiAgICAgICAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgICAgICAgICAgIGdhcDogOHB4OwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuYnRuLXByaW50LXBkZjpob3ZlciB7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNjODIzMzM7CiAgICAgICAgICAgIGJveC1zaGFkb3c6IDAgNHB4IDEycHggcmdiYSgyMjAsIDUzLCA2OSwgMC40KTsKICAgICAgICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0xcHgpOwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuYnRuLXByaW50LXBkZjphY3RpdmUgewogICAgICAgICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIC5idG4tcHJpbnQtcGRmIHN2ZyB7CiAgICAgICAgICAgIHdpZHRoOiAxOHB4OwogICAgICAgICAgICBoZWlnaHQ6IDE4cHg7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIEBtZWRpYSBwcmludCB7CiAgICAgICAgICAgIC8qIOG6qG4gbsO6dCBpbiAqLwogICAgICAgICAgICAuYnRuLXByaW50LWNvbnRhaW5lciB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfQoKICAgICAgICAgICAgLyogUmVzZXQgYm9keSAqLwogICAgICAgICAgICBib2R5IHsKICAgICAgICAgICAgICAgIG1hcmdpbjogMCAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgcGFkZGluZzogMCAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgYmFja2dyb3VuZDogd2hpdGUgIWltcG9ydGFudDsKICAgICAgICAgICAgfQoKICAgICAgICAgICAgLyogTeG7l2kgY29udGFpbmVyID0gMSB0cmFuZyBBNCBuZ2FuZyAqLwogICAgICAgICAgICAuY29udGFpbmVyIHsKICAgICAgICAgICAgICAgIHdpZHRoOiAyOTdtbSAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgbWF4LXdpZHRoOiAyOTdtbSAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveCAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgYm94LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogMCAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7CiAgICAgICAgICAgICAgICBwYWRkaW5nOiA4bW0gMTBtbSAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgcGFnZS1icmVhay1hZnRlcjogYWx3YXlzICFpbXBvcnRhbnQ7CiAgICAgICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDsKICAgICAgICAgICAgfQogICAgICAgICAgICAuY29udGFpbmVyOmxhc3Qtb2YtdHlwZSB7CiAgICAgICAgICAgICAgICBwYWdlLWJyZWFrLWFmdGVyOiBhdm9pZCAhaW1wb3J0YW50OwogICAgICAgICAgICB9CgogICAgICAgICAgICAvKiBUcmFuZyBi4bqjbmc6IHRodSBuaOG7jyDEkeG7gyA3IG3hu6VjIHbhu6thIDEgdHJhbmcgQTQgbmdhbmcgKi8KICAgICAgICAgICAgdGFibGUgeyBmb250LXNpemU6IDEycHggIWltcG9ydGFudDsgfQogICAgICAgICAgICB0YWJsZSB0aCwgdGFibGUgdGQgeyBwYWRkaW5nOiA1cHggN3B4ICFpbXBvcnRhbnQ7IH0KICAgICAgICAgICAgLm5leHQtYWN0aW9uIHsgZm9udC1zaXplOiAxMS41cHggIWltcG9ydGFudDsgfQogICAgICAgICAgICAuaGVhZGVyIGgxIHsgZm9udC1zaXplOiAxOXB4ICFpbXBvcnRhbnQ7IH0KICAgICAgICAgICAgLmhlYWRlciB7IG1hcmdpbi1ib3R0b206IDZweCAhaW1wb3J0YW50OyBwYWRkaW5nLWJvdHRvbTogNnB4ICFpbXBvcnRhbnQ7IH0KICAgICAgICAgICAgLmluZm8tZ3JpZCB7IGdhcDogOHB4ICFpbXBvcnRhbnQ7IG1hcmdpbi1ib3R0b206IDEycHggIWltcG9ydGFudDsgfQogICAgICAgICAgICAuaW5mby1ib3ggeyBwYWRkaW5nOiA4cHggIWltcG9ydGFudDsgfQogICAgICAgICAgICAuaW5mby1ib3ggLnZhbHVlIHsgZm9udC1zaXplOiAxNHB4ICFpbXBvcnRhbnQ7IH0KICAgICAgICAgICAgLmluZm8tYm94IC5sYWJlbCB7IGZvbnQtc2l6ZTogMTFweCAhaW1wb3J0YW50OyB9CiAgICAgICAgICAgIC5hbGVydCB7IHBhZGRpbmc6IDhweCAhaW1wb3J0YW50OyBtYXJnaW4tYm90dG9tOiAxMnB4ICFpbXBvcnRhbnQ7IH0KICAgICAgICAgICAgLmFsZXJ0IGxpIHsgZm9udC1zaXplOiAxMXB4ICFpbXBvcnRhbnQ7IG1hcmdpbi1ib3R0b206IDRweCAhaW1wb3J0YW50OyB9CgogICAgICAgICAgICAvKiBUcmFuZyDhuqNuaDog4bqpbiBraHVuZyB2w6BuZywgR0nhu64gaGVhZGVyICovCiAgICAgICAgICAgIC5pbWctbm90ZS1ib3ggeyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7IH0KCiAgICAgICAgICAgIC8qIENvbnRhaW5lciDhuqNuaDogZmxleCBjb2x1bW4gxJHhu4Mg4bqjbmggY2hp4bq/bSBo4bq/dCBjaGnhu4F1IGNhbyAqLwogICAgICAgICAgICBAcGFnZSB7IHNpemU6IEE0IGxhbmRzY2FwZTsgbWFyZ2luOiAwOyB9CiAgICAgICAgICAgIC5pbWctY29udGFpbmVyIHsKICAgICAgICAgICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDsKICAgICAgICAgICAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW4gIWltcG9ydGFudDsKICAgICAgICAgICAgfQoKICAgICAgICAgICAgLyogR3JpZCDhuqNuaCBmbGV4OiAxID0+IGzhuqVwIMSR4bqneSBwaOG6p24gY8OybiBs4bqhaSBzYXUgZm9vdGVyICovCiAgICAgICAgICAgIC5pbWctZ3JpZCB7CiAgICAgICAgICAgICAgICBkaXNwbGF5OiBncmlkICFpbXBvcnRhbnQ7CiAgICAgICAgICAgICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmciAxZnIgIWltcG9ydGFudDsKICAgICAgICAgICAgICAgIGdhcDogMTJweCAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgZmxleDogMSAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMCAhaW1wb3J0YW50OwogICAgICAgICAgICB9CiAgICAgICAgICAgIC8qIE3hu5dpIMO0IOG6o25oOiBoaeG7g24gdGjhu4sgdOG7sSBuaGnDqm4gbmjGsCB0csOqbiBIVE1MICovCiAgICAgICAgICAgIC5pbWctZ3JpZCA+IGRpdiB7CiAgICAgICAgICAgICAgICBkaXNwbGF5OiBibG9jayAhaW1wb3J0YW50OwogICAgICAgICAgICB9CiAgICAgICAgICAgIC5pbWctZ3JpZCBoMyB7CiAgICAgICAgICAgICAgICBmb250LXNpemU6IDExcHggIWltcG9ydGFudDsKICAgICAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDRweCAhaW1wb3J0YW50OwogICAgICAgICAgICB9CiAgICAgICAgICAgIC8qIOG6om5oIGdp4buvIG5ndXnDqm4gdOG7tyBs4buHLCBraMO0bmcgY3JvcCAqLwogICAgICAgICAgICAuaW1nLWdyaWQgaW1nIHsKICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7CiAgICAgICAgICAgICAgICBoZWlnaHQ6IGF1dG8gIWltcG9ydGFudDsKICAgICAgICAgICAgICAgIG9iamVjdC1maXQ6IHVuc2V0ICFpbXBvcnRhbnQ7CiAgICAgICAgICAgICAgICBib3JkZXItcmFkaXVzOiAzcHggIWltcG9ydGFudDsKICAgICAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDAgIWltcG9ydGFudDsKICAgICAgICAgICAgfQogICAgICAgICAgICAvKiBGb290ZXIgbmfDoHkgY2jhu6VwICovCiAgICAgICAgICAgIC5pbWctY29udGFpbmVyID4gcCB7CiAgICAgICAgICAgICAgICBmbGV4LXNocmluazogMCAhaW1wb3J0YW50OwogICAgICAgICAgICAgICAgbWFyZ2luLXRvcDogNnB4ICFpbXBvcnRhbnQ7CiAgICAgICAgICAgICAgICBmb250LXNpemU6IDEwcHggIWltcG9ydGFudDsKICAgICAgICAgICAgICAgIGNvbG9yOiAjOTk5ICFpbXBvcnRhbnQ7CiAgICAgICAgICAgIH0KCiAgICAgICAgICAgIEBwYWdlIHsKICAgICAgICAgICAgICAgIHNpemU6IEE0IGxhbmRzY2FwZTsKICAgICAgICAgICAgICAgIG1hcmdpbjogMCAhaW1wb3J0YW50OwogICAgICAgICAgICB9CiAgICAgICAgfQogICAgICAgIAogICAgICAgIC5jb250YWluZXIgewogICAgICAgICAgICBtYXgtd2lkdGg6IDEyMDBweDsKICAgICAgICAgICAgbWFyZ2luOiAwIGF1dG87CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHdoaXRlOwogICAgICAgICAgICBwYWRkaW5nOiA0MHB4OwogICAgICAgICAgICBib3JkZXItcmFkaXVzOiA4cHg7CiAgICAgICAgICAgIGJveC1zaGFkb3c6IDAgMnB4IDhweCByZ2JhKDAsMCwwLDAuMDgpOwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuaGVhZGVyIHsKICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMzBweDsKICAgICAgICAgICAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICMwMDdiZmY7CiAgICAgICAgICAgIHBhZGRpbmctYm90dG9tOiAyMHB4OwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuaGVhZGVyIGgxIHsKICAgICAgICAgICAgZm9udC1zaXplOiAyOHB4OwogICAgICAgICAgICBmb250LXdlaWdodDogNjAwOwogICAgICAgICAgICBjb2xvcjogIzFhMWExYTsKICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogOHB4OwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuaGVhZGVyIHAgewogICAgICAgICAgICBmb250LXNpemU6IDE1cHg7CiAgICAgICAgICAgIGNvbG9yOiAjNjY2OwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuaW5mby1ncmlkIHsKICAgICAgICAgICAgZGlzcGxheTogZ3JpZDsKICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyIDFmcjsKICAgICAgICAgICAgZ2FwOiAxNnB4OwogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAzMHB4OwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuaW5mby1ib3ggewogICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOWZhOwogICAgICAgICAgICBwYWRkaW5nOiAxNnB4OwogICAgICAgICAgICBib3JkZXItcmFkaXVzOiA2cHg7CiAgICAgICAgICAgIGJvcmRlci1sZWZ0OiA0cHggc29saWQgIzAwN2JmZjsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLmluZm8tYm94IC5sYWJlbCB7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTJweDsKICAgICAgICAgICAgY29sb3I6ICM2NjY7CiAgICAgICAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7CiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA2MDA7CiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDZweDsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLmluZm8tYm94IC52YWx1ZSB7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTZweDsKICAgICAgICAgICAgZm9udC13ZWlnaHQ6IDYwMDsKICAgICAgICAgICAgY29sb3I6ICMxYTFhMWE7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIHRhYmxlIHsKICAgICAgICAgICAgd2lkdGg6IDEwMCU7CiAgICAgICAgICAgIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7CiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDMwcHg7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgdGFibGUgdGhlYWQgewogICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjBmMmY1OwogICAgICAgICAgICBib3JkZXItdG9wOiAxcHggc29saWQgI2RkZDsKICAgICAgICAgICAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNkZGQ7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIHRhYmxlIHRoIHsKICAgICAgICAgICAgcGFkZGluZzogMTRweCAxMnB4OwogICAgICAgICAgICB0ZXh0LWFsaWduOiBsZWZ0OwogICAgICAgICAgICBmb250LXdlaWdodDogNjAwOwogICAgICAgICAgICBjb2xvcjogIzFhMWExYTsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgdGFibGUgdGQgewogICAgICAgICAgICBwYWRkaW5nOiAxNHB4IDEycHg7CiAgICAgICAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZWVlOwogICAgICAgICAgICB2ZXJ0aWNhbC1hbGlnbjogdG9wOwogICAgICAgIH0KICAgICAgICAKICAgICAgICB0YWJsZSB0Ym9keSB0cjpob3ZlciB7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmOGY5ZmE7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIHRhYmxlIHRib2R5IHRyOm50aC1jaGlsZChldmVuKSB7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmYWZiZmM7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIC5zdHQgewogICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7CiAgICAgICAgICAgIHdpZHRoOiA1MHB4OwogICAgICAgICAgICBmb250LXdlaWdodDogNjAwOwogICAgICAgICAgICBjb2xvcjogIzY2NjsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLnN0YXR1cy1kYW5nZXIgewogICAgICAgICAgICBjb2xvcjogI2RjMzU0NTsKICAgICAgICAgICAgZm9udC13ZWlnaHQ6IDYwMDsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLnN0YXR1cy13YXJuaW5nIHsKICAgICAgICAgICAgY29sb3I6ICNmZDdlMTQ7CiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA2MDA7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIC5zdGF0dXMtc3VjY2VzcyB7CiAgICAgICAgICAgIGNvbG9yOiAjMjhhNzQ1OwogICAgICAgICAgICBmb250LXdlaWdodDogNjAwOwogICAgICAgIH0KICAgICAgICAKICAgICAgICAudW5pdCB7CiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7CiAgICAgICAgICAgIGNvbG9yOiAjMWExYTFhOwogICAgICAgIH0KICAgICAgICAKICAgICAgICAubmV4dC1hY3Rpb24gewogICAgICAgICAgICBmb250LXNpemU6IDEzcHg7CiAgICAgICAgICAgIGNvbG9yOiAjNjY2OwogICAgICAgICAgICBmb250LXN0eWxlOiBpdGFsaWM7CiAgICAgICAgfQogICAgICAgIAogICAgICAgIC5hbGVydCB7CiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNlN2YzZmY7CiAgICAgICAgICAgIGJvcmRlci1sZWZ0OiA0cHggc29saWQgIzAwNjZjYzsKICAgICAgICAgICAgcGFkZGluZzogMTZweDsKICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNnB4OwogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAzMHB4OwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuYWxlcnQgaDMgewogICAgICAgICAgICBjb2xvcjogIzAwNjZjYzsKICAgICAgICAgICAgZm9udC1zaXplOiAxNXB4OwogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxMnB4OwogICAgICAgICAgICBmb250LXdlaWdodDogNjAwOwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuYWxlcnQgdWwgewogICAgICAgICAgICBsaXN0LXN0eWxlLXBvc2l0aW9uOiBpbnNpZGU7CiAgICAgICAgICAgIGNvbG9yOiAjMzMzOwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuYWxlcnQgbGkgewogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiA4cHg7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLmFsZXJ0IHN0cm9uZyB7CiAgICAgICAgICAgIGNvbG9yOiAjZDMyZjJmOwogICAgICAgIH0KICAgICAgICAKICAgICAgICAuZm9vdGVyIHsKICAgICAgICAgICAgdGV4dC1hbGlnbjogcmlnaHQ7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTJweDsKICAgICAgICAgICAgY29sb3I6ICM5OTk7CiAgICAgICAgICAgIGJvcmRlci10b3A6IDFweCBzb2xpZCAjZWVlOwogICAgICAgICAgICBwYWRkaW5nLXRvcDogMTZweDsKICAgICAgICAgICAgbWFyZ2luLXRvcDogMzBweDsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgLmZvb3RlciBwIHsKICAgICAgICAgICAgbWFyZ2luOiA0cHggMDsKICAgICAgICB9CiAgICAgICAgCiAgICAgICAgQG1lZGlhIChtYXgtd2lkdGg6IDEwMjRweCkgewogICAgICAgICAgICAuaW5mby1ncmlkIHsKICAgICAgICAgICAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsKICAgICAgICAgICAgfQogICAgICAgIH0KICAgICAgICAKICAgICAgICBAbWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHsKICAgICAgICAgICAgLmNvbnRhaW5lciB7CiAgICAgICAgICAgICAgICBwYWRkaW5nOiAyMHB4OwogICAgICAgICAgICB9CiAgICAgICAgICAgIAogICAgICAgICAgICAuaGVhZGVyIGgxIHsKICAgICAgICAgICAgICAgIGZvbnQtc2l6ZTogMjJweDsKICAgICAgICAgICAgfQogICAgICAgICAgICAKICAgICAgICAgICAgLmluZm8tZ3JpZCB7CiAgICAgICAgICAgICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmcjsKICAgICAgICAgICAgfQogICAgICAgICAgICAKICAgICAgICAgICAgdGFibGUgewogICAgICAgICAgICAgICAgZm9udC1zaXplOiAxMnB4OwogICAgICAgICAgICB9CiAgICAgICAgICAgIAogICAgICAgICAgICB0YWJsZSB0aCwgdGFibGUgdGQgewogICAgICAgICAgICAgICAgcGFkZGluZzogMTBweCA4cHg7CiAgICAgICAgICAgIH0KICAgICAgICB9CgogICAgICAgIC8qID09PT09IFBERiBNT0RFOiBjaOG7iSBz4butYSB0cmFuZyDhuqNuaCwgZ2nhu68gbmd1ecOqbiB0cmFuZyBi4bqjbmcgPT09PT0gKi8KICAgICAgICBib2R5LnBkZi1tb2RlIHsKICAgICAgICAgICAgYmFja2dyb3VuZDogd2hpdGUgIWltcG9ydGFudDsKICAgICAgICB9CiAgICAgICAgLyog4bqobiBoZWFkZXIgdsOgIGtodW5nIHbDoG5nIHRyw6puIHRyYW5nIOG6o25oICovCiAgICAgICAgYm9keS5wZGYtbW9kZSAuaW1nLXBhZ2UtaGVhZGVyIHsKICAgICAgICAgICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OwogICAgICAgIH0KICAgICAgICBib2R5LnBkZi1tb2RlIC5pbWctbm90ZS1ib3ggewogICAgICAgICAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7CiAgICAgICAgfQogICAgICAgIC8qIOG6om5oIGNoaeG6v20gZnVsbCBjaGnhu4F1IGNhbyB0cmFuZyAqLwogICAgICAgIGJvZHkucGRmLW1vZGUgLmltZy1ncmlkIHsKICAgICAgICAgICAgZGlzcGxheTogZ3JpZCAhaW1wb3J0YW50OwogICAgICAgICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmciAxZnIgIWltcG9ydGFudDsKICAgICAgICAgICAgZ2FwOiAxMnB4ICFpbXBvcnRhbnQ7CiAgICAgICAgfQogICAgICAgIGJvZHkucGRmLW1vZGUgLmltZy1ncmlkIGltZyB7CiAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7CiAgICAgICAgICAgIGhlaWdodDogMzQwcHggIWltcG9ydGFudDsKICAgICAgICAgICAgb2JqZWN0LWZpdDogY292ZXIgIWltcG9ydGFudDsKICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4ICFpbXBvcnRhbnQ7CiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDRweCAhaW1wb3J0YW50OwogICAgICAgIH0KICAgICAgICBib2R5LnBkZi1tb2RlIC5pbWctZ3JpZCBoMyB7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTJweCAhaW1wb3J0YW50OwogICAgICAgICAgICBtYXJnaW4tYm90dG9tOiA0cHggIWltcG9ydGFudDsKICAgICAgICB9CiAgICAgICAgYm9keS5wZGYtbW9kZSAuaW1nLWdyaWQgcCB7CiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTBweCAhaW1wb3J0YW50OwogICAgICAgICAgICBtYXJnaW46IDAgIWltcG9ydGFudDsKICAgICAgICB9CiAgICA8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5PgogICAgPGRpdiBjbGFzcz0iYnRuLXByaW50LWNvbnRhaW5lciI+CiAgICAgICAgPGJ1dHRvbiBjbGFzcz0iYnRuLXByaW50LXBkZiIgb25jbGljaz0ieHVhdFBERigpIj4KICAgICAgICAgICAgPHNwYW4+8J+WqO+4jzwvc3Bhbj4gSW4gLyBYdeG6pXQgUERGCiAgICAgICAgPC9idXR0b24+CiAgICA8L2Rpdj4KCiAgICA8ZGl2IGNsYXNzPSJjb250YWluZXIiPgogICAgICAgIDxkaXYgY2xhc3M9ImhlYWRlciI+CiAgICAgICAgICAgIDxoMT48c3Ryb25nPkLDgU8gQ8OBTyBUSEVPIETDlUkgVEjhu7BDIEhJ4buGTiBDw5RORyBWSeG7hkM8L3N0cm9uZz48YnI+CiAgICAgICAgICAgIDxzcGFuIHN0eWxlPSJmb250LXNpemU6MC43ZW07Zm9udC13ZWlnaHQ6bm9ybWFsOyI+VEhFTyBCScOKTiBC4bqiTiBI4buMUCBHSUFPIEJBTiBOR8OAWSAyLzcvMjAyNiDigJQgVFXhuqZOIDEgKDAz4oCTMTAvNy8yMDI2KTwvc3Bhbj48L2gxPgogICAgICAgICAgICA8cD5E4buxIMOhbiBLaHUgxJDDtCBUaOG7iyBT4buRIDMgVGjDoWkgxJDDoG8gLSBYw6MgVMOibiBExKluaCwgVOG7iW5oIELhuq9jIE5pbmg8L3A+CiAgICAgICAgPC9kaXY+CgoKCiAgICAgICAgPHRhYmxlPgogICAgICAgICAgICA8dGhlYWQ+CiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDo1JTsiPlNUVDwvdGg+CiAgICAgICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDozMCU7Ij5O4buZaSBkdW5nIGPDtG5nIHZp4buHYzwvdGg+CiAgICAgICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDoxNSU7Ij7EkMahbiB24buLIGNo4bunIHRyw6wgdGjhu7FjIGhp4buHbjwvdGg+CiAgICAgICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDoxMiU7Ij5EZWFkbGluZTwvdGg+CiAgICAgICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDoxMyU7Ij5UcuG6oW5nIHRow6FpPC90aD4KICAgICAgICAgICAgICAgICAgICA8dGggc3R5bGU9IndpZHRoOjI1JTsiPkdoaSBjaMO6IC8gSMOgbmggxJHhu5luZyB0aeG6v3AgdGhlbzwvdGg+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICA8L3RoZWFkPgogICAgICAgICAgICA8dGJvZHk+CiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjE8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5Ib8OgbiB0aGnhu4duIHRp4bq/biDEkeG7mSB0aGkgY8O0bmcgdGjhu7FjIHThur88L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+VHLhu41uZyBUw61uPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+MTAvNy8yMDI2PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy1zdWNjZXNzIj7inIUgWG9uZzwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ibmV4dC1hY3Rpb24iPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgoKICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+MjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhu5Ugc3VuZyB4ZSB0xrDhu5tpIG7GsOG7m2MgJiDEkeG6o20gYuG6o28gduG7hyBzaW5oIG3DtGkgdHLGsOG7nW5nPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjA2LzcvMjAyNjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtc3VjY2VzcyI+4pyFIFhvbmc8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9Im5leHQtYWN0aW9uIj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KCiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjM8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5Ucmnhu4NuIGtoYWkgdGhpIGPDtG5nIEs5OCBjw6FjIHR1eeG6v24gTjEsIE4yLCBOMywgRDIsIEQxPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyb25nIHRow6FuZyA3PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy1kYW5nZXIiPuKdjCBDaMawYSB0cmnhu4NuIGtoYWk8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9Im5leHQtYWN0aW9uIj5NxrBhIGvDqW8gZMOgaSBsacOqbiB04bulYywgbuG7gW4gxJHGsOG7nW5nIG5n4bqtcCB2w6AgxrDhu5t0LiBYZW0g4bqjbmggYsOqbiBkxrDhu5tpLjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgoKICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+NDwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlThuq1wIGvhur90IEJhc2UgbG/huqFpIElJIMSR4bqhdCB+ODAlPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyb25nIHRow6FuZyA3PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJuZXh0LWFjdGlvbiI+xJDDoyB04bqtcCBr4bq/dCAyIHhlLiBYZW0g4bqjbmggYsOqbiBkxrDhu5tpLjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgoKICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+NTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyaeG7g24ga2hhaSBo4bqhbmcgbeG7pWMgdGhvw6F0IG7GsOG7m2MgdGjhuqNpIChUTlQpIHbDoCDEkWnhu4duPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhuq90IMSR4bqndSAxNS83PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy1kYW5nZXIiPuKdjCBDaMawYSB0aOG7sWMgaGnhu4duPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJuZXh0LWFjdGlvbiI+PC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij42PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHJp4buDbiBraGFpIGhvw6BuIHRoaeG7h24gaOG6oW5nIG3hu6VjIGPhu5FuZyBo4buZcCBxdWEga8Oqbmg8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+VHLhu41uZyBUw61uPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+QuG6r3QgxJHhuqd1IDIwLzc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLWRhbmdlciI+4p2MIENoxrBhIHRo4buxYyBoaeG7h248L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9Im5leHQtYWN0aW9uIj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KCiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5Ucmnhu4NuIGtoYWkgaOG6oW5nIG3hu6VjIGjDoG8ga+G7uSB0aHXhuq10PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhuq90IMSR4bqndSAxNS83PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJuZXh0LWFjdGlvbiI+WGVtIOG6o25oIGLDqm4gZMaw4bubaS48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KCiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjg8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5I4buTIHPGoSB0aGFuaCB0b8OhbiBs4bqnbiAyPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjAyLzcgdHLDrG5oIFRWR1M7IDE1LzcgeG9uZzwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtd2FybmluZyI+4pqg77iPIMSQYW5nIHRyaeG7g24ga2hhaTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ibmV4dC1hY3Rpb24iPsSQw6MgdHLDrG5oIGZpbGUgbeG7gW0gY2hvIFRWR1MsIGNo4budIG5naGnhu4dtIHRodSBo4bq/dCBs4bubcCBLOTUgxJHhu4MgaG/DoG4gdGhp4buHbiBi4bqjbiBj4bupbmcgdHLDrG5oIFRWR1MuPC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij45PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+S2nhu4NtIHRyYSwgcsOgIHNvw6F0IGzhuqFpIGjhu5Mgc8ahIHRoaeG6v3Qga+G6vyB2w6AgZOG7sSB0b8OhbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5UcuG7jW5nIFTDrW4gLyBUVlFMREE8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD4yMC83LzIwMjY8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLXdhcm5pbmciPuKaoO+4jyDEkGFuZyB0cmnhu4NuIGtoYWk8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9Im5leHQtYWN0aW9uIj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KCiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjEwPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHLhuqFtIFhMTlQ6IFRyw6xuaCBo4buTIHPGoSBwaMOhcCBsw70gVFZHUyBraeG7g20gdHJhPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlYtR3JlZW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD4wMi83IHRyw6xuaDsgMTUvNyB4b25nPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJuZXh0LWFjdGlvbiI+VFZHUyDEkWFuZyB4ZW0gaOG7kyBzxqEgY+G7qW5nLjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgoKICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+MTE8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5UcuG6oW0gWExOVDogVGhpIGPDtG5nIHhvbmcgaOG6oW5nIG3hu6VjIGLhu4M8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+Vi1HcmVlbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRow6FuZyA3PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJuZXh0LWFjdGlvbiI+VGjhu51pIHRp4bq/dCBtxrBhIGLhuqV0IGzhu6NpLCBraGnhur9uIHZp4buHYyB0aGkgY8O0bmcga2jDsyBraMSDbiAoYsahbSB0aG/DoXQgbsaw4bubYyBuaGnhu4F1IGzhuqduKS4gWGVtIOG6o25oIGLDqm4gZMaw4bubaS48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KCiAgICAgICAgICAgIDwvdGJvZHk+CiAgICAgICAgPC90YWJsZT4KCgogICAgICAgIDxkaXYgY2xhc3M9ImZvb3RlciIgc3R5bGU9InRleHQtYWxpZ246cmlnaHQ7Zm9udC1zaXplOjEycHg7Y29sb3I6Izk5OTttYXJnaW4tdG9wOjIwcHg7Ij4KICAgICAgICAgICAgQsOhbyBjw6FvIHRoZW8gZMO1aSB0aOG7sWMgaGnhu4duIGPDtG5nIHZp4buHYyDigJQgROG7sSDDoW4gS8SQVCBUaMOhaSDEkMOgbyAzIOKAlCBUdeG6p24gMS9UNy8yMDI2CiAgICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KCjxzY3JpcHQ+CmZ1bmN0aW9uIHh1YXRQREYoKSB7CiAgICB3aW5kb3cucHJpbnQoKTsKfQo8L3NjcmlwdD4KCjxkaXYgY2xhc3M9ImNvbnRhaW5lciIgc3R5bGU9Im1hcmdpbi10b3A6MzBweDtwYWdlLWJyZWFrLWJlZm9yZTphbHdheXM7Ij4KICA8ZGl2IGNsYXNzPSJoZWFkZXIiPjxoMSBzdHlsZT0iZm9udC1zaXplOjE5cHg7Ij5W4bqkTiDEkOG7gCBQSMOBVCBTSU5IIFbDgCBHSeG6okkgUEjDgVA8L2gxPgogIDxwPkThu7Egw6FuIEtodSDEkMO0IFRo4buLIFPhu5EgMyBUaMOhaSDEkMOgbyAtIFjDoyBUw6JuIETEqW5oLCBU4buJbmggQuG6r2MgTmluaDwvcD48L2Rpdj4KICA8dGFibGUgc3R5bGU9IndpZHRoOjEwMCU7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2ZvbnQtc2l6ZToxM3B4Ij4KICAgIDx0aGVhZD48dHIgc3R5bGU9ImJhY2tncm91bmQ6IzBmMmE0YTtjb2xvcjojZmZmIj4KICAgICAgPHRoIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7d2lkdGg6NSUiPlN0dDwvdGg+CiAgICAgIDx0aCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3dpZHRoOjMwJSI+Q8O0bmcgdmnhu4djIHBow6F0IHNpbmg8L3RoPgogICAgICA8dGggc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt3aWR0aDoxNyUiPsSQxqFuIHbhu4sgY2jhu6cgdHLDrDwvdGg+CiAgICAgIDx0aCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3dpZHRoOjMwJSI+R2nhuqNpIHBow6FwPC90aD4KICAgICAgPHRoIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7d2lkdGg6MTglIj5UcuG6oW5nIHRow6FpIGdp4bqjaSBxdXnhur90PC90aD4KICAgIDwvdHI+PC90aGVhZD4KICAgIDx0Ym9keT48dHI+PHRkIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7dmVydGljYWwtYWxpZ246dG9wO3RleHQtYWxpZ246Y2VudGVyO2JhY2tncm91bmQ6I2YxZjVmOSI+MTwvdGQ+PHRkIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7dmVydGljYWwtYWxpZ246dG9wIj5I4buTIHPGoSDEkWnhu4F1IGNo4buJbmggZ+G7kWkgY+G7kW5nIHbDoCBjaGnhu4F1IGTDoGkgY+G7kW5nICh0aHXhu5ljIGjhuqFuZyBt4bulYyBUaG/DoXQgbsaw4bubYyBtxrBhKTwvdGQ+PHRkIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7dmVydGljYWwtYWxpZ246dG9wIj48L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+PC90ZD48dGQgc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPkNoxrBhIHhvbmc8L3RkPjwvdHI+PHRyPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kOiNmMWY1ZjkiPjI8L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+U+G7rWEgaOG7kyBzxqEgdGhlbyB5w6p1IGPhuqd1IGPhu6dhIGtp4buDbSB0b8OhbjwvdGQ+PHRkIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7dmVydGljYWwtYWxpZ246dG9wIj48L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+PC90ZD48dGQgc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPkNoxrBhIHhvbmc8L3RkPjwvdHI+PHRyPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kOiNmMWY1ZjkiPjM8L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+R1BNQiBuaMOgIMO0bmcg4buobmc8L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+PC90ZD48dGQgc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPjwvdGQ+PHRkIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7dmVydGljYWwtYWxpZ246dG9wIj5DaMawYSB4b25nPC90ZD48L3RyPjx0cj48dGQgc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt2ZXJ0aWNhbC1hbGlnbjp0b3A7dGV4dC1hbGlnbjpjZW50ZXI7YmFja2dyb3VuZDojZjFmNWY5Ij40PC90ZD48dGQgc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPkdQTUIgbmjDoCDDtG5nIER1eSBN4bq/bjwvdGQ+PHRkIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7dmVydGljYWwtYWxpZ246dG9wIj48L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+PC90ZD48dGQgc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPkNoxrBhIHhvbmc8L3RkPjwvdHI+PHRyPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcDt0ZXh0LWFsaWduOmNlbnRlcjtiYWNrZ3JvdW5kOiNmMWY1ZjkiPjU8L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+R8OzaSDEkWnhu4duIOKAkyBwaOG6p24gxJHhuqV1IG7hu5FpPC90ZD48dGQgc3R5bGU9ImJvcmRlcjoxcHggc29saWQgIzk0YTNiODtwYWRkaW5nOjhweDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPjwvdGQ+PHRkIHN0eWxlPSJib3JkZXI6MXB4IHNvbGlkICM5NGEzYjg7cGFkZGluZzo4cHg7dmVydGljYWwtYWxpZ246dG9wIj48L3RkPjx0ZCBzdHlsZT0iYm9yZGVyOjFweCBzb2xpZCAjOTRhM2I4O3BhZGRpbmc6OHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI+Q2jGsGEgeG9uZzwvdGQ+PC90cj48L3Rib2R5PgogIDwvdGFibGU+CjwvZGl2Pgo8L2JvZHk+CjwvaHRtbD4=" },
  { label:"Tuần 3 tháng 7/2026 (cập nhật đến 24/07/2026)", b64:"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InZpIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPHRpdGxlPkLDoW8gY8OhbyB0deG6p24gMyB0aMOhbmcgNy8yMDI2ICjEkeG6v24gMjQvMDcvMjAyNik8L3RpdGxlPgo8c3R5bGU+CiogeyBtYXJnaW46MDsgcGFkZGluZzowOyBib3gtc2l6aW5nOmJvcmRlci1ib3g7IH0KYm9keSB7IGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgJ0hlbHZldGljYSBOZXVlJywgQXJpYWwsIHNhbnMtc2VyaWY7IGJhY2tncm91bmQ6I2Y1ZjVmNTsgY29sb3I6IzMzMzsgbGluZS1oZWlnaHQ6MS42OyBwYWRkaW5nOjIwcHg7IH0KLmNvbnRhaW5lciB7IG1heC13aWR0aDoxMjAwcHg7IG1hcmdpbjowIGF1dG87IGJhY2tncm91bmQ6d2hpdGU7IHBhZGRpbmc6NDBweDsgYm9yZGVyLXJhZGl1czo4cHg7IGJveC1zaGFkb3c6MCAycHggOHB4IHJnYmEoMCwwLDAsMC4wOCk7IH0KLmhlYWRlciB7IG1hcmdpbi1ib3R0b206MzBweDsgYm9yZGVyLWJvdHRvbToycHggc29saWQgIzAwN2JmZjsgcGFkZGluZy1ib3R0b206MjBweDsgfQouaGVhZGVyIGgxIHsgZm9udC1zaXplOjI2cHg7IGZvbnQtd2VpZ2h0OjYwMDsgY29sb3I6IzFhMWExYTsgbWFyZ2luLWJvdHRvbTo4cHg7IH0KLmhlYWRlciBwIHsgZm9udC1zaXplOjE1cHg7IGNvbG9yOiM2NjY7IH0KdGFibGUgeyB3aWR0aDoxMDAlOyBib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7IG1hcmdpbi1ib3R0b206MjRweDsgZm9udC1zaXplOjE0cHg7IH0KdGFibGUgdGhlYWQgeyBiYWNrZ3JvdW5kOiNmMGYyZjU7IGJvcmRlci10b3A6MXB4IHNvbGlkICNkZGQ7IGJvcmRlci1ib3R0b206MnB4IHNvbGlkICNkZGQ7IH0KdGFibGUgdGggeyBwYWRkaW5nOjE0cHggMTJweDsgdGV4dC1hbGlnbjpsZWZ0OyBmb250LXdlaWdodDo2MDA7IGNvbG9yOiMxYTFhMWE7IH0KdGFibGUgdGQgeyBwYWRkaW5nOjE0cHggMTJweDsgYm9yZGVyLWJvdHRvbToxcHggc29saWQgI2VlZTsgdmVydGljYWwtYWxpZ246dG9wOyB9CnRhYmxlIHRib2R5IHRyOmhvdmVyIHsgYmFja2dyb3VuZDojZjhmOWZhOyB9CnRhYmxlIHRib2R5IHRyOm50aC1jaGlsZChldmVuKSB7IGJhY2tncm91bmQ6I2ZhZmJmYzsgfQouc3R0IHsgdGV4dC1hbGlnbjpjZW50ZXI7IHdpZHRoOjUwcHg7IGZvbnQtd2VpZ2h0OjYwMDsgY29sb3I6IzY2NjsgfQouc3RhdHVzLWRhbmdlciB7IGNvbG9yOiNkYzM1NDU7IGZvbnQtd2VpZ2h0OjYwMDsgfQouc3RhdHVzLXdhcm5pbmcgeyBjb2xvcjojZmQ3ZTE0OyBmb250LXdlaWdodDo2MDA7IH0KLnN0YXR1cy1zdWNjZXNzIHsgY29sb3I6IzI4YTc0NTsgZm9udC13ZWlnaHQ6NjAwOyB9Ci51bml0IHsgZm9udC13ZWlnaHQ6NTAwOyBjb2xvcjojMWExYTFhOyB9Ci5naGljaHUgeyBmb250LXNpemU6MTAuNHB4OyBjb2xvcjojNTU1OyBmb250LXN0eWxlOml0YWxpYzsgfQouZ2hpY2h1IGgzIHsgZm9udC1zaXplOjEycHg7IGNvbG9yOiMxYTFhMWE7IG1hcmdpbi1ib3R0b206MTBweDsgZm9udC1zdHlsZTppdGFsaWM7IH0KLmdoaWNodSB1bCB7IHBhZGRpbmctbGVmdDoyMHB4OyB9Ci5naGljaHUgbGkgeyBtYXJnaW4tYm90dG9tOjZweDsgfQpAbWVkaWEgcHJpbnQgewogIEBwYWdlIHsgc2l6ZTogQTQgbGFuZHNjYXBlOyBtYXJnaW46IDJtbTsgfQogIGh0bWwsIGJvZHkgeyB3aWR0aDogMjkzbW07IGhlaWdodDogMjA2bW07IH0KICBib2R5IHsgcGFkZGluZzogMCAhaW1wb3J0YW50OyB9CiAgLmNvbnRhaW5lciB7IG1heC13aWR0aDogMjkzbW0gIWltcG9ydGFudDsgd2lkdGg6IDI5M21tICFpbXBvcnRhbnQ7IGhlaWdodDogMjA2bW0gIWltcG9ydGFudDsgcGFkZGluZzogNG1tIDhtbSAhaW1wb3J0YW50OwogICAgYm94LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50OyBib3JkZXItcmFkaXVzOiAwICFpbXBvcnRhbnQ7IG92ZXJmbG93OiBoaWRkZW4gIWltcG9ydGFudDsKICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbiAhaW1wb3J0YW50OyBwYWdlLWJyZWFrLWFmdGVyOiBhdm9pZCAhaW1wb3J0YW50OyBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDsgfQogIC5oZWFkZXIgeyBtYXJnaW4tYm90dG9tOiAxMHB4ICFpbXBvcnRhbnQ7IHBhZGRpbmctYm90dG9tOiA4cHggIWltcG9ydGFudDsgfQogIC5oZWFkZXIgaDEgeyBmb250LXNpemU6IDIycHggIWltcG9ydGFudDsgfQogIC5oZWFkZXIgcCB7IGZvbnQtc2l6ZTogMTNweCAhaW1wb3J0YW50OyB9CiAgdGFibGUgeyBmb250LXNpemU6IDEzLjVweCAhaW1wb3J0YW50OyBtYXJnaW4tYm90dG9tOiAxMnB4ICFpbXBvcnRhbnQ7IH0KICB0YWJsZSB0aCwgdGFibGUgdGQgeyBwYWRkaW5nOiA4cHggMTBweCAhaW1wb3J0YW50OyB9CiAgLmdoaWNodSB7IGZsZXg6IDEgMSBhdXRvOyBvdmVyZmxvdzogaGlkZGVuICFpbXBvcnRhbnQ7IH0KICAuZ2hpY2h1IGgzIHsgZm9udC1zaXplOiAxM3B4ICFpbXBvcnRhbnQ7IG1hcmdpbi1ib3R0b206IDZweCAhaW1wb3J0YW50OyB9CiAgLmdoaWNodSB1bCB7IGZvbnQtc2l6ZTogMTJweCAhaW1wb3J0YW50OyB9CiAgLmdoaWNodSBsaSB7IG1hcmdpbi1ib3R0b206IDRweCAhaW1wb3J0YW50OyB9Cn0KPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KPGRpdiBjbGFzcz0iY29udGFpbmVyIj4KICAgIDxkaXYgY2xhc3M9ImhlYWRlciI+CiAgICAgICAgPGgxIHN0eWxlPSJtYXJnaW4tYm90dG9tOjJweCI+PHN0cm9uZz5Cw4FPIEPDgU8gVEjhu7BDIEhJ4buGTiBDw5RORyBWSeG7hkMgVEhFTyBI4buMUCBHSUFPIEJBTjwvc3Ryb25nPjwvaDE+CiAgICAgICAgPHAgc3R5bGU9Im1hcmdpbjowIj5UdeG6p24gMyB0aMOhbmcgNy8yMDI2IChj4bqtcCBuaOG6rXQgxJHhur9uIDI0LzA3LzIwMjYpPC9wPgogICAgICAgIDxwIHN0eWxlPSJtYXJnaW46MCI+ROG7sSDDoW4gS2h1IMSQw7QgVGjhu4sgU+G7kSAzIFjDoyBUaMOhaSDEkMOgbyAoTmF5IEzDoCBYw6MgVMOibiBExKluaCwgVOG7iW5oIELhuq9jIE5pbmgpPC9wPgogICAgPC9kaXY+CgogICAgPHRhYmxlPgogICAgICAgIDx0aGVhZD4KICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDo2JTsiPlNUVDwvdGg+CiAgICAgICAgICAgICAgICA8dGggc3R5bGU9IndpZHRoOjM4JTsiPk7hu5lpIGR1bmcgY8O0bmcgdmnhu4djPC90aD4KICAgICAgICAgICAgICAgIDx0aCBzdHlsZT0id2lkdGg6MjAlOyI+xJDGoW4gduG7iyBjaOG7pyB0csOsPC90aD4KICAgICAgICAgICAgICAgIDx0aCBzdHlsZT0id2lkdGg6MTglOyI+RGVhZGxpbmU8L3RoPgogICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDoxOCU7Ij5UcuG6oW5nIHRow6FpPC90aD4KICAgICAgICAgICAgPC90cj4KICAgICAgICA8L3RoZWFkPgogICAgICAgIDx0Ym9keT4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+MTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkhvw6BuIHRoaeG7h24gdGnhur9uIMSR4buZIHRoaSBjw7RuZyB0aOG7sWMgdOG6vzwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5UcuG7jW5nIFTDrW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD4xMC83LzIwMjY8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLXN1Y2Nlc3MiPuKchSBYb25nPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij4yPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+QuG7lSBzdW5nIHhlIHTGsOG7m2kgbsaw4bubYyAmIMSR4bqjbSBi4bqjbyBWU01UIHRoZW8gxJBUTTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5UcuG7jW5nIFTDrW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD4wNi83LzIwMjY8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLXN1Y2Nlc3MiPuKchSBYb25nPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij4zPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHJp4buDbiBraGFpIHRoaSBjw7RuZyBLOTggY8OhYyB0dXnhur9uIE4xLCBOMiwgTjMsIEQyLCBEMTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5UcuG7jW5nIFTDrW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5Ucm9uZyB0aMOhbmcgNzwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtd2FybmluZyI+4pqg77iPIMSQYW5nIHRyaeG7g24ga2hhaTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+NDwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlThuq1wIGvhur90IEJhc2UgbG/huqFpIElJIMSR4bqhdCB+ODAlPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyb25nIHRow6FuZyA3PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij41PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHJp4buDbiBraGFpIGjhuqFuZyBt4bulYyB0aG/DoXQgbsaw4bubYyB0aOG6o2kgKFROVCkgdsOgIMSRaeG7h248L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+VHLhu41uZyBUw61uPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+QuG6r3QgxJHhuqd1IDE1Lzc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLWRhbmdlciI+4p2MIENoxrBhIHRyaeG7g24ga2hhaTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+NjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyaeG7g24ga2hhaSBob8OgbiB0aGnhu4duIGjhuqFuZyBt4bulYyBj4buRbmcgaOG7mXAgcXVhIGvDqm5oPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhuq90IMSR4bqndSAyMC83PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy1kYW5nZXIiPuKdjCBDaMawYSB0cmnhu4NuIGtoYWk8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5Ucmnhu4NuIGtoYWkgaOG6oW5nIG3hu6VjIGjDoG8ga+G7uSB0aHXhuq10PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhuq90IMSR4bqndSAxNS83PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij44PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+SOG7kyBzxqEgdGhhbmggdG/DoW4gbOG6p24gMjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5UcuG7jW5nIFTDrW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD4wMi83IHRyw6xuaCBUVkdTOyAxNS83IHhvbmc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLXdhcm5pbmciPuKaoO+4jyDEkGFuZyB0cmnhu4NuIGtoYWk8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjk8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5LaeG7g20gdHJhLCByw6Agc2/DoXQgbOG6oWkgaOG7kyBzxqEgdGhp4bq/dCBr4bq/IHbDoCBk4buxIHRvw6FuPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjIwLzcvMjAyNjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtc3VjY2VzcyI+4pyFIFhvbmc8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjEwPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHLhuqFtIFhMTlQ6IFRyw6xuaCBo4buTIHPGoSBwaMOhcCBsw70gUUxEQSBraeG7g20gdHJhPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlYtR3JlZW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD4wMi83IHRyw6xuaDsgMTUvNyB4b25nPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij4xMTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRy4bqhbSBYTE5UOiBUaGkgY8O0bmcgeG9uZyBo4bqhbmcgbeG7pWMgYuG7gzwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5WLUdyZWVuPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHJvbmcgdGjDoW5nIDc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLXdhcm5pbmciPuKaoO+4jyDEkGFuZyB0cmnhu4NuIGtoYWk8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CiAgICAgICAgPC90Ym9keT4KICAgIDwvdGFibGU+CgogICAgPGRpdiBjbGFzcz0iZ2hpY2h1Ij4KICAgICAgICA8aDM+R2hpIGNow7o8L2gzPgogICAgICAgIDx1bD48bGk+PGI+TeG7pWMgMy1Ucmnhu4NuIGtoYWkgdGhpIGPDtG5nIEs5OCBjw6FjIHR1eeG6v24gTjEsIE4yLCBOMywgRDIsIEQxOjwvYj4gSzk1IHR1eeG6v24gRDAyL04wMyBjaMawYSDEkeG6oXQsIMSRw6MgaOG6uW4gbmdoaeG7h20gdGh1IGzhuqFpIDIyLzcuIMSQ4bq/biAyNC83IGNoxrBhIGPDsyBr4bq/dCBxdeG6oyB4w6FjIG5o4bqtbi48L2xpPjxsaT48Yj5N4bulYyA3LVRyaeG7g24ga2hhaSBo4bqhbmcgbeG7pWMgaMOgbyBr4bu5IHRodeG6rXQ6PC9iPiBDYW8gxJHhu5kgxJHDoG8gxJHhuqF0IHnDqnUgY+G6p3UgbmjGsG5nIG7hu4FuIEs4NSDihpIgY+G6p24gbHUgdGjDqm0sIMSR4bqvcCDEkcOhIGTEg20sIMSR4buVIGLDqiB0w7RuZyBsw7N0IHPhu5ttLjwvbGk+PGxpPjxiPk3hu6VjIDgtSOG7kyBzxqEgdGhhbmggdG/DoW4gbOG6p24gMjo8L2I+IE5ow6AgdGjhuqd1IMSRYW5nIGvDvSBo4buTIHPGoSBi4bqjbiBj4bupbmcuPC9saT48bGk+PGI+TeG7pWMgOS1LaeG7g20gdHJhLCByw6Agc2/DoXQgbOG6oWkgaOG7kyBzxqEgdGhp4bq/dCBr4bq/IHbDoCBk4buxIHRvw6FuOjwvYj4gxJDDoyBwaMOhdCBoaeG7h24gdsOgIMSR4buBIHh14bqldCA4IHbhuqVuIMSR4buBIHbhu4EgdGhp4bq/dCBr4bq/IGPhuqduIMSRaeG7gXUgY2jhu4luaC48L2xpPjxsaT48Yj5N4bulYyAxMC1UcuG6oW0gWExOVDogVHLDrG5oIGjhu5Mgc8ahIHBow6FwIGzDvSBRTERBIGtp4buDbSB0cmE6PC9iPiBRTERBIMSRYW5nIHhlbSBo4buTIHPGoSBj4bupbmcuPC9saT48bGk+PGI+TeG7pWMgMTEtVHLhuqFtIFhMTlQ6IFRoaSBjw7RuZyB4b25nIGjhuqFuZyBt4bulYyBi4buDOjwvYj4gxJBhbmcgbmdoaeG7h20gdGh1IGPhu5F0IHRow6lwIHbDoWNoIGLhu4M7IGPDsm4gdsaw4bubbmcgbcOhYyBiw6ogdMO0bmcgKFRLIGdoaSBNMjUwLCBIxJAgZ2hpIE0zNTApIOKAlCBjaMawYSBjaOG7kXQuPC9saT48L3VsPgogICAgPC9kaXY+CjwvZGl2Pgo8L2JvZHk+CjwvaHRtbD4=" },
  { label:"Tuần 4 tháng 7/2026 (25/07-01/08/2026)", b64:"PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9InZpIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9IlVURi04Ij4KPHRpdGxlPkLDoW8gY8OhbyB0deG6p24gNCB0aMOhbmcgNy8yMDI2ICgyNS8wNy0wMS8wOC8yMDI2KTwvdGl0bGU+CjxzdHlsZT4KKiB7IG1hcmdpbjowOyBwYWRkaW5nOjA7IGJveC1zaXppbmc6Ym9yZGVyLWJveDsgfQpib2R5IHsgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCAnSGVsdmV0aWNhIE5ldWUnLCBBcmlhbCwgc2Fucy1zZXJpZjsgYmFja2dyb3VuZDojZjVmNWY1OyBjb2xvcjojMzMzOyBsaW5lLWhlaWdodDoxLjY7IHBhZGRpbmc6MjBweDsgfQouY29udGFpbmVyIHsgbWF4LXdpZHRoOjEyMDBweDsgbWFyZ2luOjAgYXV0bzsgYmFja2dyb3VuZDp3aGl0ZTsgcGFkZGluZzo0MHB4OyBib3JkZXItcmFkaXVzOjhweDsgYm94LXNoYWRvdzowIDJweCA4cHggcmdiYSgwLDAsMCwwLjA4KTsgfQouaGVhZGVyIHsgbWFyZ2luLWJvdHRvbToxNnB4OyBib3JkZXItYm90dG9tOjJweCBzb2xpZCAjMDA3YmZmOyBwYWRkaW5nLWJvdHRvbToyMHB4OyB9Ci5oZWFkZXIgaDEgeyBmb250LXNpemU6MjZweDsgZm9udC13ZWlnaHQ6NjAwOyBjb2xvcjojMWExYTFhOyBtYXJnaW4tYm90dG9tOjJweDsgfQouaGVhZGVyIHAgeyBmb250LXNpemU6MTVweDsgY29sb3I6IzY2NjsgbWFyZ2luOjA7IH0KdGFibGUgeyB3aWR0aDoxMDAlOyBib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7IG1hcmdpbi1ib3R0b206MjRweDsgZm9udC1zaXplOjE0cHg7IH0KdGFibGUgdGhlYWQgeyBiYWNrZ3JvdW5kOiNmMGYyZjU7IGJvcmRlci10b3A6MXB4IHNvbGlkICNkZGQ7IGJvcmRlci1ib3R0b206MnB4IHNvbGlkICNkZGQ7IH0KdGFibGUgdGggeyBwYWRkaW5nOjE0cHggMTJweDsgdGV4dC1hbGlnbjpsZWZ0OyBmb250LXdlaWdodDo2MDA7IGNvbG9yOiMxYTFhMWE7IH0KdGFibGUgdGQgeyBwYWRkaW5nOjE0cHggMTJweDsgYm9yZGVyLWJvdHRvbToxcHggc29saWQgI2VlZTsgdmVydGljYWwtYWxpZ246dG9wOyB9CnRhYmxlIHRib2R5IHRyOmhvdmVyIHsgYmFja2dyb3VuZDojZjhmOWZhOyB9CnRhYmxlIHRib2R5IHRyOm50aC1jaGlsZChldmVuKSB7IGJhY2tncm91bmQ6I2ZhZmJmYzsgfQouc3R0IHsgdGV4dC1hbGlnbjpjZW50ZXI7IHdpZHRoOjUwcHg7IGZvbnQtd2VpZ2h0OjYwMDsgY29sb3I6IzY2NjsgfQouc3RhdHVzLWRhbmdlciB7IGNvbG9yOiNkYzM1NDU7IGZvbnQtd2VpZ2h0OjYwMDsgfQouc3RhdHVzLXdhcm5pbmcgeyBjb2xvcjojZmQ3ZTE0OyBmb250LXdlaWdodDo2MDA7IH0KLnN0YXR1cy1zdWNjZXNzIHsgY29sb3I6IzI4YTc0NTsgZm9udC13ZWlnaHQ6NjAwOyB9Ci51bml0IHsgZm9udC13ZWlnaHQ6NTAwOyBjb2xvcjojMWExYTFhOyB9CkBtZWRpYSBwcmludCB7CiAgQHBhZ2UgeyBzaXplOiBBNCBsYW5kc2NhcGU7IG1hcmdpbjogMm1tOyB9CiAgaHRtbCwgYm9keSB7IHdpZHRoOiAyOTNtbTsgaGVpZ2h0OiAyMDZtbTsgfQogIGJvZHkgeyBwYWRkaW5nOiAwICFpbXBvcnRhbnQ7IH0KICAuY29udGFpbmVyIHsgbWF4LXdpZHRoOiAyOTNtbSAhaW1wb3J0YW50OyB3aWR0aDogMjkzbW0gIWltcG9ydGFudDsgaGVpZ2h0OiAyMDZtbSAhaW1wb3J0YW50OyBwYWRkaW5nOiA1bW0gMTBtbSAhaW1wb3J0YW50OwogICAgYm94LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50OyBib3JkZXItcmFkaXVzOiAwICFpbXBvcnRhbnQ7IG92ZXJmbG93OiBoaWRkZW4gIWltcG9ydGFudDsKICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbiAhaW1wb3J0YW50OyBwYWdlLWJyZWFrLWFmdGVyOiBhdm9pZCAhaW1wb3J0YW50OyBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDsgfQogIC5oZWFkZXIgeyBtYXJnaW4tYm90dG9tOiAxNHB4ICFpbXBvcnRhbnQ7IHBhZGRpbmctYm90dG9tOiAxMHB4ICFpbXBvcnRhbnQ7IGZsZXgtc2hyaW5rOjAgIWltcG9ydGFudDsgfQogIC5oZWFkZXIgaDEgeyBmb250LXNpemU6IDE3cHggIWltcG9ydGFudDsgfQogIC5oZWFkZXIgcCB7IGZvbnQtc2l6ZTogMTBweCAhaW1wb3J0YW50OyB9CiAgdGFibGUgeyBmb250LXNpemU6IDEwLjVweCAhaW1wb3J0YW50OyBtYXJnaW4tYm90dG9tOiAxM3B4ICFpbXBvcnRhbnQ7IGZsZXgtc2hyaW5rOjAgIWltcG9ydGFudDsgfQogIHRhYmxlIHRoLCB0YWJsZSB0ZCB7IHBhZGRpbmc6IDdweCA4cHggIWltcG9ydGFudDsgfQogIC5naGljaHUgeyBmbGV4OiAxIDEgYXV0byAhaW1wb3J0YW50OyBvdmVyZmxvdzogaGlkZGVuICFpbXBvcnRhbnQ7IGRpc3BsYXk6ZmxleCAhaW1wb3J0YW50OyBmbGV4LWRpcmVjdGlvbjpjb2x1bW4gIWltcG9ydGFudDsgfQogIC5naGljaHUgdWwgeyBmbGV4OjEgIWltcG9ydGFudDsgZGlzcGxheTpmbGV4ICFpbXBvcnRhbnQ7IGZsZXgtZGlyZWN0aW9uOmNvbHVtbiAhaW1wb3J0YW50OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtZXZlbmx5ICFpbXBvcnRhbnQ7IH0KfQouZ2hpY2h1IHsgZm9udC1zaXplOjEwLjRweDsgY29sb3I6IzU1NTsgZm9udC1zdHlsZTppdGFsaWM7IH0KLmdoaWNodSBoMyB7IGZvbnQtc2l6ZToxMnB4OyBjb2xvcjojMWExYTFhOyBtYXJnaW4tYm90dG9tOjEwcHg7IGZvbnQtc3R5bGU6aXRhbGljOyB9Ci5naGljaHUgdWwgeyBwYWRkaW5nLWxlZnQ6MjBweDsgfQouZ2hpY2h1IGxpIHsgbWFyZ2luLWJvdHRvbTo2cHg7IH0KQG1lZGlhIHByaW50IHsgLmdoaWNodSBoMyB7IGZvbnQtc2l6ZTogMTAuNXB4ICFpbXBvcnRhbnQ7IG1hcmdpbi1ib3R0b206NnB4ICFpbXBvcnRhbnQ7IH0gLmdoaWNodSBsaSB7IGZvbnQtc2l6ZTo5LjVweCAhaW1wb3J0YW50OyBtYXJnaW4tYm90dG9tOjAgIWltcG9ydGFudDsgbGluZS1oZWlnaHQ6MS41ICFpbXBvcnRhbnQ7IH0gLmdoaWNodSB1bCB7IHBhZGRpbmctbGVmdDoyMHB4ICFpbXBvcnRhbnQ7IH0gfQo8L3N0eWxlPgo8L2hlYWQ+Cjxib2R5Pgo8ZGl2IGNsYXNzPSJjb250YWluZXIiPgogICAgPGRpdiBjbGFzcz0iaGVhZGVyIj4KICAgICAgICA8aDE+PHN0cm9uZz5Cw4FPIEPDgU8gVEjhu7BDIEhJ4buGTiBDw5RORyBWSeG7hkMgVEhFTyBI4buMUCBHSUFPIEJBTjwvc3Ryb25nPjwvaDE+CiAgICAgICAgPHA+VHXhuqduIDQgdGjDoW5nIDcvMjAyNiAoMjUvMDcvMjAyNiDigJMgMDEvMDgvMjAyNik8L3A+CiAgICAgICAgPHA+ROG7sSDDoW4gS2h1IMSQw7QgVGjhu4sgU+G7kSAzIFjDoyBUaMOhaSDEkMOgbyAoTmF5IEzDoCBYw6MgVMOibiBExKluaCwgVOG7iW5oIELhuq9jIE5pbmgpPC9wPgogICAgPC9kaXY+CgogICAgPHRhYmxlPgogICAgICAgIDx0aGVhZD4KICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDo1JTsiPlNUVDwvdGg+CiAgICAgICAgICAgICAgICA8dGggc3R5bGU9IndpZHRoOjMwJTsiPk7hu5lpIGR1bmcgY8O0bmcgdmnhu4djPC90aD4KICAgICAgICAgICAgICAgIDx0aCBzdHlsZT0id2lkdGg6MTUlOyI+xJDGoW4gduG7iyBjaOG7pyB0csOsPC90aD4KICAgICAgICAgICAgICAgIDx0aCBzdHlsZT0id2lkdGg6MTMlOyI+RGVhZGxpbmU8L3RoPgogICAgICAgICAgICAgICAgPHRoIHN0eWxlPSJ3aWR0aDoxNiU7Ij5UcuG6oW5nIHRow6FpPC90aD4KICAgICAgICAgICAgICAgIDx0aCBzdHlsZT0id2lkdGg6MjElOyI+R2hpIGNow7o8L3RoPgogICAgICAgICAgICA8L3RyPgogICAgICAgIDwvdGhlYWQ+CiAgICAgICAgPHRib2R5PgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij4xPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+SG/DoG4gdGhp4buHbiB0aeG6v24gxJHhu5kgdGhpIGPDtG5nIHRo4buxYyB04bq/PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjEwLzcvMjAyNjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtc3VjY2VzcyI+4pyFIFhvbmc8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gc3R5bGU9ImNvbG9yOiNiYmIiPuKAlDwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+MjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhu5Ugc3VuZyB4ZSB0xrDhu5tpIG7GsOG7m2MgJiDEkeG6o20gYuG6o28gVlNNVCB0aGVvIMSQVE08L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+VHLhu41uZyBUw61uPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+MDYvNy8yMDI2PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy1zdWNjZXNzIj7inIUgWG9uZzwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBzdHlsZT0iY29sb3I6I2JiYiI+4oCUPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij4zPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHJp4buDbiBraGFpIHRoaSBjw7RuZyBLOTggY8OhYyB0dXnhur9uIE4xLCBOMiwgTjMsIEQyLCBEMTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5UcuG7jW5nIFTDrW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5Ucm9uZyB0aMOhbmcgNzwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtd2FybmluZyI+4pqg77iPIMSQYW5nIHRyaeG7g24ga2hhaTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBzdHlsZT0iY29sb3I6I2RjMzU0NTtiYWNrZ3JvdW5kOiNmZmYzYjA7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6MnB4IDZweDtib3JkZXItcmFkaXVzOjRweCI+Q2jhuq1tIHRp4bq/biDEkeG7mTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+NDwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlThuq1wIGvhur90IEJhc2UgbG/huqFpIElJIMSR4bqhdCB+ODAlPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyb25nIHRow6FuZyA3PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIHN0eWxlPSJjb2xvcjojZGMzNTQ1O2JhY2tncm91bmQ6I2ZmZjNiMDtmb250LXdlaWdodDo3MDA7cGFkZGluZzoycHggNnB4O2JvcmRlci1yYWRpdXM6NHB4Ij5DaOG6rW0gdGnhur9uIMSR4buZPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij41PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+VHJp4buDbiBraGFpIGjhuqFuZyBt4bulYyB0aG/DoXQgbsaw4bubYyB0aOG6o2kgKFROVCkgdsOgIMSRaeG7h248L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+VHLhu41uZyBUw61uPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+QuG6r3QgxJHhuqd1IDE1Lzc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBjbGFzcz0ic3RhdHVzLWRhbmdlciI+4p2MIENoxrBhIHRyaeG7g24ga2hhaTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBzdHlsZT0iY29sb3I6I2RjMzU0NTtiYWNrZ3JvdW5kOiNmZmYzYjA7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6MnB4IDZweDtib3JkZXItcmFkaXVzOjRweCI+Q2jhuq1tIHRp4bq/biDEkeG7mTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+NjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyaeG7g24ga2hhaSBob8OgbiB0aGnhu4duIGjhuqFuZyBt4bulYyBj4buRbmcgaOG7mXAgcXVhIGvDqm5oPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhuq90IMSR4bqndSAyMC83PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy1kYW5nZXIiPuKdjCBDaMawYSB0cmnhu4NuIGtoYWk8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gc3R5bGU9ImNvbG9yOiNkYzM1NDU7YmFja2dyb3VuZDojZmZmM2IwO2ZvbnQtd2VpZ2h0OjcwMDtwYWRkaW5nOjJweCA2cHg7Ym9yZGVyLXJhZGl1czo0cHgiPkNo4bqtbSB0aeG6v24gxJHhu5k8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjc8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5Ucmnhu4NuIGtoYWkgaOG6oW5nIG3hu6VjIGjDoG8ga+G7uSB0aHXhuq10PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPkLhuq90IMSR4bqndSAxNS83PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIHN0eWxlPSJjb2xvcjojYmJiIj7igJQ8L3NwYW4+PC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+CiAgICAgICAgICAgICAgICA8dHI+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJzdHQiPjg8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5I4buTIHPGoSB0aGFuaCB0b8OhbiBs4bqnbiAyPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InVuaXQiPlRy4buNbmcgVMOtbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjAyLzcgdHLDrG5oIFRWR1M7IDE1LzcgeG9uZzwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtd2FybmluZyI+4pqg77iPIMSQYW5nIHRyaeG7g24ga2hhaTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBzdHlsZT0iY29sb3I6I2RjMzU0NTtiYWNrZ3JvdW5kOiNmZmYzYjA7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6MnB4IDZweDtib3JkZXItcmFkaXVzOjRweCI+Q2jhuq1tIHRp4bq/biDEkeG7mTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+OTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPktp4buDbSB0cmEsIHLDoCBzb8OhdCBs4bqhaSBo4buTIHPGoSB0aGnhur90IGvhur8gdsOgIGThu7EgdG/DoW48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+VHLhu41uZyBUw61uPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+MjAvNy8yMDI2PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy1zdWNjZXNzIj7inIUgWG9uZzwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBzdHlsZT0iY29sb3I6I2JiYiI+4oCUPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgICAgICAgICAgPHRyPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0ic3R0Ij4xMDwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRy4bqhbSBYTE5UOiBUcsOsbmggaOG7kyBzxqEgcGjDoXAgbMO9IFFMREEga2nhu4NtIHRyYTwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPSJ1bml0Ij5WLUdyZWVuPC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+MDIvNyB0csOsbmg7IDE1LzcgeG9uZzwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIGNsYXNzPSJzdGF0dXMtd2FybmluZyI+4pqg77iPIMSQYW5nIHRyaeG7g24ga2hhaTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD48c3BhbiBzdHlsZT0iY29sb3I6I2RjMzU0NTtiYWNrZ3JvdW5kOiNmZmYzYjA7Zm9udC13ZWlnaHQ6NzAwO3BhZGRpbmc6MnB4IDZweDtib3JkZXItcmFkaXVzOjRweCI+Q2jhuq1tIHRp4bq/biDEkeG7mTwvc3Bhbj48L3RkPgogICAgICAgICAgICAgICAgPC90cj4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9InN0dCI+MTE8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZD5UcuG6oW0gWExOVDogVGhpIGPDtG5nIHhvbmcgaOG6oW5nIG3hu6VjIGLhu4M8L3RkPgogICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz0idW5pdCI+Vi1HcmVlbjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPlRyb25nIHRow6FuZyA3PC90ZD4KICAgICAgICAgICAgICAgICAgICA8dGQ+PHNwYW4gY2xhc3M9InN0YXR1cy13YXJuaW5nIj7imqDvuI8gxJBhbmcgdHJp4buDbiBraGFpPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICAgICAgPHRkPjxzcGFuIHN0eWxlPSJjb2xvcjojZGMzNTQ1O2JhY2tncm91bmQ6I2ZmZjNiMDtmb250LXdlaWdodDo3MDA7cGFkZGluZzoycHggNnB4O2JvcmRlci1yYWRpdXM6NHB4Ij5DaOG6rW0gdGnhur9uIMSR4buZPC9zcGFuPjwvdGQ+CiAgICAgICAgICAgICAgICA8L3RyPgogICAgICAgIDwvdGJvZHk+CiAgICA8L3RhYmxlPgoKICAgIDxkaXYgY2xhc3M9ImdoaWNodSI+CiAgICAgICAgPGgzPkdoaSBjaMO6PC9oMz4KICAgICAgICA8dWw+PGxpPjxiPk3hu6VjIDMtVHJp4buDbiBraGFpIHRoaSBjw7RuZyBLOTggY8OhYyB0dXnhur9uIE4xLCBOMiwgTjMsIEQyLCBEMTo8L2I+IMSQw6MgdOG6rXAga+G6v3QgxJHhuqV0IMSR4buDIGzDqm4gbOG7m3AgdGnhur9wIEs5NSBjaG8gdHV54bq/biBEMiB2w6AgRDEuIFR1eSBuaGnDqm4gdGjhu51pIHRp4bq/dCBtxrBhIG7Dqm4gY2jGsGEgdHJp4buDbiBraGFpIHNhbiB2w6AgbHUgbMOobi48L2xpPjxsaT48Yj5N4bulYyA3LVRyaeG7g24ga2hhaSBo4bqhbmcgbeG7pWMgaMOgbyBr4bu5IHRodeG6rXQ6PC9iPiBDYW8gxJHhu5kgxJHDoG8gxJHhuqF0IHnDqnUgY+G6p3UgbmjGsG5nIG7hu4FuIEs4NSDihpIgY+G6p24gbHUgdGjDqm0sIMSR4bqvcCDEkcOhIGTEg20sIMSR4buVIGLDqiB0w7RuZyBsw7N0IHPhu5ttLjwvbGk+PGxpPjxiPk3hu6VjIDgtSOG7kyBzxqEgdGhhbmggdG/DoW4gbOG6p24gMjo8L2I+IE5ow6AgdGjhuqd1IHbDoCBUVkdTIMSRw6Mga8O9IHhvbmcgaOG7kyBzxqEsIMSRYW5nIGNodXnhu4NuIFFMREEuPC9saT48bGk+PGI+TeG7pWMgOS1LaeG7g20gdHJhLCByw6Agc2/DoXQgbOG6oWkgaOG7kyBzxqEgdGhp4bq/dCBr4bq/IHbDoCBk4buxIHRvw6FuOjwvYj4gxJDDoyBwaMOhdCBoaeG7h24gdsOgIMSR4buBIHh14bqldCA4IHbhuqVuIMSR4buBIHbhu4EgdGhp4bq/dCBr4bq/IGPhuqduIMSRaeG7gXUgY2jhu4luaC4gU+G6vSBiw6BuIGdp4bqjaSBwaMOhcCB0cm9uZyBo4buNcCBnaWFvIGJhbiB0aMOhbmcgOC48L2xpPjxsaT48Yj5N4bulYyAxMC1UcuG6oW0gWExOVDo8L2I+IFRWR1MgxJHDoyBrw70gaOG7kyBzxqEsIMSRYW5nIHRyw6xuaCBo4buTIHPGoSBwaMOhcCBsw70gUUxEQSBrw70uPC9saT48bGk+PGI+TeG7pWMgMTEtVHLhuqFtIFhMTlQ6IFRoaSBjw7RuZyB4b25nIGjhuqFuZyBt4bulYyBi4buDOjwvYj4gxJBhbmcgdGhpIGPDtG5nIGPDtG5nIHTDoWMgY+G7kXAgcGhhIHRow6BuaCBi4buDLjwvbGk+PC91bD4KICAgIDwvZGl2Pgo8L2Rpdj4KPC9ib2R5Pgo8L2h0bWw+" }
];
(function(){
  const sel=document.getElementById('bc-sel');
  baoCaoTuan.forEach((b,i)=>{const o=document.createElement('option');o.value=i;o.textContent=b.label;sel.appendChild(o);});
  const oNew=document.createElement('option'); oNew.value='new'; oNew.textContent='Kỳ 2 tháng 8/2026 (07/8–15/8) — có thể sửa'; sel.appendChild(oNew);
  sel.value='new';
})();
function b64ToHtml(b){const bin=atob(b);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new TextDecoder('utf-8').decode(arr);}
function renderBC(){
  const v=document.getElementById('bc-sel').value;
  if(v==='new'){
    document.getElementById('bc-frame').style.display='none';
    document.getElementById('bc2-wrap').style.display='block';
    bc2Render();
  } else {
    document.getElementById('bc2-wrap').style.display='none';
    document.getElementById('bc-frame').style.display='block';
    const b=baoCaoTuan[v];
    document.getElementById('bc-frame').srcdoc=b64ToHtml(b.b64);
  }
}

/* ===== TAB 7 (bổ sung): Kỳ 2 tháng 8/2026 (07/8-15/8) — bảng có thể chỉnh sửa =====
   Dữ liệu khởi tạo lấy từ Master KB v3, mục "Chỉ đạo của CĐT tại họp giao ban Tháng 7/2026 (04/8/2026)".
   Cấu trúc mỗi dòng: [Nội dung công việc, Đơn vị chủ trì, Deadline, Trạng thái, Ghi chú] */
const BC2_KEY = 'thaidao3_baocao_ky2t8_v01';
const bc2DataDefault = [
  ["Xác nhận: Tiến độ thi công tháng 7/2026 không đảm bảo theo kết luận họp 02/7/2026","CĐT (Bắc Hà)","04/8/2026","✅ Đã xác nhận","Tháng thứ 5 liên tiếp không đạt tiến độ (giao thông 50%, Base II 30%, thoát nước/điện/cống hộp chưa triển khai)"],
  ["TVTK gửi hồ sơ thiết kế bản đỏ (san nền, hào kỹ thuật, trạm XLNT)","Tư vấn thiết kế (TVTK)","07/8/2026","⚠️ Cần cập nhật","Mốc đã qua — chưa có xác nhận đã gửi hay chưa"],
  ["Bắt đầu triển khai thoát nước thải, điện, hào kỹ thuật","Trọng Tín","07/8/2026","⚠️ Cần cập nhật","Mốc đã qua — chưa có xác nhận đã bắt đầu"],
  ["Hoàn thiện đỉnh K98 các tuyến N1, N2, N3, D1, D2","Trọng Tín","Trong tháng 8","⚠️ Cần cập nhật","Chưa có báo cáo cập nhật kết quả"],
  ["Base B nhập đạt 80%","Trọng Tín","Trong tháng 8","⚠️ Cần cập nhật","Chưa có báo cáo cập nhật kết quả"],
  ["Tăng cường tối thiểu 1 máy ủi, 1 lu, 1 máy xúc + đất cấp 3 đắp K98","Trọng Tín","10/8/2026","🔴 Cần cập nhật","Mốc đã qua — điều kiện để CĐT quyết định ban hành văn bản họp kiểm điểm"],
  ["Hoàn thành hạng mục thoát nước mưa","Trọng Tín","12/8/2026","⚠️ Cần cập nhật","Mốc đã qua — chưa có xác nhận"],
  ["CĐT ban hành văn bản yêu cầu họp kiểm điểm tiến độ (nếu mục trên không đạt)","CĐT (Bắc Hà)","10/8/2026","🔴 Cần cập nhật","Điều khoản cảnh báo mới tại họp T7 — chưa rõ văn bản đã ban hành chưa"],
  ["Hoàn thành hạng mục cống hộp qua kênh","Trọng Tín","20/8/2026","⏳ Chưa đến hạn",""],
  ["Hoàn thiện toàn bộ hồ sơ thiết kế, dự toán điều chỉnh/bổ sung","Tư vấn thiết kế (TVTK)","24/8/2026","⏳ Chưa đến hạn",""],
  ["Trạm XLNT: tăng cường nhân công, máy móc, thiết bị bù tiến độ chậm","V-Green","Không nêu rõ","⚠️ Cần cập nhật","Đang chậm ~15 ngày do mưa; chưa có báo cáo kết quả tăng cường"]
];
let bc2Data = (function(){
  try{ const s = localStorage.getItem(BC2_KEY); if(s) return JSON.parse(s); }catch(e){}
  return bc2DataDefault.map(r=>r.slice());
})();
function bc2Save(showMsg){
  const rows=[...document.querySelectorAll('#bc2-tb tbody tr')];
  bc2Data = rows.map(tr=>[...tr.querySelectorAll('td[contenteditable]')].map(td=>td.innerText.trim()));
  try{
    localStorage.setItem(BC2_KEY, JSON.stringify(bc2Data));
    const st=document.getElementById('bc2-status');
    st.textContent='✔ Đã lưu lúc '+new Date().toLocaleTimeString('vi-VN');
    if(showMsg!==false) setTimeout(()=>{st.textContent='';},4000);
  }catch(e){ document.getElementById('bc2-status').textContent='⚠ Không lưu được: '+e.message; }
}
function bc2AddRow(){ bc2Data.push(['','','','','']); bc2Render(); bc2Save(false); }
function bc2DelRow(i){ if(confirm('Xóa dòng '+(i+1)+'?')){ bc2Data.splice(i,1); bc2Render(); bc2Save(false); } }
/* Quy tắc highlight màu chữ — áp dụng cùng logic đã dùng ở báo cáo Tuần 4 tháng 7
   (✅ Xong/Đã xác nhận = xanh; ⚠️ Đang triển khai/Cần cập nhật = cam; ❌/🔴 = đỏ; ⏳ Chưa đến hạn = xám) */
function bc2StatusStyle(text){
  const t=(text||'').trim();
  if(t.includes('✅')||/\bxong\b|đã xác nhận/i.test(t)) return 'color:#16a34a;font-weight:700';
  if(t.includes('🔴')) return 'color:#dc2626;font-weight:700';
  if(t.includes('❌')||/chưa triển khai/i.test(t)) return 'color:#dc2626;font-weight:700';
  if(t.includes('⚠️')||/cần cập nhật|đang triển khai/i.test(t)) return 'color:#f59e0b;font-weight:700';
  if(t.includes('⏳')||/chưa đến hạn/i.test(t)) return 'color:#64748b;font-weight:600';
  return 'color:#1e293b';
}
function bc2NoteStyle(text){
  const t=(text||'').trim();
  if(!t || t==='—') return 'color:#bbb;font-style:italic';
  if(/chậm|mốc đã qua|chưa có xác nhận|chưa có báo cáo|chưa rõ|cảnh báo/i.test(t)) return 'color:#dc2626;font-weight:600;background:#fff3b0;border-radius:4px';
  return 'color:#555';
}
function bc2Render(){
  const td='border:1px solid #94a3b8;padding:8px;vertical-align:top;font-size:13px';
  const rows = bc2Data.map((r,i)=>
    `<tr><td style="${td};text-align:center;background:#f1f5f9;width:4%">${i+1}</td>`+
    `<td contenteditable="true" style="${td};width:26%;background:#fffef5">${r[0]||''}</td>`+
    `<td contenteditable="true" style="${td};width:14%;background:#fffef5">${r[1]||''}</td>`+
    `<td contenteditable="true" style="${td};width:11%;background:#fffef5">${r[2]||''}</td>`+
    `<td contenteditable="true" style="${td};width:15%;background:#fffef5;${bc2StatusStyle(r[3])}">${r[3]||''}</td>`+
    `<td contenteditable="true" style="${td};width:24%;background:#fffef5;${bc2NoteStyle(r[4])}">${r[4]||''}</td>`+
    `<td style="${td};text-align:center;width:6%"><button class="btn" style="padding:2px 8px" onclick="bc2DelRow(${i})">🗑️</button></td></tr>`).join('');
  document.getElementById('bc2-tb').innerHTML = `
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#0f2a4a;color:#fff">
      <th style="border:1px solid #94a3b8;padding:8px">STT</th>
      <th style="border:1px solid #94a3b8;padding:8px">Nội dung công việc</th>
      <th style="border:1px solid #94a3b8;padding:8px">Đơn vị chủ trì</th>
      <th style="border:1px solid #94a3b8;padding:8px">Deadline</th>
      <th style="border:1px solid #94a3b8;padding:8px">Trạng thái</th>
      <th style="border:1px solid #94a3b8;padding:8px">Ghi chú</th>
      <th style="border:1px solid #94a3b8;padding:8px">Xóa</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  document.querySelectorAll('#bc2-tb td[contenteditable]').forEach(td=>{
    td.addEventListener('blur', ()=>bc2Save(true));
  });
}

/* ===== Mở toàn màn hình / In — sửa lỗi: hỗ trợ cả báo cáo cũ (iframe) lẫn Kỳ 2 (bảng có thể sửa) =====
   Ở chế độ toàn màn hình/in: bỏ nút Thêm dòng, Lưu, cột Xóa, và bỏ 2 dòng ghi chú hướng dẫn — chỉ hiển thị báo cáo sạch. */
function bc2CollectFromDOM(){
  const rows=[...document.querySelectorAll('#bc2-tb tbody tr')];
  return rows.map(tr=>[...tr.querySelectorAll('td[contenteditable]')].map(td=>td.innerText.trim()));
}
function bc2PrintHtml(){
  const data = bc2CollectFromDOM();
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const rows = data.map((r,i)=>`
    <tr>
      <td class="stt">${i+1}</td>
      <td>${esc(r[0])}</td>
      <td class="unit">${esc(r[1])}</td>
      <td>${esc(r[2])}</td>
      <td style="${bc2StatusStyle(r[3])}">${esc(r[3])}</td>
      <td style="${bc2NoteStyle(r[4])}">${esc(r[4])}</td>
    </tr>`).join('');
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Báo cáo Kỳ 2 tháng 8/2026 (07/8-15/8)</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f5f5f5; color:#333; line-height:1.6; padding:24px; }
.container { max-width:1440px; margin:0 auto; background:white; padding:48px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
.header { margin-bottom:19px; border-bottom:2px solid #007bff; padding-bottom:24px; }
.header h1 { font-size:31px; font-weight:600; color:#1a1a1a; margin-bottom:2px; }
.header p { font-size:18px; color:#666; margin:0; }
.btn-print-container { display:flex; justify-content:flex-end; margin-bottom:24px; }
.btn-print-pdf { background:#dc3545; color:#fff; border:none; padding:14px 29px; font-size:17px; font-weight:600; border-radius:6px; cursor:pointer; }
table { width:100%; border-collapse:collapse; margin-bottom:29px; font-size:17px; }
table thead { background:#f0f2f5; border-top:1px solid #ddd; border-bottom:2px solid #ddd; }
table th { padding:17px 14px; text-align:left; font-weight:600; color:#1a1a1a; }
table td { padding:17px 14px; border-bottom:1px solid #eee; vertical-align:top; }
table tbody tr:nth-child(even) { background:#fafbfc; }
.stt { text-align:center; width:50px; font-weight:600; color:#666; }
.unit { font-weight:500; color:#1a1a1a; }
@media print {
  @page { size: A4 landscape; margin: 2mm; }
  html, body { width: 293mm; height: 206mm; }
  body { padding: 0 !important; }
  .btn-print-container { display:none !important; }
  .container { max-width: 293mm !important; width: 293mm !important; padding: 5mm 10mm !important; box-shadow:none !important; border-radius:0 !important; }
  table { font-size: 12.6px !important; }
  table th, table td { padding: 8.4px 9.6px !important; }
}
</style>
</head>
<body>
<div class="btn-print-container"><button class="btn-print-pdf" onclick="window.print()">🖨️ In / Xuất PDF</button></div>
<div class="container">
  <div class="header">
    <h1><strong>BÁO CÁO THỰC HIỆN CÔNG VIỆC THEO HỌP GIAO BAN</strong></h1>
    <p>Kỳ 2 tháng 8/2026 (07/8/2026 – 15/8/2026)</p>
    <p>Dự án Khu Đô Thị Số 3 Xã Thái Đào (Nay Là Xã Tân Dĩnh, Tỉnh Bắc Ninh)</p>
  </div>
  <table>
    <thead><tr>
      <th style="width:5%">STT</th>
      <th style="width:28%">Nội dung công việc</th>
      <th style="width:14%">Đơn vị chủ trì</th>
      <th style="width:12%">Deadline</th>
      <th style="width:16%">Trạng thái</th>
      <th style="width:25%">Ghi chú</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
</body>
</html>`;
}
function bcOpenFull(){
  const v=document.getElementById('bc-sel').value;
  const w=window.open('','_blank');
  if(v==='new'){
    w.document.write(bc2PrintHtml());
  } else {
    const b=baoCaoTuan[v];
    w.document.write(b64ToHtml(b.b64));
  }
  w.document.close();
}
renderBC();

/* ===== KPI TAB GỘP: KHỐI LƯỢNG – NGHIỆM THU – THANH TOÁN (chạy theo bộ lọc) ===== */
function updateKPIg(f){
  const rows = hangMuc.filter(h=>!f||h.nt===f);
  const hd = (!f||f==='TT'?contracts.TT.giaTri:0)+(!f||f==='VG'?contracts.VG.giaTri:0);
  const sl = rows.reduce((s,h)=>s+(h.sanLuong||0),0);
  const nt = (!f||f==='TT'?(contracts.TT.nghiemThu||0):0)+(!f||f==='VG'?(contracts.VG.nghiemThu||0):0);
  const klht = (!f||f==='TT'?8919343000:0); /* Lũy kế thanh toán KLHT (PL3a lần 2, mục 6.2); V-Green chưa thanh toán */
  const gn = (!f||f==='TT'?(contracts.TT.giaiNgan||0):0)+(!f||f==='VG'?(contracts.VG.giaiNgan||0):0);
  document.getElementById('kg-hd').textContent = fmtTy(hd);
  document.getElementById('kg-hd-p').textContent = !f ? ('Trọng Tín '+fmtTy(contracts.TT.giaTri)+' + V-Green '+fmtTy(contracts.VG.giaTri))
    : (f==='TT' ? 'HĐ 1507/2025/HĐXD/BH-TT' : 'HĐ 68/2026/HĐKT/BH-VG');
  document.getElementById('kg-sl').textContent = fmtTy(sl);
  document.getElementById('kg-nt').textContent = fmtTy(nt);
  document.getElementById('kg-nt-p').textContent = pct(nt,hd).toFixed(1)+'% giá trị HĐ'+(f==='VG'?' (chưa có hồ sơ NT)':'');
  document.getElementById('kg-tt').textContent = fmtTy(klht);
  document.getElementById('kg-tt-p').textContent = pct(klht,hd).toFixed(1)+'% giá trị HĐ'+(f==='VG'?' (chưa thanh toán)':' · trả nhà thầu 8,50 tỷ');
  document.getElementById('kg-gn').textContent = fmtTy(gn);
  document.getElementById('kg-gn-p').textContent = pct(gn,hd).toFixed(1)+'% giá trị HĐ'+(f!=='VG'?' · gồm tạm ứng còn treo '+fmtTy(contracts.TT.tamUngConLai):'');
}

/* ===== TAB 9: VẤN ĐỀ XUẤT SINH VÀ GIẢI PHÁP =====
   Cập nhật dữ liệu: thêm mảng ["nội dung phát sinh","đơn vị chủ trì","giải pháp","trạng thái"] vào phuLucPhatSinh. */
const phuLucPhatSinh = [
  ["Hồ sơ điều chỉnh gối cống và chiều dài cống (thuộc hạng mục Thoát nước mưa)", "", "", "Chưa xong"],
  ["Sửa hồ sơ theo yêu cầu của kiểm toán", "", "", "Chưa xong"],
  ["GPMB nhà ông Ứng", "", "", "Chưa xong"],
  ["GPMB nhà ông Duy Mến", "", "", "Chưa xong"],
  ["Gói điện – phần đấu nối", "", "", "Chưa xong"]
];
const PS_KEY = 'thaidao3_phatsinh_v08';
let psData = (function(){
  try{ const s = localStorage.getItem(PS_KEY); if(s) return JSON.parse(s); }catch(e){}
  return phuLucPhatSinh.map(r=>r.slice());
})();
function psSave(showMsg){
  const rows=[...document.querySelectorAll('#ps-tb tbody tr')];
  psData = rows.map(tr=>[...tr.querySelectorAll('td[contenteditable]')].map(td=>td.innerText.trim()));
  try{
    localStorage.setItem(PS_KEY, JSON.stringify(psData));
    const st=document.getElementById('ps-status');
    st.textContent='✔ Đã lưu lúc '+new Date().toLocaleTimeString('vi-VN');
    if(showMsg!==false) setTimeout(()=>{st.textContent='';},4000);
  }catch(e){ document.getElementById('ps-status').textContent='⚠ Không lưu được: '+e.message; }
}
function psAddRow(){ psData.push(['','','','']); psRender(); psSave(false); }
function psDelRow(i){ if(confirm('Xóa dòng '+(i+1)+'?')){ psData.splice(i,1); psRender(); psSave(false); } }
function psRender(){
  const td='border:1px solid #94a3b8;padding:8px;vertical-align:top';
  const rows = psData.map((r,i)=>
    `<tr><td style="${td};text-align:center;background:#f1f5f9">${i+1}</td>`+
    r.map(v=>`<td contenteditable="true" style="${td};min-width:60px;background:#fffef5">${v||''}</td>`).join('')+
    `<td style="${td};text-align:center"><button class="btn" style="padding:2px 8px" onclick="psDelRow(${i})">🗑️</button></td></tr>`).join('');
  document.getElementById('ps-tb').innerHTML = `
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:#0f2a4a;color:#fff">
      <th style="border:1px solid #94a3b8;padding:8px;width:5%">Stt</th>
      <th style="border:1px solid #94a3b8;padding:8px;width:28%">Công việc phát sinh</th>
      <th style="border:1px solid #94a3b8;padding:8px;width:17%">Đơn vị chủ trì</th>
      <th style="border:1px solid #94a3b8;padding:8px;width:28%">Giải pháp</th>
      <th style="border:1px solid #94a3b8;padding:8px;width:16%">Trạng thái giải quyết</th>
      <th style="border:1px solid #94a3b8;padding:8px;width:6%">Xóa</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  document.querySelectorAll('#ps-tb td[contenteditable]').forEach(td=>{
    td.addEventListener('blur', ()=>psSave(true));
  });
}
psRender();

/* ================= NAV ================= */
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.getElementById(b.dataset.t).classList.add('active');
});
