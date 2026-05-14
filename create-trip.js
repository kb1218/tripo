(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("create-trip");
  mount.innerHTML = `
    <section class="app-panel page-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Create trip</p>
          <h2>Publish a new local plan</h2>
          <p>Create your trip as the host and manage it from your own account.</p>
        </div>
      </div>

      <form id="createTripForm" class="stack-form">
        <div class="form-grid">
          <label>Trip title<input type="text" name="title" placeholder="Sunrise trek" required></label>
          <label>Interest
            <select name="interest" required>
              <option value="Adventure">Adventure</option>
              <option value="Food">Food</option>
              <option value="Beach">Beach</option>
              <option value="Culture">Culture</option>
              <option value="Nature">Nature</option>
            </select>
          </label>
        </div>
        <div class="form-grid">
          <label>City<input type="text" name="city" placeholder="Pune" required></label>
          <label>Destination<input type="text" name="destination" placeholder="Trip destination" required></label>
        </div>
        <div class="form-grid">
          <label>Date<input type="date" name="date" required></label>
          <label>Seats<input type="number" name="seats" min="2" max="20" value="6" required></label>
        </div>
        <div class="form-grid">
          <label>Visibility
            <select name="visibility" required>
              <option value="mixed">Mixed group</option>
              <option value="women-only">Women only</option>
            </select>
          </label>
          <label>Trip vibe<input type="text" name="vibe" placeholder="Social, beginner friendly, budget-friendly" required></label>
        </div>
        <label>Description<textarea name="description" rows="5" placeholder="Describe the plan, pace, and who should join." required></textarea></label>
        <div class="split-actions">
          <button class="button" type="submit">Publish trip</button>
          <a class="button button-ghost" href="trips.html">Back to discover</a>
        </div>
      </form>
      <div id="createTripMessage"></div>
    </section>
  `;

  const dateInput = document.querySelector('input[name="date"]');
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  dateInput.value = defaultDate.toISOString().split("T")[0];

  document.querySelector("#createTripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await window.Tripo.createTrip({
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

    if (!result.ok) {
      window.Tripo.flash(document.querySelector("#createTripMessage"), "error", result.error);
      return;
    }

    window.Tripo.flash(document.querySelector("#createTripMessage"), "success", "Trip published.");
    setTimeout(() => {
      window.location.href = `trip.html?id=${encodeURIComponent(result.data.id)}`;
    }, 500);
  });
})();
