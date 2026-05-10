(async () => {
  const requestForm = document.querySelector("#requestResetForm");
  const updateForm = document.querySelector("#updatePasswordForm");
  const message = document.querySelector("#passwordMessage");

  if (!window.Tripo.hasBackendConfigured()) {
    window.Tripo.flash(message, "error", "Backend setup is missing. Fill in config.js first.");
    requestForm.querySelectorAll("input, button").forEach((element) => {
      element.disabled = true;
    });
    return;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const recoveryMode = hashParams.get("type") === "recovery";

  if (recoveryMode) {
    updateForm.style.display = "grid";
    requestForm.style.display = "none";
  }

  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(requestForm);
    const result = await window.Tripo.requestPasswordReset(formData.get("email"));

    if (!result.ok) {
      window.Tripo.flash(message, "error", result.error);
      return;
    }

    window.Tripo.flash(message, "success", "Reset link sent. Check your email.");
  });

  updateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(updateForm);
    const result = await window.Tripo.updatePassword(formData.get("password"));

    if (!result.ok) {
      window.Tripo.flash(message, "error", result.error);
      return;
    }

    window.Tripo.flash(message, "success", "Password updated. You can log in now.");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
  });
})();
