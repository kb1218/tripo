(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("trips");
  mount.innerHTML = `
    <section class="app-panel page-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Discover</p>
          <h2>Browse local trips</h2>
          <p>Only authenticated users can browse, and only verified users can create or join trips.</p>
        </div>
        <a class="button" href="create-trip.html">Create trip</a>
      </div>

      <div class="filter-grid">
        <label>Search<input id="searchInput" type="search" placeholder="Search destination, title, or vibe"></label>
        <label>City<select id="cityFilter"></select></label>
        <label>Interest<select id="interestFilter"></select></label>
        <label>Visibility
          <select id="visibilityFilter">
            <option value="all">All visibility types</option>
            <option value="mixed">Mixed group</option>
            <option value="women-only">Women only</option>
            <option value="men-only">Men only</option>
          </select>
        </label>
      </div>

      <div id="tripResults" class="trip-grid"></div>
    </section>
  `;

  fillSelect(document.querySelector("#cityFilter"), await window.Tripo.getCities());
  fillSelect(document.querySelector("#interestFilter"), await window.Tripo.getInterests());

  ["#searchInput", "#cityFilter", "#interestFilter", "#visibilityFilter"].forEach((selector) => {
    const element = document.querySelector(selector);
    element.addEventListener("input", renderTrips);
    element.addEventListener("change", renderTrips);
  });

  await renderTrips();
})();

function fillSelect(select, values) {
  select.innerHTML = `<option value="all">All</option>${values
    .map((value) => `<option value="${window.Tripo.escapeHtml(value)}">${window.Tripo.escapeHtml(value)}</option>`)
    .join("")}`;
}

async function renderTrips() {
  const results = document.querySelector("#tripResults");
  const tripResult = await window.Tripo.listTrips({
    search: document.querySelector("#searchInput").value,
    city: document.querySelector("#cityFilter").value,
    interest: document.querySelector("#interestFilter").value,
    visibility: document.querySelector("#visibilityFilter").value
  });

  if (!tripResult.ok) {
    results.innerHTML = `<div class="empty-state"><h3>Unable to load trips</h3><p>${window.Tripo.escapeHtml(tripResult.error)}</p></div>`;
    return;
  }

  results.innerHTML = tripResult.data.length
    ? tripResult.data.map(renderTripCard).join("")
    : `<div class="empty-state"><h3>No trips yet</h3><p>Create the first trip from a verified account.</p></div>`;
}

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
        <a class="button" href="trip.html?id=${encodeURIComponent(trip.id)}">View trip</a>
      </div>
    </article>
  `;
}
