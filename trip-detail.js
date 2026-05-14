(async () => {
  if (!(await window.Tripo.requireAuth())) {
    return;
  }

  const mount = await window.Tripo.mountShell("trip-detail");
  const params = new URLSearchParams(window.location.search);
  const tripId = params.get("id");

  if (!tripId) {
    mount.innerHTML = `<section class="app-panel empty-state"><h2>Trip missing</h2><p>No trip id was provided.</p></section>`;
    return;
  }

  await renderTripPage(tripId, mount);
})();

async function renderTripPage(tripId, mount) {
  const result = await window.Tripo.getTripDetails(tripId);

  if (!result.ok) {
    mount.innerHTML = `<section class="app-panel empty-state"><h2>Trip not found</h2><p>${window.Tripo.escapeHtml(result.error)}</p></section>`;
    return;
  }

  const { trip, isMember, participants, messages, reviews } = result.data;
  const user = await window.Tripo.getCurrentUser();
  const profile = await window.Tripo.getProfile();
  const isHost = trip.host_id === user.id;
  const chipClass = trip.visibility === "women-only" ? "chip-women" : trip.visibility === "men-only" ? "chip-men" : "chip-safe";
  const seatsLeft = Math.max(trip.seats - participants.length, 0);
  const emergencyPhone = window.Tripo.extractPhoneNumber(profile?.emergency_contact || "");
  const showLocationShare = profile?.gender === "Woman" || trip.visibility === "women-only";

  mount.innerHTML = `
    <section class="hero-banner">
      <p class="eyebrow">Trip detail</p>
      <h1>${window.Tripo.escapeHtml(trip.title)}</h1>
      <p>${window.Tripo.escapeHtml(trip.description)}</p>
      <div class="hero-actions">
        <span class="chip chip-interest">${window.Tripo.escapeHtml(trip.interest)}</span>
        <span class="chip ${chipClass}">${window.Tripo.visibilityLabel(trip.visibility)}</span>
      </div>
    </section>

    <section class="detail-grid">
      <article class="app-panel stack-panel">
        <div class="detail-meta-row"><strong>Host</strong><span>${window.Tripo.escapeHtml(trip.host_name)}</span></div>
        <div class="detail-meta-row"><strong>Route</strong><span>${window.Tripo.escapeHtml(trip.city)} to ${window.Tripo.escapeHtml(trip.destination)}</span></div>
        <div class="detail-meta-row"><strong>Date</strong><span>${window.Tripo.formatDate(trip.trip_date)}</span></div>
        <div class="detail-meta-row"><strong>Vibe</strong><span>${window.Tripo.escapeHtml(trip.vibe)}</span></div>
        <div class="detail-meta-row"><strong>Seats left</strong><span>${seatsLeft}</span></div>
        <div class="split-actions">
          <button id="joinTripBtn" class="button" type="button" ${isMember || seatsLeft === 0 ? "disabled" : ""}>
            ${isHost ? "You host this trip" : isMember ? "Already joined" : seatsLeft === 0 ? "Trip full" : "Join this trip"}
          </button>
          <button id="reviewTripBtn" class="button button-secondary" type="button" ${isMember ? "" : "disabled"}>Add review</button>
          ${isHost ? `<a class="button button-ghost" href="edit-trip.html?id=${encodeURIComponent(trip.id)}">Edit trip</a>` : ""}
          ${isHost ? `<button id="deleteTripBtn" class="button button-ghost" type="button">Delete trip</button>` : ""}
        </div>
      </article>

      <article class="app-panel">
        <p class="eyebrow">Privacy</p>
        ${
          isMember
            ? `
              <div class="list-stack">
                ${participants.map((participant) => `<div class="list-row"><span>${window.Tripo.escapeHtml(participant.member_name)}</span><strong>Member</strong></div>`).join("")}
              </div>
            `
            : `
              <div class="empty-state">
                <h3>Private participant list</h3>
                <p>Participants and chat are only visible after you join the trip.</p>
              </div>
            `
        }
      </article>
    </section>

    <section class="detail-grid">
      <article class="app-panel stack-panel">
        <div class="review-row">
          <div>
            <p class="eyebrow">Group chat</p>
            <h3>Members-only conversation</h3>
          </div>
          <span>${messages.length} messages</span>
        </div>
        ${
          isMember
            ? `
              <div id="chatLog" class="chat-log">${messages.map(renderMessage).join("") || `<div class="empty-state"><p>No messages yet.</p></div>`}</div>
              <div class="chat-compose">
                <input id="chatInput" type="text" placeholder="Write to the group">
                <button id="sendChatBtn" class="button button-secondary" type="button">Send</button>
              </div>
            `
            : `
              <div class="empty-state"><p>Join the trip to unlock the group chat.</p></div>
            `
        }
      </article>

      <article class="app-panel stack-panel">
        <div class="review-row">
          <div>
            <p class="eyebrow">Ratings</p>
            <h3>${window.Tripo.averageRating(reviews)} average</h3>
          </div>
          <span>${reviews.length} reviews</span>
        </div>
        <div class="list-stack">
          ${reviews.length ? reviews.map(renderReview).join("") : `<div class="empty-state"><p>No reviews yet.</p></div>`}
        </div>
      </article>
    </section>

    <section class="detail-grid">
      <article class="app-panel stack-panel">
        <div class="review-row">
          <div>
            <p class="eyebrow">Safety</p>
            <h3>Emergency support</h3>
          </div>
        </div>
        <div class="list-stack">
          <div class="list-row">
            <span>Your emergency contact</span>
            <div class="split-actions">
              <strong>${window.Tripo.escapeHtml(profile?.emergency_contact || "Not set")}</strong>
              ${emergencyPhone ? `<button id="callEmergencyContactBtn" class="button-link" type="button">Call contact</button>` : ""}
            </div>
          </div>
          <div class="list-row"><span>Emergency service</span><button id="call112Btn" class="button-link" type="button">Call 112</button></div>
          ${showLocationShare ? `<div class="list-row"><span>Women safety</span><button id="shareLocationBtn" class="button-link" type="button">Share location on WhatsApp</button></div>` : ""}
        </div>
      </article>

      <article class="app-panel stack-panel">
        <div class="review-row">
          <div>
            <p class="eyebrow">Report</p>
            <h3>Report an issue</h3>
          </div>
        </div>
        <form id="reportForm" class="stack-form">
          <label>Describe the issue<textarea name="issue" rows="4" placeholder="Describe the safety or behavior issue." required></textarea></label>
          <button class="button button-secondary" type="submit">Submit report</button>
        </form>
        <div id="reportMessage"></div>
      </article>
    </section>
  `;

  document.querySelector("#joinTripBtn")?.addEventListener("click", async () => {
    const joinResult = await window.Tripo.joinTrip(tripId);
    if (!joinResult.ok) {
      window.Tripo.showToast(joinResult.error);
      return;
    }
    window.Tripo.showToast("You joined the trip.");
    await renderTripPage(tripId, mount);
  });

  document.querySelector("#sendChatBtn")?.addEventListener("click", async () => {
    const input = document.querySelector("#chatInput");
    const text = input.value.trim();
    if (!text) {
      return;
    }
    const messageResult = await window.Tripo.addMessage(tripId, text);
    if (!messageResult.ok) {
      window.Tripo.showToast(messageResult.error);
      return;
    }
    await renderTripPage(tripId, mount);
  });

  document.querySelector("#reviewTripBtn")?.addEventListener("click", async () => {
    const rating = Number(window.prompt("Rate this trip from 1 to 5"));
    const body = window.prompt("Write a short review");
    if (!rating || rating < 1 || rating > 5 || !body?.trim()) {
      window.Tripo.showToast("Review cancelled.");
      return;
    }
    const reviewResult = await window.Tripo.addReview(tripId, rating, body);
    if (!reviewResult.ok) {
      window.Tripo.showToast(reviewResult.error);
      return;
    }
    window.Tripo.showToast("Review saved.");
    await renderTripPage(tripId, mount);
  });

  document.querySelector("#deleteTripBtn")?.addEventListener("click", async () => {
    if (!window.confirm("Delete this trip permanently?")) {
      return;
    }
    const deleteResult = await window.Tripo.deleteTrip(tripId);
    if (!deleteResult.ok) {
      window.Tripo.showToast(deleteResult.error);
      return;
    }
    window.location.href = "trips.html";
  });

  document.querySelector("#reportForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reportResult = await window.Tripo.reportTripIssue(tripId, formData.get("issue"));
    if (!reportResult.ok) {
      window.Tripo.flash(document.querySelector("#reportMessage"), "error", reportResult.error);
      return;
    }
    event.currentTarget.reset();
    window.Tripo.flash(document.querySelector("#reportMessage"), "success", "Report submitted.");
  });

  document.querySelector("#callEmergencyContactBtn")?.addEventListener("click", () => {
    if (!window.Tripo.callNumber(profile?.emergency_contact || "")) {
      window.Tripo.showToast("No valid emergency contact number found.");
    }
  });

  document.querySelector("#call112Btn")?.addEventListener("click", () => {
    window.Tripo.openEmergencyService();
  });

  document.querySelector("#shareLocationBtn")?.addEventListener("click", async () => {
    const shareResult = await window.Tripo.shareLocationOnWhatsApp(profile?.emergency_contact || "", trip.title);
    if (!shareResult.ok) {
      window.Tripo.showToast(shareResult.error);
    }
  });
}

function renderMessage(message) {
  return `<div class="chat-bubble"><strong>${window.Tripo.escapeHtml(message.author_name)}</strong><span>${window.Tripo.escapeHtml(message.content)}</span></div>`;
}

function renderReview(review) {
  return `<div class="list-row"><span>${window.Tripo.escapeHtml(review.author_name)}: ${window.Tripo.escapeHtml(review.body)}</span><strong>${review.rating}/5</strong></div>`;
}
