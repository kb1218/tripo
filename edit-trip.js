(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("trips");
  const params = new URLSearchParams(window.location.search);
  const tripId = params.get("id");

  if (!tripId) {
    mount.innerHTML = `<section class="app-panel empty-state"><h2>Trip missing</h2><p>No trip id was provided.</p></section>`;
    return;
  }

  const result = await window.Tripo.getTripRecord(tripId);
  const user = await window.Tripo.getCurrentUser();

  if (!result.ok) {
    mount.innerHTML = `<section class="app-panel empty-state"><h2>Unable to load trip</h2><p>${window.Tripo.escapeHtml(result.error)}</p></section>`;
    return;
  }

  if (result.data.host_id !== user.id) {
    mount.innerHTML = `<section class="app-panel empty-state"><h2>Access denied</h2><p>Only the trip host can edit this trip.</p></section>`;
    return;
  }

  const trip = result.data;
  mount.innerHTML = `
    <section class="app-panel page-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Edit trip</p>
          <h2>Update your trip details</h2>
          <p>These changes are restricted to the host account by Row Level Security.</p>
        </div>
      </div>

      <form id="editTripForm" class="stack-form">
        <div class="form-grid">
          <label>Trip title<input type="text" name="title" value="${window.Tripo.escapeHtml(trip.title)}" required></label>
          <label>Interest
            <select name="interest" required>
              ${["Adventure", "Food", "Beach", "Culture", "Nature"].map((option) => `<option value="${option}" ${trip.interest === option ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="form-grid">
          <label>City<input type="text" name="city" value="${window.Tripo.escapeHtml(trip.city)}" required></label>
          <label>Destination<input type="text" name="destination" value="${window.Tripo.escapeHtml(trip.destination)}" required></label>
        </div>
        <div class="form-grid">
          <label>Date<input type="date" name="date" value="${trip.trip_date}" required></label>
          <label>Seats<input type="number" name="seats" min="2" max="20" value="${trip.seats}" required></label>
        </div>
        <div class="form-grid">
          <label>Visibility
            <select name="visibility" required>
              <option value="mixed" ${trip.visibility === "mixed" ? "selected" : ""}>Mixed group</option>
              <option value="women-only" ${trip.visibility === "women-only" ? "selected" : ""}>Women only</option>
            </select>
          </label>
          <label>Trip vibe<input type="text" name="vibe" value="${window.Tripo.escapeHtml(trip.vibe)}" required></label>
        </div>
        <label>Description<textarea name="description" rows="5" required>${window.Tripo.escapeHtml(trip.description)}</textarea></label>
        <div class="split-actions">
          <button class="button" type="submit">Save changes</button>
          <a class="button button-ghost" href="trip.html?id=${encodeURIComponent(trip.id)}">Back to trip</a>
        </div>
      </form>
      <div id="editTripMessage"></div>
    </section>
  `;

  document.querySelector("#editTripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updateResult = await window.Tripo.updateTrip(tripId, {
      title: formData.get("title"),
      interest: formData.get("interest"),
      city: formData.get("city"),
      destination: formData.get("destination"),
      date: formData.get("date"),
      seats: formData.get("seats"),
      visibility: formData.get("visibility"),
      vibe: formData.get("vibe"),
      description: formData.get("description")
    });

    if (!updateResult.ok) {
      window.Tripo.flash(document.querySelector("#editTripMessage"), "error", updateResult.error);
      return;
    }

    window.Tripo.flash(document.querySelector("#editTripMessage"), "success", "Trip updated.");
    setTimeout(() => {
      window.location.href = `trip.html?id=${encodeURIComponent(tripId)}`;
    }, 500);
  });
})();
