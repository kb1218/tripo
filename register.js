(async () => {
  const registerForm = document.querySelector("#registerForm");
  const registerMessage = document.querySelector("#registerMessage");

  if (!window.Tripo.hasBackendConfigured()) {
    window.Tripo.flash(registerMessage, "error", "Backend setup is missing. Fill in config.js first.");
    registerForm.querySelectorAll("input, select, button").forEach((element) => {
      element.disabled = true;
    });
    return;
  }

  await window.Tripo.redirectAuthenticated();

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const result = await window.Tripo.signUp({
      fullName: formData.get("name"),
      city: formData.get("city"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      gender: formData.get("gender"),
      emergencyContact: formData.get("emergencyContact"),
      password: formData.get("password")
    });

    if (!result.ok) {
      window.Tripo.flash(registerMessage, "error", result.error);
      return;
    }

    if (result.requiresEmailVerification) {
      window.Tripo.flash(registerMessage, "success", result.message);
      return;
    }

    window.Tripo.flash(registerMessage, "success", "Account created. Opening your dashboard.");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 400);
  });
})();
