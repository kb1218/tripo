(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("dashboard");
  const profile = await window.Tripo.getProfile();
  const verification = await window.Tripo.getVerificationStatus();
  const hostedResult = await window.Tripo.listTrips({ hostOnly: true });
  const joinedResult = await window.Tripo.listTrips({ joinedOnly: true });
  const publicResult = await window.Tripo.listTrips({});
  const insightResult = await window.Tripo.getProfileInsights();

  const hostedTrips = hostedResult.data || [];
  const joinedTrips = joinedResult.data || [];
  const upcomingTrips = (publicResult.data || []).slice(0, 3);
  const insights = insightResult.ok ? insightResult.data : {};

  mount.innerHTML = `
    <section class="hero-banner">
      <p class="eyebrow">Dashboard</p>
      <h1>Welcome back, ${window.Tripo.escapeHtml((profile?.full_name || "Traveler").split(" ")[0])}.</h1>
      <p>Your next travel crew is ready when you are.</p>
      <div class="hero-actions">
        <a class="button" href="trips.html">Discover trips</a>
        <a class="button button-secondary" href="create-trip.html">Create a trip</a>
      </div>
    </section>

    ${
      verification.isVerified
        ? ""
        : `
          <section class="app-panel">
            <p class="eyebrow">Action needed</p>
            <h3>Finish verification to unlock trip creation and joining</h3>
            <p>Email verified: ${verification.emailVerified ? "Yes" : "No"} | Phone verified: ${verification.phoneVerified ? "Yes" : "No"}</p>
            <a class="button" href="profile.html?verifyPhone=1">Open verification</a>
          </section>
        `
    }

    <section class="stat-grid">
      <article class="mini-card"><span class="metric">${hostedTrips.length}</span><p>Trips you host</p></article>
      <article class="mini-card"><span class="metric">${joinedTrips.length}</span><p>Trips you joined</p></article>
      <article class="mini-card"><span class="metric">${insights.safetyScore ?? profile?.safety_score ?? 50}</span><p>AI safety score</p></article>
    </section>

    <section class="card-grid">
      <article class="app-panel">
        <p class="eyebrow">Quick actions</p>
        <h3>Start using Tripo</h3>
        <div class="list-stack" style="margin-top:16px;">
          <div class="list-row"><span>Browse live trips</span><a class="button-link" href="trips.html">Open</a></div>
          <div class="list-row"><span>Create your own trip</span><a class="button-link" href="create-trip.html">Create</a></div>
          <div class="list-row"><span>Update profile</span><a class="button-link" href="profile.html">Profile</a></div>
        </div>
      </article>
      <article class="app-panel">
        <p class="eyebrow">AI profile summary</p>
        <h3>${window.Tripo.escapeHtml(insights.safetyHeadline || "How Tripo sees your style")}</h3>
        <p>${window.Tripo.escapeHtml(insights.summary || profile?.ai_summary || "Your AI-generated travel summary will appear here.")}</p>
      </article>
      <article class="app-panel">
        <p class="eyebrow">Profile</p>
        <h3>Your account</h3>
        <div class="list-stack" style="margin-top:16px;">
          <div class="list-row"><span>Name</span><strong>${window.Tripo.escapeHtml(profile?.full_name || "")}</strong></div>
          <div class="list-row"><span>Travel style</span><strong>${window.Tripo.escapeHtml(profile?.personality_style || "Balanced")}</strong></div>
          <div class="list-row"><span>Emergency contact</span><strong>${window.Tripo.escapeHtml(profile?.emergency_contact || "Not set")}</strong></div>
        </div>
      </article>
    </section>

    <section class="detail-grid">
      <article class="app-panel">
        <p class="eyebrow">AI trip planner</p>
        <h3>Build a shareable itinerary in seconds</h3>
        <form id="tripPlannerForm" class="stack-form" style="margin-top:14px;">
          <div class="form-grid">
            <label>City<input type="text" name="city" value="${window.Tripo.escapeHtml(profile?.city || "Pune")}" required></label>
            <label>Budget<input type="text" name="budget" placeholder="Under ₹1500" required></label>
          </div>
          <div class="form-grid">
            <label>Duration<input type="text" name="duration" placeholder="1 day" required></label>
            <label>Plan prompt<input type="text" name="prompt" placeholder="Plan a food and heritage day" required></label>
          </div>
          <button class="button" type="submit">Generate AI plan</button>
        </form>
        <div id="tripPlannerMessage"></div>
        <div id="tripPlannerOutput" class="list-stack" style="margin-top:16px;"></div>
      </article>

      <article class="app-panel">
        <p class="eyebrow">Explore</p>
        <h3>Recently available trips</h3>
        <div class="trip-grid">
          ${upcomingTrips.length ? upcomingTrips.map(renderTripCard).join("") : `<div class="empty-state"><h3>No trips yet</h3><p>Create the first trip from your account.</p></div>`}
        </div>
      </article>
    </section>
  `;

  document.querySelector("#tripPlannerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await window.Tripo.getTripPlan(
      formData.get("prompt"),
      formData.get("city"),
      formData.get("budget"),
      formData.get("duration")
    );

    if (!result.ok) {
      window.Tripo.flash(document.querySelector("#tripPlannerMessage"), "error", result.error);
      return;
    }

    window.Tripo.flash(document.querySelector("#tripPlannerMessage"), "success", "AI plan ready.");
    document.querySelector("#tripPlannerOutput").innerHTML = `
      <div class="list-row"><span>Headline</span><strong>${window.Tripo.escapeHtml(result.data.headline || "Trip plan")}</strong></div>
      ${(result.data.stops || []).map((stop) => `<div class="list-row"><span>${window.Tripo.escapeHtml(stop.time || "Stop")}</span><strong>${window.Tripo.escapeHtml(stop.title || stop)}</strong></div>`).join("")}
      <div class="list-row"><span>Budget summary</span><strong>${window.Tripo.escapeHtml(result.data.budget || formData.get("budget"))}</strong></div>
      <div class="list-row"><span>Share-ready summary</span><strong>${window.Tripo.escapeHtml(result.data.summary || "")}</strong></div>
    `;
  });
})();

function renderTripCard(trip) {
  const chipClass = trip.visibility === "women-only" ? "chip-women" : trip.visibility === "men-only" ? "chip-men" : "chip-safe";
  return `
    <article class="trip-item">
      <div class="trip-top">
        <span class="chip chip-interest">${window.Tripo.escapeHtml(trip.interest)}</span>
        <span class="chip ${chipClass}">${window.Tripo.visibilityLabel(trip.visibility)}</span>
      </div>
      <h3 class="trip-title">${window.Tripo.escapeHtml(trip.title)}</h3>
      <p>${window.Tripo.escapeHtml(trip.description)}</p>
      <div class="trip-meta-row">
        <span class="muted-line">${window.Tripo.formatDate(trip.trip_date)} &bull; ${window.Tripo.escapeHtml(trip.city)} to ${window.Tripo.escapeHtml(trip.destination)}</span>
        <strong>${window.Tripo.escapeHtml(trip.host_name)}</strong>
      </div>
      <div class="trip-actions">
        <a class="button" href="trip.html?id=${encodeURIComponent(trip.id)}">Open trip</a>
      </div>
    </article>
  `;
}
