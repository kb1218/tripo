(async () => {
  if (!window.Tripo.hasBackendConfigured()) {
    document.querySelector(".auth-shell").innerHTML = `
      <img class="auth-logo" src="assets/tripo-logo.svg" alt="Tripo logo">
      <h1>Secure backend setup required</h1>
      <p>Add a full Supabase URL like <code>https://your-project.supabase.co</code> and your anon key in <code>config.js</code>, then run <code>supabase-schema.sql</code> in Supabase before deploying.</p>
    `;
    return;
  }

  try {
    const user = await window.Tripo.getCurrentUser();
    window.location.href = user ? "dashboard.html" : "login.html";
  } catch (error) {
    document.querySelector(".auth-shell").innerHTML = `
      <img class="auth-logo" src="assets/tripo-logo.svg" alt="Tripo logo">
      <h1>Startup error</h1>
      <p>${String(error && error.message ? error.message : error)}</p>
    `;
  }
})();
