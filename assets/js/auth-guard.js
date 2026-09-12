/* Gác cổng đăng nhập: chưa đăng nhập -> đá về trang login. Đã đăng nhập -> hiện email + nút đăng xuất (nếu trang có 2 phần tử này). */
(function () {
  const LOGIN_PATH = window.AUTH_LOGIN_PATH || 'login.html';

  function goToLogin() {
    window.location.replace(LOGIN_PATH);
  }

  async function bindUI(session) {
    const emailEl = document.getElementById('user-email');
    if (emailEl) emailEl.textContent = session.user.email;

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await db.auth.signOut();
        goToLogin();
      });
    }

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role === 'admin') adminLink.hidden = false;
    }
  }

  db.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) {
      goToLogin();
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => bindUI(data.session));
    } else {
      bindUI(data.session);
    }
  });

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') goToLogin();
  });
})();
