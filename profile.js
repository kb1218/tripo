(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("profile");
  const profile = await window.Tripo.getProfile();
  const user = await window.Tripo.getCurrentUser();
  const hostedResult = await window.Tripo.listTrips({ hostOnly: true });
  const joinedResult = await window.Tripo.listTrips({ joinedOnly: true });
  const insightResult = await window.Tripo.getProfileInsights();
  const verification = await window.Tripo.getVerificationStatus();

  const hostedTrips = hostedResult.data || [];
  const joinedTrips = joinedResult.data || [];
  const insights = insightResult.ok ? insightResult.data : {};

  mount.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Profile</p>
          <h2>Your account and travel identity</h2>
        </div>
      </div>

      <div class="profile-grid">
        <article class="app-panel stack-panel">
          <div class="profile-card-top"><strong>Name</strong><span>${window.Tripo.escapeHtml(profile?.full_name || "")}</span></div>
          <div class="profile-card-top"><strong>Email</strong><span>${window.Tripo.escapeHtml(user?.email || "")}</span></div>
          <div class="profile-card-top"><strong>Email status</strong><span>${verification.emailVerified ? "Verified" : "Verification pending"}</span></div>
          <div class="profile-card-top"><strong>Phone</strong><span>${window.Tripo.escapeHtml(profile?.phone || "")}</span></div>
          <div class="profile-card-top"><strong>City</strong><span>${window.Tripo.escapeHtml(profile?.city || "")}</span></div>
          <div class="profile-card-top"><strong>Emergency contact</strong><span>${window.Tripo.escapeHtml(profile?.emergency_contact || "")}</span></div>
        </article>

        <article class="app-panel stack-panel">
          <div class="profile-card-top"><strong>Hosted trips</strong><span>${hostedTrips.length}</span></div>
          <div class="profile-card-top"><strong>Joined trips</strong><span>${joinedTrips.length}</span></div>
          <div class="profile-card-top"><strong>AI safety score</strong><span>${insights.safetyScore ?? profile?.safety_score ?? 50}/100</span></div>
          <div class="profile-card-top"><strong>Travel style</strong><span>${window.Tripo.escapeHtml(profile?.personality_style || "Balanced")}</span></div>
          <div class="profile-card-top"><strong>Budget band</strong><span>${window.Tripo.escapeHtml(profile?.budget_band || "Budget")}</span></div>
          <div class="profile-card-top"><strong>Adventure level</strong><span>${window.Tripo.escapeHtml(String(profile?.adventure_level || 3))}/5</span></div>
        </article>
      </div>

      <div class="detail-grid">
        <article class="app-panel stack-panel">
          <p class="eyebrow">Verification</p>
          <h3>Keep your account ready</h3>
          <p>${verification.isVerified ? "Your account is verified for trip creation, joining, and safety-based matching." : "Verify your email to unlock trip creation and joining."}</p>
          <div class="list-stack">
            <div class="list-row"><span>Email verification</span><strong>${verification.emailVerified ? "Done" : "Pending"}</strong></div>
            <div class="list-row"><span>Phone</span><strong>Saved for safety contact use</strong></div>
          </div>
          ${
            verification.emailVerified
              ? `<div class="flash flash-success">Your email verification is complete.</div>`
              : `<div class="flash flash-error">Open the verification email from Tripo, then log in again once it is confirmed.</div>`
          }
        </article>

        <article class="app-panel stack-panel">
          <p class="eyebrow">AI summary</p>
          <h3>${window.Tripo.escapeHtml(insights.safetyHeadline || "Your traveler summary")}</h3>
          <p>${window.Tripo.escapeHtml(insights.summary || profile?.ai_summary || "Your AI travel profile will appear here after your account is analyzed.")}</p>
          <div class="list-stack">
            ${(insights.highlights || []).map((item) => `<div class="list-row"><span>${window.Tripo.escapeHtml(item)}</span><strong>AI</strong></div>`).join("")}
          </div>
        </article>
      </div>

      <div class="detail-grid">
        <article class="app-panel">
          <p class="eyebrow">Edit your profile</p>
          <form id="profileForm" class="stack-form" style="margin-top:14px;">
            <div class="form-grid">
              <label>Full name<input type="text" name="fullName" value="${window.Tripo.escapeHtml(profile?.full_name || "")}" required></label>
              <label>City<input type="text" name="city" value="${window.Tripo.escapeHtml(profile?.city || "")}" required></label>
            </div>
            <div class="form-grid">
              <label>Phone<input type="text" name="phone" value="${window.Tripo.escapeHtml(profile?.phone || "")}" required></label>
              <label>Gender
                <select name="gender" required>
                  ${["Woman", "Man", "Non-binary", "Prefer not to say"].map((option) => `<option value="${option}" ${profile?.gender === option ? "selected" : ""}>${option}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="form-grid">
              <label>Age range
                <select name="ageRange" required>
                  ${["18-24", "25-34", "35-44", "45+"].map((option) => `<option value="${option}" ${profile?.age_range === option ? "selected" : ""}>${option}</option>`).join("")}
                </select>
              </label>
              <label>Budget band
                <select name="budgetBand" required>
                  ${["Budget", "Mid-range", "Premium"].map((option) => `<option value="${option}" ${profile?.budget_band === option ? "selected" : ""}>${option}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="form-grid">
              <label>Travel frequency
                <select name="travelFrequency" required>
                  ${["Rarely", "Occasional", "Monthly", "Frequent"].map((option) => `<option value="${option}" ${profile?.travel_frequency === option ? "selected" : ""}>${option}</option>`).join("")}
                </select>
              </label>
              <label>Personality style
                <select name="personalityStyle" required>
                  ${["Calm", "Balanced", "Outgoing", "Spontaneous"].map((option) => `<option value="${option}" ${profile?.personality_style === option ? "selected" : ""}>${option}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="form-grid">
              <label>Adventure level<input type="range" name="adventureLevel" min="1" max="5" value="${Number(profile?.adventure_level || 3)}"></label>
              <label>Travel interests<input type="text" name="travelInterests" value="${window.Tripo.escapeHtml(profile?.travel_interests || "")}" required></label>
            </div>
            <label>Emergency contact<input type="text" name="emergencyContact" value="${window.Tripo.escapeHtml(profile?.emergency_contact || "")}" required></label>
            <label>Bio<textarea name="bio" rows="4" required>${window.Tripo.escapeHtml(profile?.bio || "")}</textarea></label>
            <button class="button" type="submit">Save profile</button>
          </form>
          <div id="profileMessage"></div>
        </article>
        <article class="app-panel">
          <p class="eyebrow">Trips you host</p>
          <div class="list-stack">
            ${hostedTrips.length ? hostedTrips.map(renderTripLink).join("") : `<div class="empty-state"><p>You have not created a trip yet.</p></div>`}
          </div>
        </article>
        <article class="app-panel">
          <p class="eyebrow">Trips you joined</p>
          <div class="list-stack">
            ${joinedTrips.length ? joinedTrips.map(renderTripLink).join("") : `<div class="empty-state"><p>You have not joined a trip yet.</p></div>`}
          </div>
        </article>
      </div>
    </section>
  `;

  document.querySelector("#profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updateResult = await window.Tripo.updateProfile({
      fullName: formData.get("fullName"),
      city: formData.get("city"),
      phone: formData.get("phone"),
      gender: formData.get("gender"),
      emergencyContact: formData.get("emergencyContact"),
      ageRange: formData.get("ageRange"),
      budgetBand: formData.get("budgetBand"),
      travelFrequency: formData.get("travelFrequency"),
      personalityStyle: formData.get("personalityStyle"),
      adventureLevel: formData.get("adventureLevel"),
      travelInterests: formData.get("travelInterests"),
      bio: formData.get("bio")
    });

    if (!updateResult.ok) {
      window.Tripo.flash(document.querySelector("#profileMessage"), "error", updateResult.error);
      return;
    }

    window.Tripo.flash(document.querySelector("#profileMessage"), "success", "Profile updated.");
  });
})();

function renderTripLink(trip) {
  return `<div class="list-row"><span>${window.Tripo.escapeHtml(trip.title)}</span><a class="button-link" href="trip.html?id=${encodeURIComponent(trip.id)}">Open</a></div>`;
}
