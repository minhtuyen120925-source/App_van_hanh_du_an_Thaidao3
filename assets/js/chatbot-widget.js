/* Khung chat nổi — gọi Edge Function "chatbot" (Supabase), không chứa key bí mật nào ở đây */
(function () {
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chatbot`;

  // Ảnh phiếu: thu nhỏ trước khi gửi cho nhanh và nhẹ (phiếu vẫn đọc rõ ở cỡ này)
  const MAX_SIDE = 1600;
  const MAX_BYTES = 600 * 1024;
  const MAX_PER_MESSAGE = 4;
  const MAX_PER_SLIP = 6;
  const TYPE_LABEL = { phieu: 'Phiếu', hoa_don: 'Hoá đơn', cot_bom: 'Cột bơm', bon: 'Bồn', kho: 'Kho', khac: 'Khác' };

  const style = document.createElement('style');
  style.textContent = `
    #cb-toggle{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;
      background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;border:none;cursor:pointer;
      font-size:26px;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:9999;display:flex;align-items:center;justify-content:center;
      transition:transform .15s}
    #cb-toggle:hover{transform:scale(1.06)}
    #cb-panel{position:fixed;right:22px;bottom:90px;width:380px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 110px);
      background:var(--card);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);display:none;
      flex-direction:column;overflow:hidden;z-index:9999;border:1px solid var(--line)}
    #cb-panel.open{display:flex}
    #cb-head{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;padding:12px 14px;
      display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    #cb-head b{font-size:14px}
    #cb-head span{font-size:11px;opacity:.8;display:block}
    #cb-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;padding:4px}
    #cb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}
    .cb-bubble{max-width:90%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap}
    .cb-bot{align-self:flex-start;background:#fff;border:1px solid var(--line);border-bottom-left-radius:2px}
    .cb-user{align-self:flex-end;background:var(--blue);color:#fff;border-bottom-right-radius:2px}
    .cb-error{align-self:flex-start;background:#fef2f2;border:1px solid var(--red);color:var(--red)}
    .cb-alert{border:2px solid var(--red);background:#fef2f2}
    .cb-warn{border:2px solid var(--orange);background:#fffbeb}
    .cb-typing{align-self:flex-start;background:#fff;border:1px solid var(--line);border-radius:12px;
      border-bottom-left-radius:2px;padding:10px 14px;display:flex;gap:4px}
    .cb-typing span{width:6px;height:6px;border-radius:50%;background:var(--gray);animation:cb-bounce 1.2s infinite ease-in-out}
    .cb-typing span:nth-child(2){animation-delay:.15s}
    .cb-typing span:nth-child(3){animation-delay:.3s}
    @keyframes cb-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
    .cb-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;white-space:normal}
    .cb-act{border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:8px;padding:6px 12px;
      font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit}
    .cb-act:hover{background:var(--sky)}
    .cb-act.ok{background:var(--green);border-color:var(--green);color:#fff}
    .cb-act.ok:hover{filter:brightness(.92)}
    .cb-act.no{color:var(--red);border-color:var(--red)}
    .cb-act:disabled{opacity:.5;cursor:not-allowed}
    .cb-imgs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px;white-space:normal}
    .cb-imgs.after{margin:10px 0 0}
    .cb-imgs figure{margin:0;text-align:center;font-size:10.5px;color:var(--gray)}
    .cb-imgs img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block}
    .cb-user .cb-imgs img{border-color:rgba(255,255,255,.6)}
    #cb-thumbs{display:none;gap:10px;padding:10px 12px 2px;overflow-x:auto;background:#fff;border-top:1px solid var(--line);flex-shrink:0}
    #cb-thumbs.has{display:flex}
    .cb-th{position:relative;flex-shrink:0}
    .cb-th img{width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block}
    .cb-th button{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:none;
      background:var(--red);color:#fff;font-size:11px;line-height:18px;cursor:pointer;padding:0}
    .cb-th.wait{width:56px;height:56px;border-radius:8px;border:1px dashed var(--gray);display:flex;
      align-items:center;justify-content:center;font-size:20px;color:var(--gray)}
    #cb-form{display:flex;gap:6px;padding:10px;border-top:1px solid var(--line);flex-shrink:0;background:#fff;align-items:center}
    #cb-thumbs.has + #cb-form{border-top:none}
    .cb-icon{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:16px;
      cursor:pointer;flex-shrink:0;padding:0;line-height:1}
    .cb-icon:hover{background:var(--sky)}
    .cb-icon:disabled{opacity:.5;cursor:not-allowed}
    #cb-input{flex:1;min-width:0;border:1px solid var(--line);border-radius:20px;padding:8px 14px;font-size:13px;outline:none;font-family:inherit}
    #cb-input:focus{border-color:var(--blue)}
    #cb-send{background:var(--blue);color:#fff;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;
      font-size:15px;flex-shrink:0}
    #cb-send:disabled{opacity:.5;cursor:not-allowed}
  `;
  document.head.appendChild(style);

  const toggle = document.createElement('button');
  toggle.id = 'cb-toggle';
  toggle.title = 'Hỏi trợ lý AI dự án';
  toggle.textContent = '💬';

  const panel = document.createElement('div');
  panel.id = 'cb-panel';
  panel.innerHTML = `
    <div id="cb-head">
      <div><b>🤖 Trợ lý AI Thái Đảo 3</b><span>Trả lời theo dữ liệu dự án · nhận phiếu nhập/xuất dầu</span></div>
      <button id="cb-close">✕</button>
    </div>
    <div id="cb-msgs"></div>
    <div id="cb-thumbs"></div>
    <form id="cb-form">
      <button type="button" class="cb-icon" id="cb-cam" title="Chụp ảnh phiếu (trên điện thoại sẽ mở camera)">📷</button>
      <button type="button" class="cb-icon" id="cb-gal" title="Chọn ảnh từ máy">🖼️</button>
      <input id="cb-input" type="text" placeholder="Hỏi hoặc báo phiếu dầu..." autocomplete="off" />
      <button id="cb-send" type="submit">➤</button>
    </form>
  `;

  // Hai ô chọn tệp ẩn: một ô mở camera sau (điện thoại), một ô chọn nhiều ảnh từ máy
  const fileCam = document.createElement('input');
  fileCam.type = 'file';
  fileCam.accept = 'image/*';
  fileCam.setAttribute('capture', 'environment');
  fileCam.hidden = true;
  const fileGal = document.createElement('input');
  fileGal.type = 'file';
  fileGal.accept = 'image/*';
  fileGal.multiple = true;
  fileGal.hidden = true;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);
  panel.appendChild(fileCam);
  panel.appendChild(fileGal);

  const msgs = panel.querySelector('#cb-msgs');
  const thumbsEl = panel.querySelector('#cb-thumbs');
  const form = panel.querySelector('#cb-form');
  const input = panel.querySelector('#cb-input');
  const sendBtn = panel.querySelector('#cb-send');
  const camBtn = panel.querySelector('#cb-cam');
  const galBtn = panel.querySelector('#cb-gal');

  // Bản nháp phiếu dầu đang chờ xác nhận + vài tin nhắn gần nhất (để chatbot hiểu câu trả lời ngắn)
  let pendingDraft = null;
  // Ảnh: "staged" = đã chọn, chưa gửi; "pendingImages" = đã gửi cho AI đọc, đang đính kèm bản nháp chờ xác nhận
  let staged = [];
  let pendingImages = [];
  // Ảnh đang được thu nhỏ (chưa vào "staged"); khi gửi phải đợi xong hết để không bỏ sót ảnh
  let staging = 0;
  let stagingChain = Promise.resolve();
  const history = [];

  function pushHistory(role, text) {
    history.push({ role, text: String(text).slice(0, 600) });
    if (history.length > 8) history.shift();
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function mdToHtml(str) {
    return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  const dataUrl = (img) => `data:${img.mime};base64,${img.data}`;

  function addBubble(text, cls) {
    const el = document.createElement('div');
    el.className = `cb-bubble ${cls}`;
    el.innerHTML = mdToHtml(text);
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  // Dãy ảnh nhỏ (có nhãn loại ảnh nếu có) đặt trong bong bóng chat
  function addImageRow(bubble, images, opts) {
    if (!images.length) return;
    const row = document.createElement('div');
    row.className = 'cb-imgs' + (opts && opts.after ? ' after' : '');
    images.forEach((img) => {
      const fig = document.createElement('figure');
      const im = document.createElement('img');
      im.src = dataUrl(img);
      im.alt = img.name || 'ảnh';
      fig.appendChild(im);
      if (opts && opts.labels) {
        const cap = document.createElement('figcaption');
        cap.textContent = TYPE_LABEL[img.loai] || 'Khác';
        fig.appendChild(cap);
      }
      row.appendChild(fig);
    });
    if (opts && opts.after) bubble.appendChild(row);
    else bubble.insertBefore(row, bubble.firstChild);
  }

  function addUserBubble(text, images) {
    const el = document.createElement('div');
    el.className = 'cb-bubble cb-user';
    if (text) el.innerHTML = mdToHtml(text);
    msgs.appendChild(el);
    addImageRow(el, images);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function addTyping() {
    const el = document.createElement('div');
    el.className = 'cb-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function clearActions() {
    msgs.querySelectorAll('.cb-actions').forEach((el) => el.remove());
  }

  // Đang bận (thu nhỏ ảnh / chờ máy chủ): khoá ô nhập và cả các nút Xác nhận/Sửa/Huỷ để không bấm chồng lên nhau
  function setBusy(busy) {
    input.disabled = busy;
    sendBtn.disabled = busy;
    camBtn.disabled = busy;
    galBtn.disabled = busy;
    msgs.querySelectorAll('.cb-actions button').forEach((b) => (b.disabled = busy));
    if (!busy) input.focus();
  }

  /* ---------- Ảnh: chọn, thu nhỏ, xem trước ---------- */

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  // Ảnh nào cũng đổi thành JPEG, cạnh dài tối đa MAX_SIDE, dung lượng tối đa ~MAX_BYTES
  async function fileToJpeg(file) {
    let src;
    try {
      src = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      src = await loadImage(file);
    }
    const sw = src.naturalWidth || src.width;
    const sh = src.naturalHeight || src.height;
    const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    c.fillStyle = '#fff';
    c.fillRect(0, 0, w, h);
    c.drawImage(src, 0, 0, w, h);
    if (src.close) src.close();
    let q = 0.82;
    let blob;
    do {
      blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
      q -= 0.1;
    } while (blob && blob.size > MAX_BYTES && q > 0.4);
    if (!blob) throw new Error('encode');
    const url = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
    const base = (file.name || 'anh').replace(/\.[^.]+$/, '') || 'anh';
    return { data: String(url).split(',')[1], mime: 'image/jpeg', name: `${base}.jpg`, size: blob.size, w, h };
  }

  function renderThumbs() {
    thumbsEl.innerHTML = '';
    thumbsEl.classList.toggle('has', staged.length > 0 || staging > 0);
    staged.forEach((img, i) => {
      const box = document.createElement('div');
      box.className = 'cb-th';
      const im = document.createElement('img');
      im.src = dataUrl(img);
      im.alt = img.name;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.title = 'Bỏ ảnh này';
      rm.textContent = '✕';
      rm.addEventListener('click', () => {
        staged.splice(i, 1);
        renderThumbs();
      });
      box.appendChild(im);
      box.appendChild(rm);
      thumbsEl.appendChild(box);
    });
    // Ô chờ cho những ảnh đang được thu nhỏ
    for (let k = 0; k < staging; k++) {
      const wait = document.createElement('div');
      wait.className = 'cb-th wait';
      wait.textContent = '⏳';
      thumbsEl.appendChild(wait);
    }
  }

  function stageFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || ''));
    if (!files.length) return stagingChain;
    const used = staged.length + staging;
    const room = Math.min(MAX_PER_MESSAGE - used, MAX_PER_SLIP - pendingImages.length - used);
    if (room <= 0) {
      addBubble(`Mỗi tin nhắn gửi tối đa ${MAX_PER_MESSAGE} ảnh và mỗi phiếu tối đa ${MAX_PER_SLIP} ảnh. Bạn bỏ bớt ảnh hoặc gửi ảnh đang chọn trước nhé.`, 'cb-bot');
      return stagingChain;
    }
    if (files.length > room) {
      addBubble(`Mình chỉ nhận thêm ${room} ảnh nữa cho lần này, các ảnh còn lại bạn gửi ở tin nhắn sau nhé.`, 'cb-bot');
    }
    const take = files.slice(0, room);
    staging += take.length;
    renderThumbs();
    stagingChain = stagingChain.then(async () => {
      for (const f of take) {
        try {
          staged.push(await fileToJpeg(f));
        } catch (err) {
          addBubble(`Không đọc được ảnh "${f.name || 'ảnh'}". Bạn thử chụp lại hoặc chọn ảnh khác (JPG/PNG) nhé.`, 'cb-error');
        }
        staging -= 1;
        renderThumbs();
      }
      input.focus();
    });
    return stagingChain;
  }

  camBtn.addEventListener('click', () => fileCam.click());
  galBtn.addEventListener('click', () => fileGal.click());
  [fileCam, fileGal].forEach((el) => el.addEventListener('change', () => {
    const files = Array.from(el.files || []); // chép ra trước khi xoá lựa chọn
    el.value = '';
    stageFiles(files);
  }));
  // Dán ảnh chụp màn hình (Ctrl+V) vào ô nhập
  input.addEventListener('paste', (e) => {
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      stageFiles(files);
    }
  });

  /* ---------- Gọi hàm chatbot ---------- */

  // Gọi hàm chatbot bằng phiên đăng nhập của người dùng
  async function callFunction(payload) {
    const { data: sessionData } = await db.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error('Chưa đăng nhập');
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = { error: `Máy chủ trả lời không đọc được (mã ${res.status}). Bạn thử lại giúp mình nhé.` };
    }
    return { ok: res.ok, data };
  }

  function friendlyError(err) {
    return err && err.message === 'Chưa đăng nhập'
      ? 'Phiên đăng nhập đã hết hạn, vui lòng tải lại trang và đăng nhập lại.'
      : 'Không kết nối được tới máy chủ. Kiểm tra lại mạng và thử lại nhé.';
  }

  // Nút Xác nhận / Sửa / Huỷ dưới bản nháp phiếu dầu (chỉ bản nháp mới nhất có nút)
  function addActions(bubble, canConfirm) {
    clearActions();
    const bar = document.createElement('div');
    bar.className = 'cb-actions';
    if (canConfirm) {
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'cb-act ok';
      okBtn.textContent = '✅ Xác nhận';
      okBtn.addEventListener('click', () => confirmDraft(bar));
      bar.appendChild(okBtn);
    }
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'cb-act';
    editBtn.textContent = '✏️ Sửa';
    editBtn.addEventListener('click', () => {
      addBubble('Bạn muốn sửa gì? Cứ nhắn cho mình, ví dụ: "đơn giá 19.500" hoặc "đồng hồ lần này 1210". Muốn thêm ảnh (ví dụ hoá đơn GTGT) thì bấm 📷 hoặc 🖼️. Mình sẽ cập nhật bản nháp.', 'cb-bot');
      input.focus();
    });
    bar.appendChild(editBtn);
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'cb-act no';
    cancelBtn.textContent = '✖ Huỷ';
    cancelBtn.addEventListener('click', () => {
      pendingDraft = null;
      pendingImages = [];
      clearActions();
      addBubble('Đã huỷ bản nháp — chưa lưu gì vào hệ thống.', 'cb-bot');
    });
    bar.appendChild(cancelBtn);
    bubble.appendChild(bar);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function confirmDraft(bar) {
    if (!pendingDraft) return;
    bar.querySelectorAll('button').forEach((b) => (b.disabled = true));
    setBusy(true);
    const typingEl = addTyping();
    try {
      const images = pendingImages.map((i) => ({ data: i.data, mime: i.mime, name: i.name, loai: i.loai }));
      const { ok, data } = await callFunction({ action: 'confirm', draft: pendingDraft, images });
      typingEl.remove();
      if (!ok) {
        bar.querySelectorAll('button').forEach((b) => (b.disabled = false));
        addBubble(data.error || 'Có lỗi xảy ra, thử lại giúp mình nhé.', 'cb-error');
        return;
      }
      pendingDraft = null;
      pendingImages = [];
      clearActions();
      // Cảnh báo sau khi lưu (vượt định mức, tồn kho âm) hiện viền đỏ; tiêu hao thấp bất thường viền cam
      const alertCls = data.canh_bao === 'vuot_dinh_muc' || data.canh_bao === 'ton_am' ? ' cb-alert' : data.canh_bao === 'thap_bat_thuong' ? ' cb-warn' : '';
      addBubble(data.answer, 'cb-bot' + alertCls);
      pushHistory('bot', data.answer);
    } catch (err) {
      typingEl.remove();
      bar.querySelectorAll('button').forEach((b) => (b.disabled = false));
      addBubble(friendlyError(err), 'cb-error');
    } finally {
      setBusy(false);
    }
  }

  let opened = false;
  toggle.addEventListener('click', () => {
    opened = !opened;
    panel.classList.toggle('open', opened);
    if (opened && !msgs.children.length) {
      addBubble('Chào bạn! Mình là trợ lý AI của dự án Thái Đảo 3.\nBạn có thể hỏi về hợp đồng, khối lượng, thanh toán, tiến độ — hoặc báo phiếu dầu, ví dụ:\n• nhập 2000 lít từ Công ty ABC, đơn giá 19.500\n• xuất 90 lít cho MAY-01, đồng hồ 1207,5, lái máy Lê Văn C\n• hoặc bấm 📷 chụp phiếu / cột bơm, mình sẽ đọc giúp.', 'cb-bot');
      input.focus();
    }
  });
  panel.querySelector('#cb-close').addEventListener('click', () => {
    opened = false;
    panel.classList.remove('open');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let text = input.value.trim();
    if (!text && !staged.length && !staging) return;
    setBusy(true);
    if (staging) {
      // Ảnh đang thu nhỏ: đợi xong hết rồi mới gửi, để không bỏ sót ảnh nào
      await stagingChain;
      text = input.value.trim();
    }
    if (!text && !staged.length) {
      setBusy(false);
      return;
    }

    const sending = staged.slice();
    const question = text || 'Đây là ảnh phiếu dầu, bạn đọc giúp mình.';
    addUserBubble(text, sending);
    input.value = '';
    staged = [];
    renderThumbs();
    const typingEl = addTyping();
    const sentHistory = history.slice();
    pushHistory('user', sending.length ? `${question} [kèm ${sending.length} ảnh]` : question);

    // Gửi lỗi thì trả ảnh và chữ về ô nhập để bấm gửi lại, không phải chọn lại từ đầu
    const restore = () => {
      staged = sending.concat(staged);
      renderThumbs();
      if (!input.value) input.value = text;
    };

    try {
      const { ok, data } = await callFunction({
        question,
        fuel: 1,
        history: sentHistory,
        draft: pendingDraft,
        images: sending.map((i) => ({ data: i.data, mime: i.mime, name: i.name })),
        attached_types: pendingImages.map((i) => i.loai),
      });
      typingEl.remove();
      if (!ok) {
        addBubble(data.error || 'Có lỗi xảy ra, thử lại giúp mình nhé.', 'cb-error');
        if (sending.length) restore();
      } else if (data.type === 'draft') {
        if (data.draft.new_draft) pendingImages = [];
        const types = data.draft.image_types || [];
        sending.forEach((img, k) => pendingImages.push({ ...img, loai: types[k] || 'phieu' }));
        pendingDraft = { kind: data.draft.kind, fields: data.draft.fields, khong_chac: data.draft.khong_chac || [] };
        const el = addBubble(data.answer, 'cb-bot');
        addImageRow(el, pendingImages, { after: true, labels: true });
        addActions(el, data.draft.can_confirm);
        pushHistory('bot', data.answer);
      } else if (data.type === 'huy') {
        pendingDraft = null;
        pendingImages = [];
        clearActions();
        addBubble(data.answer, 'cb-bot');
        pushHistory('bot', data.answer);
      } else {
        addBubble(data.answer, 'cb-bot');
        pushHistory('bot', data.answer);
      }
    } catch (err) {
      typingEl.remove();
      addBubble(friendlyError(err), 'cb-error');
      if (sending.length) restore();
    } finally {
      setBusy(false);
    }
  });
})();
