(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("dashboard");
  const profile = await window.Tripo.getProfile();
  const hostedResult = await window.Tripo.listTrips({ hostOnly: true });
  const joinedResult = await window.Tripo.listTrips({ joinedOnly: true });
  const publicResult = await window.Tripo.listTrips({});

  const hostedTrips = hostedResult.data || [];
  const joinedTrips = joinedResult.data || [];
  const upcomingTrips = (publicResult.data || []).slice(0, 3);

  mount.innerHTML = `
    <section class="hero-banner">
      <p class="eyebrow">Dashboard</p>
      <h1>Welcome back, ${window.Tripo.escapeHtml((profile?.full_name || "Traveler").split(" ")[0])}.</h1>
      <p>Your account is protected by real authentication and database rules, and your next travel crew is ready when you are.</p>
      <div class="hero-actions">
        <a class="button" href="trips.html">Discover trips</a>
        <a class="button button-secondary" href="create-trip.html">Create a trip</a>
      </div>
    </section>

    <section class="stat-grid">
      <article class="mini-card"><span class="metric">${hostedTrips.length}</span><p>Trips you host</p></article>
      <article class="mini-card"><span class="metric">${joinedTrips.length}</span><p>Trips you joined</p></article>
      <article class="mini-card"><span class="metric">${window.Tripo.escapeHtml(profile?.city || "City")}</span><p>Your local matching base</p></article>
    </section>

    <section class="card-grid">
      <article class="app-panel">
        <p class="eyebrow">Security</p>
        <h3>What now protects your data</h3>
        <div class="list-stack" style="margin-top:16px;">
          <div class="list-row"><span>Authentication</span><strong>Supabase Auth</strong></div>
          <div class="list-row"><span>Authorization</span><strong>Row Level Security</strong></div>
          <div class="list-row"><span>Seeded sample data</span><strong>Removed</strong></div>
        </div>
      </article>
      <article class="app-panel">
        <p class="eyebrow">Privacy</p>
        <h3>Trip chats and participant lists</h3>
        <div class="list-stack" style="margin-top:16px;">
          <div class="list-row"><span>Participants visible to</span><strong>Members and host only</strong></div>
          <div class="list-row"><span>Chat visible to</span><strong>Members and host only</strong></div>
          <div class="list-row"><span>Trip editing</span><strong>Host only</strong></div>
        </div>
      </article>
      <article class="app-panel">
        <p class="eyebrow">Account</p>
        <h3>Your protected profile</h3>
        <div class="list-stack" style="margin-top:16px;">
          <div class="list-row"><span>Email</span><strong>${window.Tripo.escapeHtml(profile?.email || "")}</strong></div>
          <div class="list-row"><span>Phone</span><strong>${window.Tripo.escapeHtml(profile?.phone || "")}</strong></div>
          <div class="list-row"><span>Emergency contact</span><strong>Stored per user</strong></div>
        </div>
      </article>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Explore</p>
          <h2>Recently available trips</h2>
        </div>
      </div>
      <div class="trip-grid">
        ${upcomingTrips.length ? upcomingTrips.map(renderTripCard).join("") : `<div class="empty-state"><h3>No trips yet</h3><p>The app is clean now. Create the first trip from your account.</p></div>`}
      </div>
    </section>
  `;
})();

function renderTripCard(trip) {
  const chipClass = trip.visibility === "women-only" ? "chip-women" : "chip-safe";
  return `
    <article class="trip-item">
      <div class="trip-top">
        <span class="chip chip-interest">${window.Tripo.escapeHtml(trip.interest)}</span>
        <span class="chip ${chipClass}">${window.Tripo.visibilityLabel(trip.visibility)}</span>
      </div>
      <h3 class="trip-title">${window.Tripo.escapeHtml(trip.title)}</h3>
      <p>${window.Tripo.escapeHtml(trip.description)}</p>
      <div class="trip-meta-row">
        <span class="muted-line">${window.Tripo.formatDate(trip.trip_date)} • ${window.Tripo.escapeHtml(trip.city)} to ${window.Tripo.escapeHtml(trip.destination)}</span>
        <strong>${window.Tripo.escapeHtml(trip.host_name)}</strong>
      </div>
      <div class="trip-actions">
        <a class="button" href="trip.html?id=${encodeURIComponent(trip.id)}">Open trip</a>
      </div>
    </article>
  `;
}
