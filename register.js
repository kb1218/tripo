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
      ageRange: formData.get("ageRange"),
      budgetBand: formData.get("budgetBand"),
      travelFrequency: formData.get("travelFrequency"),
      personalityStyle: formData.get("personalityStyle"),
      adventureLevel: formData.get("adventureLevel"),
      travelInterests: formData.get("travelInterests"),
      bio: formData.get("bio"),
      password: formData.get("password")
    });

    if (!result.ok) {
      window.Tripo.flash(registerMessage, "error", result.error);
      return;
    }

    if (result.requiresEmailVerification) {
      window.Tripo.flash(registerMessage, "success", `${result.message} After your first login, verify your phone with OTP from the Profile page.`);
      return;
    }

    const phoneVerification = await window.Tripo.startPhoneVerification(formData.get("phone"));
    window.Tripo.flash(
      registerMessage,
      "success",
      phoneVerification.ok
        ? "Account created. We sent a phone OTP too. Complete verification from your profile page."
        : "Account created. Open your profile page after login to verify your phone number."
    );
    setTimeout(() => {
      window.location.href = "profile.html?verifyPhone=1";
    }, 400);
  });
})();
