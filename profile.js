(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("profile");
  const profile = await window.Tripo.getProfile();
  const user = await window.Tripo.getCurrentUser();
  const hostedResult = await window.Tripo.listTrips({ hostOnly: true });
  const joinedResult = await window.Tripo.listTrips({ joinedOnly: true });

  const hostedTrips = hostedResult.data || [];
  const joinedTrips = joinedResult.data || [];

  mount.innerHTML = `
    <section class="page-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Profile</p>
          <h2>Your account and privacy details</h2>
        </div>
      </div>

      <div class="profile-grid">
        <article class="app-panel stack-panel">
          <div class="profile-card-top"><strong>Name</strong><span>${window.Tripo.escapeHtml(profile?.full_name || "")}</span></div>
          <div class="profile-card-top"><strong>Email</strong><span>${window.Tripo.escapeHtml(user?.email || "")}</span></div>
          <div class="profile-card-top"><strong>Email status</strong><span>${user?.email_confirmed_at ? "Verified" : "Verification pending"}</span></div>
          <div class="profile-card-top"><strong>Phone</strong><span>${window.Tripo.escapeHtml(profile?.phone || "")}</span></div>
          <div class="profile-card-top"><strong>City</strong><span>${window.Tripo.escapeHtml(profile?.city || "")}</span></div>
          <div class="profile-card-top"><strong>Gender</strong><span>${window.Tripo.escapeHtml(profile?.gender || "")}</span></div>
          <div class="profile-card-top"><strong>Emergency contact</strong><span>${window.Tripo.escapeHtml(profile?.emergency_contact || "")}</span></div>
        </article>

        <article class="app-panel stack-panel">
          <div class="profile-card-top"><strong>Hosted trips</strong><span>${hostedTrips.length}</span></div>
          <div class="profile-card-top"><strong>Joined trips</strong><span>${joinedTrips.length}</span></div>
          <div class="profile-card-top"><strong>Who can edit your trips</strong><span>You only</span></div>
          <div class="profile-card-top"><strong>Who can read trip chat</strong><span>Members only</span></div>
          <div class="profile-card-top"><strong>Who can read your profile row</strong><span>You only</span></div>
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
            <label>Emergency contact<input type="text" name="emergencyContact" value="${window.Tripo.escapeHtml(profile?.emergency_contact || "")}" required></label>
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
      emergencyContact: formData.get("emergencyContact")
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
