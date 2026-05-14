(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const admin = await window.Tripo.requireAdmin();
  const mount = await window.Tripo.mountShell("admin");

  if (!admin) {
    mount.innerHTML = `
      <section class="app-panel empty-state">
        <h2>Admin access required</h2>
        <p>Add your email to the <code>admin_users</code> table in Supabase to open the host/admin console.</p>
      </section>
    `;
    return;
  }

  const [profilesResult, tripsResult, reportsResult] = await Promise.all([
    window.Tripo.listAllProfiles(),
    window.Tripo.listAllTrips(),
    window.Tripo.listAllReports()
  ]);

  if (!profilesResult.ok || !tripsResult.ok || !reportsResult.ok) {
    mount.innerHTML = `
      <section class="app-panel empty-state">
        <h2>Unable to load admin data</h2>
        <p>${window.Tripo.escapeHtml(profilesResult.error || tripsResult.error || reportsResult.error || "Unknown error")}</p>
      </section>
    `;
    return;
  }

  mount.innerHTML = `
    <section class="hero-banner">
      <p class="eyebrow">Admin console</p>
      <h1>Host and moderation access</h1>
      <p>This view is for platform ownership, reports, user counts, and trip oversight.</p>
    </section>

    <section class="stat-grid">
      <article class="mini-card"><span class="metric">${profilesResult.data.length}</span><p>Total users</p></article>
      <article class="mini-card"><span class="metric">${tripsResult.data.length}</span><p>Total trips</p></article>
      <article class="mini-card"><span class="metric">${reportsResult.data.length}</span><p>Total reports</p></article>
    </section>

    <section class="detail-grid">
      <article class="app-panel">
        <p class="eyebrow">Users</p>
        <div class="list-stack">
          ${profilesResult.data.length ? profilesResult.data.map((profile) => `
            <div class="list-row">
              <span>${window.Tripo.escapeHtml(profile.full_name)} • ${window.Tripo.escapeHtml(profile.city)} • ${window.Tripo.escapeHtml(profile.emergency_contact || "No emergency contact")}</span>
              <div class="split-actions">
                ${window.Tripo.extractPhoneNumber(profile.emergency_contact || "") ? `<button class="button-link" data-contact-call="${profile.id}">Call contact</button>` : ""}
                <button class="button-link" data-call-112="${profile.id}">Call 112</button>
                <button class="button-link" data-profile-edit="${profile.id}">Edit</button>
                <button class="button-link" data-profile-delete="${profile.id}">Delete</button>
              </div>
            </div>
          `).join("") : `<div class="empty-state"><p>No users found.</p></div>`}
        </div>
      </article>

      <article class="app-panel">
        <p class="eyebrow">Trips</p>
        <div class="list-stack">
          ${tripsResult.data.length ? tripsResult.data.map((trip) => `
            <div class="list-row">
              <span>${window.Tripo.escapeHtml(trip.title)} • ${window.Tripo.escapeHtml(trip.city)}</span>
              <div class="split-actions">
                <a class="button-link" href="trip.html?id=${encodeURIComponent(trip.id)}">Open</a>
                <a class="button-link" href="edit-trip.html?id=${encodeURIComponent(trip.id)}">Edit</a>
                <button class="button-link" data-trip-delete="${trip.id}">Delete</button>
              </div>
            </div>
          `).join("") : `<div class="empty-state"><p>No trips found.</p></div>`}
        </div>
      </article>
    </section>

    <section class="app-panel">
      <p class="eyebrow">Reports</p>
      <div class="list-stack" style="margin-top:14px;">
        ${reportsResult.data.length ? reportsResult.data.map((report) => `
          <div class="list-row">
            <span>${window.Tripo.escapeHtml(report.reporter_name)}: ${window.Tripo.escapeHtml(report.issue)}</span>
            <div class="split-actions">
              <strong>${new Date(report.created_at).toLocaleDateString("en-IN")}</strong>
              <button class="button-link" data-report-delete="${report.id}">Delete</button>
            </div>
          </div>
        `).join("") : `<div class="empty-state"><p>No reports submitted yet.</p></div>`}
      </div>
    </section>
  `;

  bindAdminActions(mount, profilesResult.data, tripsResult.data);
})();

function bindAdminActions(mount, profiles, trips) {
  mount.querySelectorAll("[data-profile-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const profile = profiles.find((item) => item.id === button.dataset.profileEdit);
      if (!profile) {
        return;
      }
      const fullName = window.prompt("Full name", profile.full_name);
      if (!fullName) {
        return;
      }
      const city = window.prompt("City", profile.city);
      if (!city) {
        return;
      }
      const phone = window.prompt("Phone", profile.phone);
      if (!phone) {
        return;
      }
      const gender = window.prompt("Gender", profile.gender);
      if (!gender) {
        return;
      }
      const emergencyContact = window.prompt("Emergency contact", profile.emergency_contact);
      if (!emergencyContact) {
        return;
      }
      const result = await window.Tripo.adminUpdateProfile(profile.id, {
        fullName,
        city,
        phone,
        gender,
        emergencyContact
      });
      if (!result.ok) {
        window.Tripo.showToast(result.error);
        return;
      }
      window.location.reload();
    });
  });

  mount.querySelectorAll("[data-profile-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this user profile?")) {
        return;
      }
      const result = await window.Tripo.adminDeleteProfile(button.dataset.profileDelete);
      if (!result.ok) {
        window.Tripo.showToast(result.error);
        return;
      }
      window.location.reload();
    });
  });

  mount.querySelectorAll("[data-contact-call]").forEach((button) => {
    button.addEventListener("click", () => {
      const profile = profiles.find((item) => item.id === button.dataset.contactCall);
      if (!profile || !window.Tripo.callNumber(profile.emergency_contact || "")) {
        window.Tripo.showToast("No valid emergency contact number found.");
      }
    });
  });

  mount.querySelectorAll("[data-call-112]").forEach((button) => {
    button.addEventListener("click", () => {
      window.Tripo.openEmergencyService();
    });
  });

  mount.querySelectorAll("[data-trip-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this trip?")) {
        return;
      }
      const result = await window.Tripo.deleteTrip(button.dataset.tripDelete);
      if (!result.ok) {
        window.Tripo.showToast(result.error);
        return;
      }
      window.location.reload();
    });
  });

  mount.querySelectorAll("[data-report-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this report?")) {
        return;
      }
      const result = await window.Tripo.adminDeleteReport(button.dataset.reportDelete);
      if (!result.ok) {
        window.Tripo.showToast(result.error);
        return;
      }
      window.location.reload();
    });
  });
}
