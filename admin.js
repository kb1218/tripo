(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("admin");
  const admin = await window.Tripo.requireAdmin();

  if (!admin) {
    mount.innerHTML = `
      <section class="app-panel empty-state">
        <h2>Admin access required</h2>
        <p>Add your email to the <code>admin_users</code> table in Supabase to open the host/admin console.</p>
      </section>
    `;
    return;
  }

  const state = {
    profiles: [],
    trips: [],
    reports: [],
    selectedProfileId: null,
    selectedTripId: null
  };

  await loadAdminData(state);
  renderAdmin(state, mount);
})();

async function loadAdminData(state) {
  const [profilesResult, tripsResult, reportsResult] = await Promise.all([
    window.Tripo.listAllProfiles(),
    window.Tripo.listAllTrips(),
    window.Tripo.listAllReports()
  ]);

  state.profiles = profilesResult.ok ? profilesResult.data : [];
  state.trips = tripsResult.ok ? tripsResult.data : [];
  state.reports = reportsResult.ok ? reportsResult.data : [];

  if (!state.selectedProfileId && state.profiles.length) {
    state.selectedProfileId = state.profiles[0].id;
  }
  if (!state.selectedTripId && state.trips.length) {
    state.selectedTripId = state.trips[0].id;
  }
}

function renderAdmin(state, mount) {
  const selectedProfile = state.profiles.find((profile) => profile.id === state.selectedProfileId) || null;
  const selectedTrip = state.trips.find((trip) => trip.id === state.selectedTripId) || null;

  mount.innerHTML = `
    <section class="hero-banner">
      <p class="eyebrow">Admin console</p>
      <h1>Platform overview</h1>
      <p>Manage users, trips, and reports from one place.</p>
    </section>

    <section class="stat-grid">
      <article class="mini-card"><span class="metric">${state.profiles.length}</span><p>Total users</p></article>
      <article class="mini-card"><span class="metric">${state.trips.length}</span><p>Total trips</p></article>
      <article class="mini-card"><span class="metric">${state.reports.length}</span><p>Total reports</p></article>
    </section>

    <section class="detail-grid">
      <article class="app-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Users</p>
            <h3>User table</h3>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Emergency contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.profiles.length ? state.profiles.map((profile) => `
                <tr class="${profile.id === state.selectedProfileId ? "is-selected-row" : ""}">
                  <td>${window.Tripo.escapeHtml(profile.full_name)}</td>
                  <td>${window.Tripo.escapeHtml(profile.city)}</td>
                  <td>${window.Tripo.escapeHtml(profile.emergency_contact || "Not set")}</td>
                  <td>
                    <div class="split-actions">
                      <button class="button-link" data-select-profile="${profile.id}">Edit</button>
                      ${window.Tripo.extractPhoneNumber(profile.emergency_contact || "") ? `<button class="button-link" data-call-contact="${profile.id}">Call contact</button>` : ""}
                      <button class="button-link" data-call-112="${profile.id}">Call 112</button>
                      <button class="button-link" data-delete-profile="${profile.id}">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join("") : `<tr><td colspan="4">No users found.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>

      <article class="app-panel">
        <p class="eyebrow">Edit user</p>
        ${selectedProfile ? `
          <form id="adminProfileForm" class="stack-form">
            <input type="hidden" name="id" value="${selectedProfile.id}">
            <label>Full name<input type="text" name="fullName" value="${window.Tripo.escapeHtml(selectedProfile.full_name)}" required></label>
            <label>City<input type="text" name="city" value="${window.Tripo.escapeHtml(selectedProfile.city)}" required></label>
            <label>Phone<input type="text" name="phone" value="${window.Tripo.escapeHtml(selectedProfile.phone)}" required></label>
            <label>Gender<input type="text" name="gender" value="${window.Tripo.escapeHtml(selectedProfile.gender)}" required></label>
            <label>Emergency contact<input type="text" name="emergencyContact" value="${window.Tripo.escapeHtml(selectedProfile.emergency_contact)}" required></label>
            <button class="button" type="submit">Save user</button>
          </form>
          <div id="adminProfileMessage"></div>
        ` : `<div class="empty-state"><p>Select a user to edit.</p></div>`}
      </article>
    </section>

    <section class="detail-grid">
      <article class="app-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Trips</p>
            <h3>Trip table</h3>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>City</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.trips.length ? state.trips.map((trip) => `
                <tr class="${trip.id === state.selectedTripId ? "is-selected-row" : ""}">
                  <td>${window.Tripo.escapeHtml(trip.title)}</td>
                  <td>${window.Tripo.escapeHtml(trip.city)}</td>
                  <td>${window.Tripo.visibilityLabel(trip.visibility)}</td>
                  <td>
                    <div class="split-actions">
                      <button class="button-link" data-select-trip="${trip.id}">Edit</button>
                      <a class="button-link" href="trip.html?id=${encodeURIComponent(trip.id)}">Open</a>
                      <button class="button-link" data-delete-trip="${trip.id}">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join("") : `<tr><td colspan="4">No trips found.</td></tr>`}
            </tbody>
          </table>
        </div>
      </article>

      <article class="app-panel">
        <p class="eyebrow">Edit trip</p>
        ${selectedTrip ? `
          <form id="adminTripForm" class="stack-form">
            <input type="hidden" name="id" value="${selectedTrip.id}">
            <label>Title<input type="text" name="title" value="${window.Tripo.escapeHtml(selectedTrip.title)}" required></label>
            <label>City<input type="text" name="city" value="${window.Tripo.escapeHtml(selectedTrip.city)}" required></label>
            <label>Destination<input type="text" name="destination" value="${window.Tripo.escapeHtml(selectedTrip.destination)}" required></label>
            <div class="form-grid">
              <label>Date<input type="date" name="date" value="${selectedTrip.trip_date}" required></label>
              <label>Seats<input type="number" name="seats" min="2" max="20" value="${selectedTrip.seats}" required></label>
            </div>
            <div class="form-grid">
              <label>Interest<input type="text" name="interest" value="${window.Tripo.escapeHtml(selectedTrip.interest)}" required></label>
              <label>Visibility
                <select name="visibility" required>
                  <option value="mixed" ${selectedTrip.visibility === "mixed" ? "selected" : ""}>Mixed group</option>
                  <option value="women-only" ${selectedTrip.visibility === "women-only" ? "selected" : ""}>Women only</option>
                  <option value="men-only" ${selectedTrip.visibility === "men-only" ? "selected" : ""}>Men only</option>
                </select>
              </label>
            </div>
            <label>Vibe<input type="text" name="vibe" value="${window.Tripo.escapeHtml(selectedTrip.vibe)}" required></label>
            <label>Description<textarea name="description" rows="4" required>${window.Tripo.escapeHtml(selectedTrip.description)}</textarea></label>
            <button class="button" type="submit">Save trip</button>
          </form>
          <div id="adminTripMessage"></div>
        ` : `<div class="empty-state"><p>Select a trip to edit.</p></div>`}
      </article>
    </section>

    <section class="app-panel">
      <p class="eyebrow">Reports</p>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Reporter</th>
              <th>Issue</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.reports.length ? state.reports.map((report) => `
              <tr>
                <td>${window.Tripo.escapeHtml(report.reporter_name)}</td>
                <td>${window.Tripo.escapeHtml(report.issue)}</td>
                <td>${new Date(report.created_at).toLocaleDateString("en-IN")}</td>
                <td><button class="button-link" data-delete-report="${report.id}">Delete</button></td>
              </tr>
            `).join("") : `<tr><td colspan="4">No reports submitted yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;

  bindAdminEvents(state, mount);
}

function bindAdminEvents(state, mount) {
  mount.querySelectorAll("[data-select-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProfileId = button.dataset.selectProfile;
      renderAdmin(state, mount);
    });
  });

  mount.querySelectorAll("[data-select-trip]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTripId = button.dataset.selectTrip;
      renderAdmin(state, mount);
    });
  });

  mount.querySelectorAll("[data-call-contact]").forEach((button) => {
    button.addEventListener("click", () => {
      const profile = state.profiles.find((item) => item.id === button.dataset.callContact);
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

  mount.querySelectorAll("[data-delete-profile]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this user profile?")) {
        return;
      }
      const result = await window.Tripo.adminDeleteProfile(button.dataset.deleteProfile);
      if (!result.ok) {
        window.Tripo.showToast(result.error);
        return;
      }
      state.profiles = state.profiles.filter((item) => item.id !== button.dataset.deleteProfile);
      if (state.selectedProfileId === button.dataset.deleteProfile) {
        state.selectedProfileId = state.profiles[0]?.id || null;
      }
      renderAdmin(state, mount);
    });
  });

  mount.querySelectorAll("[data-delete-trip]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this trip?")) {
        return;
      }
      const result = await window.Tripo.deleteTrip(button.dataset.deleteTrip);
      if (!result.ok) {
        window.Tripo.showToast(result.error);
        return;
      }
      state.trips = state.trips.filter((item) => item.id !== button.dataset.deleteTrip);
      if (state.selectedTripId === button.dataset.deleteTrip) {
        state.selectedTripId = state.trips[0]?.id || null;
      }
      renderAdmin(state, mount);
    });
  });

  mount.querySelectorAll("[data-delete-report]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this report?")) {
        return;
      }
      const result = await window.Tripo.adminDeleteReport(button.dataset.deleteReport);
      if (!result.ok) {
        window.Tripo.showToast(result.error);
        return;
      }
      state.reports = state.reports.filter((item) => item.id !== button.dataset.deleteReport);
      renderAdmin(state, mount);
    });
  });

  mount.querySelector("#adminProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await window.Tripo.adminUpdateProfile(formData.get("id"), {
      fullName: formData.get("fullName"),
      city: formData.get("city"),
      phone: formData.get("phone"),
      gender: formData.get("gender"),
      emergencyContact: formData.get("emergencyContact")
    });
    if (!result.ok) {
      window.Tripo.flash(document.querySelector("#adminProfileMessage"), "error", result.error);
      return;
    }
    state.profiles = state.profiles.map((item) => (item.id === result.data.id ? result.data : item));
    window.Tripo.flash(document.querySelector("#adminProfileMessage"), "success", "User updated.");
    renderAdmin(state, mount);
  });

  mount.querySelector("#adminTripForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await window.Tripo.adminUpdateTrip(formData.get("id"), {
      title: formData.get("title"),
      city: formData.get("city"),
      destination: formData.get("destination"),
      date: formData.get("date"),
      seats: formData.get("seats"),
      interest: formData.get("interest"),
      visibility: formData.get("visibility"),
      vibe: formData.get("vibe"),
      description: formData.get("description")
    });
    if (!result.ok) {
      window.Tripo.flash(document.querySelector("#adminTripMessage"), "error", result.error);
      return;
    }
    state.trips = state.trips.map((item) => (item.id === result.data.id ? result.data : item));
    window.Tripo.flash(document.querySelector("#adminTripMessage"), "success", "Trip updated.");
    renderAdmin(state, mount);
  });
}
