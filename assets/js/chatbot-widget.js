/* Khung chat nổi — gọi Edge Function "chatbot" (Supabase), không chứa key bí mật nào ở đây */
(function () {
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chatbot`;

  const style = document.createElement('style');
  style.textContent = `
    #cb-toggle{position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;
      background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;border:none;cursor:pointer;
      font-size:26px;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:9999;display:flex;align-items:center;justify-content:center;
      transition:transform .15s}
    #cb-toggle:hover{transform:scale(1.06)}
    #cb-panel{position:fixed;right:22px;bottom:90px;width:340px;max-width:calc(100vw - 32px);height:460px;
      background:var(--card);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);display:none;
      flex-direction:column;overflow:hidden;z-index:9999;border:1px solid var(--line)}
    #cb-panel.open{display:flex}
    #cb-head{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;padding:12px 14px;
      display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    #cb-head b{font-size:14px}
    #cb-head span{font-size:11px;opacity:.8;display:block}
    #cb-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;padding:4px}
    #cb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}
    .cb-bubble{max-width:85%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap}
    .cb-bot{align-self:flex-start;background:#fff;border:1px solid var(--line);border-bottom-left-radius:2px}
    .cb-user{align-self:flex-end;background:var(--blue);color:#fff;border-bottom-right-radius:2px}
    .cb-error{align-self:flex-start;background:#fef2f2;border:1px solid var(--red);color:var(--red)}
    .cb-typing{align-self:flex-start;background:#fff;border:1px solid var(--line);border-radius:12px;
      border-bottom-left-radius:2px;padding:10px 14px;display:flex;gap:4px}
    .cb-typing span{width:6px;height:6px;border-radius:50%;background:var(--gray);animation:cb-bounce 1.2s infinite ease-in-out}
    .cb-typing span:nth-child(2){animation-delay:.15s}
    .cb-typing span:nth-child(3){animation-delay:.3s}
    @keyframes cb-bounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
    #cb-form{display:flex;gap:6px;padding:10px;border-top:1px solid var(--line);flex-shrink:0;background:#fff}
    #cb-input{flex:1;border:1px solid var(--line);border-radius:20px;padding:8px 14px;font-size:13px;outline:none;font-family:inherit}
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
      <div><b>🤖 Trợ lý AI Thái Đảo 3</b><span>Trả lời dựa trên dữ liệu dự án</span></div>
      <button id="cb-close">✕</button>
    </div>
    <div id="cb-msgs"></div>
    <form id="cb-form">
      <input id="cb-input" type="text" placeholder="Nhập câu hỏi..." autocomplete="off" />
      <button id="cb-send" type="submit">➤</button>
    </form>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const msgs = panel.querySelector('#cb-msgs');
  const form = panel.querySelector('#cb-form');
  const input = panel.querySelector('#cb-input');
  const sendBtn = panel.querySelector('#cb-send');

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function mdToHtml(str) {
    return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  function addBubble(text, cls) {
    const el = document.createElement('div');
    el.className = `cb-bubble ${cls}`;
    el.innerHTML = mdToHtml(text);
    msgs.appendChild(el);
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

  let opened = false;
  toggle.addEventListener('click', () => {
    opened = !opened;
    panel.classList.toggle('open', opened);
    if (opened && !msgs.children.length) {
      addBubble('Chào bạn! Mình là trợ lý AI của dự án Thái Đảo 3. Bạn muốn hỏi gì về hợp đồng, khối lượng, thanh toán hay tiến độ?', 'cb-bot');
      input.focus();
    }
  });
  panel.querySelector('#cb-close').addEventListener('click', () => {
    opened = false;
    panel.classList.remove('open');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    addBubble(question, 'cb-user');
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    const typingEl = addTyping();

    try {
      const { data: sessionData } = await db.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        throw new Error('Chưa đăng nhập');
      }

      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      typingEl.remove();
      if (!res.ok) {
        addBubble(data.error || 'Có lỗi xảy ra, thử lại giúp mình nhé.', 'cb-error');
      } else {
        addBubble(data.answer, 'cb-bot');
      }
    } catch (err) {
      typingEl.remove();
      const msg = err && err.message === 'Chưa đăng nhập'
        ? 'Phiên đăng nhập đã hết hạn, vui lòng tải lại trang và đăng nhập lại.'
        : 'Không kết nối được tới máy chủ. Kiểm tra lại mạng và thử lại nhé.';
      addBubble(msg, 'cb-error');
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });
})();
