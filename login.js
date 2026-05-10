(async () => {
  const loginForm = document.querySelector("#loginForm");
  const loginMessage = document.querySelector("#loginMessage");

  if (!window.Tripo.hasBackendConfigured()) {
    window.Tripo.flash(loginMessage, "error", "Backend setup is missing. Fill in config.js first.");
    loginForm.querySelectorAll("input, button").forEach((element) => {
      element.disabled = true;
    });
    return;
  }

  await window.Tripo.redirectAuthenticated();

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const result = await window.Tripo.signIn(formData.get("email"), formData.get("password"));

    if (!result.ok) {
      window.Tripo.flash(loginMessage, "error", result.error);
      return;
    }

    window.Tripo.flash(loginMessage, "success", "Login successful. Opening your dashboard.");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 400);
  });
})();
