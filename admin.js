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
          ${profilesResult.data.length ? profilesResult.data.map((profile) => `<div class="list-row"><span>${window.Tripo.escapeHtml(profile.full_name)} • ${window.Tripo.escapeHtml(profile.city)}</span><strong>${window.Tripo.escapeHtml(profile.phone)}</strong></div>`).join("") : `<div class="empty-state"><p>No users found.</p></div>`}
        </div>
      </article>

      <article class="app-panel">
        <p class="eyebrow">Trips</p>
        <div class="list-stack">
          ${tripsResult.data.length ? tripsResult.data.map((trip) => `<div class="list-row"><span>${window.Tripo.escapeHtml(trip.title)} • ${window.Tripo.escapeHtml(trip.city)}</span><a class="button-link" href="trip.html?id=${encodeURIComponent(trip.id)}">Open</a></div>`).join("") : `<div class="empty-state"><p>No trips found.</p></div>`}
        </div>
      </article>
    </section>

    <section class="app-panel">
      <p class="eyebrow">Reports</p>
      <div class="list-stack" style="margin-top:14px;">
        ${reportsResult.data.length ? reportsResult.data.map((report) => `<div class="list-row"><span>${window.Tripo.escapeHtml(report.reporter_name)}: ${window.Tripo.escapeHtml(report.issue)}</span><strong>${new Date(report.created_at).toLocaleDateString("en-IN")}</strong></div>`).join("") : `<div class="empty-state"><p>No reports submitted yet.</p></div>`}
      </div>
    </section>
  `;
})();
