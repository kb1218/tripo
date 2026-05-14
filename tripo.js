(function () {
  const LEGACY_KEYS = ["tripo-users-v2", "tripo-session-v2", "tripo-trips-v2"];
  const config = window.TRIPO_CONFIG || {};
  const configured =
    Boolean(config.supabaseUrl) &&
    Boolean(config.supabaseAnonKey) &&
    /^https?:\/\//i.test(String(config.supabaseUrl)) &&
    !String(config.supabaseUrl).includes("YOUR_") &&
    !String(config.supabaseAnonKey).includes("YOUR_");

  const client =
    configured && window.supabase
      ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        })
      : null;

  let cachedProfile = null;
  let cachedAdminStatus = null;

  purgeLegacyStorage();

  function purgeLegacyStorage() {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  function ensureConfigured() {
    if (!client) {
      return {
        ok: false,
        error: "Supabase is not configured yet. Add your project URL and anon key in config.js first."
      };
    }
    return { ok: true };
  }

  function flash(target, kind, text) {
    target.innerHTML = `<div class="flash ${kind === "error" ? "flash-error" : "flash-success"}">${text}</div>`;
  }

  function showToast(text) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function getEmailRedirectUrl() {
    const path = window.location.pathname.replace(/[^/]+$/, "index.html");
    return `${window.location.origin}${path}`;
  }

  async function signUp(payload) {
    const ready = ensureConfigured();
    if (!ready.ok) {
      return ready;
    }

    const { data, error } = await client.auth.signUp({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      options: {
        emailRedirectTo: getEmailRedirectUrl(),
        data: {
          full_name: payload.fullName.trim(),
          city: payload.city.trim(),
          phone: payload.phone.trim(),
          gender: payload.gender,
          emergency_contact: payload.emergencyContact.trim()
        }
      }
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    cachedProfile = null;

    if (!data.session) {
      return {
        ok: true,
        requiresEmailVerification: true,
        message: "Account created. Check your email to verify the account before logging in."
      };
    }

    return { ok: true, requiresEmailVerification: false };
  }

  async function signIn(email, password) {
    const ready = ensureConfigured();
    if (!ready.ok) {
      return ready;
    }

    const { error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    cachedProfile = null;
    return { ok: true };
  }

  async function signOut() {
    if (client) {
      await client.auth.signOut();
    }
    cachedProfile = null;
    window.location.href = "login.html";
  }

  async function getCurrentUser() {
    if (!client) {
      return null;
    }
    const { data } = await client.auth.getUser();
    return data.user || null;
  }

  async function getProfile() {
    const ready = ensureConfigured();
    if (!ready.ok) {
      return null;
    }

    if (cachedProfile) {
      return cachedProfile;
    }

    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    let { data, error } = await client.from("profiles").select("*").eq("id", user.id).single();

    if (error || !data) {
      await ensureProfile();
      const retry = await client.from("profiles").select("*").eq("id", user.id).single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      return null;
    }

    cachedProfile = data;
    return data;
  }

  async function ensureProfile() {
    const user = await getCurrentUser();
    if (!user) {
      return { ok: false, error: "No authenticated user found." };
    }

    const metadata = user.user_metadata || {};
    const payload = {
      id: user.id,
      full_name: metadata.full_name || metadata.name || user.email?.split("@")[0] || "Traveler",
      city: metadata.city || "Not set",
      phone: metadata.phone || "Not set",
      gender: metadata.gender || "Prefer not to say",
      emergency_contact: metadata.emergency_contact || "Not set"
    };

    const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      return { ok: false, error: error.message };
    }

    cachedProfile = null;
    return { ok: true };
  }

  async function requireAuth() {
    const ready = ensureConfigured();
    if (!ready.ok) {
      return false;
    }

    const user = await getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  async function redirectAuthenticated() {
    const user = await getCurrentUser();
    if (user) {
      window.location.href = "dashboard.html";
    }
  }

  async function mountShell(activePage) {
    const profile = await getProfile();
    const admin = await isAdmin();
    const root = document.querySelector("#appShell");
    if (!root) {
      return null;
    }

    if (!configured) {
      root.innerHTML = `
        <div class="app-shell">
          <main class="app-main">
            <section class="app-panel empty-state">
              <h2>Backend setup required</h2>
              <p>Add your Supabase project URL and anon key in <code>config.js</code>, then run the SQL in <code>supabase-schema.sql</code>.</p>
            </section>
          </main>
        </div>
      `;
      return document.querySelector(".app-main");
    }

    root.innerHTML = `
      <div class="app-shell">
        <aside>
          <a class="side-brand" href="dashboard.html">
            <img src="assets/tripo-logo.svg" alt="Tripo logo">
            <span>Tripo</span>
          </a>
          <div class="user-chip">
            <strong>${escapeHtml(profile?.full_name || "Traveler")}</strong>
            <span>${escapeHtml(profile?.city || "City not set")} • ${escapeHtml(profile?.phone || "")}</span>
          </div>
          <nav class="side-nav">
            ${navLink("dashboard.html", "Dashboard", "Your travel command center", activePage === "dashboard")}
            ${navLink("trips.html", "Discover Trips", "Browse local plans", activePage === "trips" || activePage === "trip-detail")}
            ${navLink("create-trip.html", "Create Trip", "Publish a new trip", activePage === "create-trip")}
            ${navLink("profile.html", "Profile", "Privacy and account details", activePage === "profile")}
            ${admin ? navLink("admin.html", "Admin Console", "Users, trips, and reports", activePage === "admin") : ""}
          </nav>
          <div class="side-cta">
            <strong>Secure by design</strong>
            <span>Authentication lives in Supabase Auth and data writes are protected by Row Level Security policies.</span>
            <button class="button button-ghost" id="logoutBtn" type="button">Logout</button>
          </div>
        </aside>
        <main class="app-main">
          <header class="topbar">
            <div>
              <strong>Never travel alone again.</strong>
              <p>Real auth, protected pages, and server-enforced ownership rules.</p>
            </div>
            <div class="topbar-actions">
              <a class="button button-secondary" href="create-trip.html">Create trip</a>
              <a class="button button-ghost" href="trips.html">Explore trips</a>
            </div>
          </header>
          <div id="pageContent"></div>
        </main>
      </div>
    `;

    document.querySelector("#logoutBtn").addEventListener("click", signOut);
    return document.querySelector("#pageContent");
  }

  function navLink(href, title, subtitle, active) {
    return `
      <a class="nav-link ${active ? "is-active" : ""}" href="${href}">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </a>
    `;
  }

  async function listTrips(filters = {}) {
    const ready = ensureConfigured();
    if (!ready.ok) {
      return { ok: false, error: ready.error, data: [] };
    }

    let query = client.from("trips").select("*").order("trip_date", { ascending: true });

    if (filters.city && filters.city !== "all") {
      query = query.eq("city", filters.city);
    }
    if (filters.interest && filters.interest !== "all") {
      query = query.eq("interest", filters.interest);
    }
    if (filters.visibility && filters.visibility !== "all") {
      query = query.eq("visibility", filters.visibility);
    }
    if (filters.hostOnly) {
      const user = await getCurrentUser();
      query = query.eq("host_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      return { ok: false, error: error.message, data: [] };
    }

    let trips = data || [];
    if (filters.search) {
      const needle = filters.search.trim().toLowerCase();
      trips = trips.filter((trip) =>
        [trip.title, trip.city, trip.destination, trip.vibe, trip.interest, trip.description]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }

    if (filters.joinedOnly) {
      const joined = await listJoinedTripIds();
      trips = trips.filter((trip) => joined.includes(trip.id));
    }

    return { ok: true, data: trips };
  }

  async function listJoinedTripIds() {
    const user = await getCurrentUser();
    const { data } = await client.from("trip_members").select("trip_id").eq("user_id", user.id);
    return (data || []).map((item) => item.trip_id);
  }

  async function createTrip(payload) {
    const user = await getCurrentUser();
    const ensured = await ensureProfile();
    if (!ensured.ok) {
      return { ok: false, error: ensured.error };
    }
    const profile = await getProfile();
    const { data, error } = await client
      .from("trips")
      .insert({
        host_id: user.id,
        title: payload.title.trim(),
        city: payload.city.trim(),
        destination: payload.destination.trim(),
        trip_date: payload.date,
        interest: payload.interest,
        vibe: payload.vibe.trim(),
        visibility: payload.visibility,
        seats: Number(payload.seats),
        description: payload.description.trim(),
        host_name: profile.full_name
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  }

  async function getTripDetails(id) {
    const user = await getCurrentUser();
    const { data: trip, error } = await client.from("trips").select("*").eq("id", id).single();
    if (error) {
      return { ok: false, error: error.message };
    }

    const { data: membershipRows } = await client
      .from("trip_members")
      .select("*")
      .eq("trip_id", id)
      .eq("user_id", user.id);

    const isMember = trip.host_id === user.id || (membershipRows || []).length > 0;

    let participants = [];
    let messages = [];

    if (isMember) {
      const membersResult = await client.from("trip_members").select("*").eq("trip_id", id).order("created_at");
      const messagesResult = await client.from("trip_messages").select("*").eq("trip_id", id).order("created_at");
      participants = membersResult.data || [];
      messages = messagesResult.data || [];
    }

    const reviewsResult = await client.from("trip_reviews").select("*").eq("trip_id", id).order("created_at", { ascending: false });

    return {
      ok: true,
      data: {
        trip,
        isMember,
        participants,
        messages,
        reviews: reviewsResult.data || []
      }
    };
  }

  async function joinTrip(id) {
    const user = await getCurrentUser();
    const profile = await getProfile();
    const { error } = await client.from("trip_members").insert({
      trip_id: id,
      user_id: user.id,
      member_name: profile.full_name
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return getTripDetails(id);
  }

  async function addMessage(id, text) {
    const user = await getCurrentUser();
    const profile = await getProfile();
    const { error } = await client.from("trip_messages").insert({
      trip_id: id,
      author_id: user.id,
      author_name: profile.full_name,
      content: text.trim()
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return getTripDetails(id);
  }

  async function addReview(id, rating, body) {
    const user = await getCurrentUser();
    const profile = await getProfile();
    const { error } = await client.from("trip_reviews").upsert(
      {
        trip_id: id,
        author_id: user.id,
        author_name: profile.full_name,
        rating: Number(rating),
        body: body.trim()
      },
      { onConflict: "trip_id,author_id" }
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return getTripDetails(id);
  }

  async function getCities() {
    const result = await listTrips();
    return [...new Set(result.data.map((trip) => trip.city))];
  }

  async function getInterests() {
    const result = await listTrips();
    return [...new Set(result.data.map((trip) => trip.interest))];
  }

  function averageRating(reviews) {
    if (!reviews || !reviews.length) {
      return "New";
    }
    return (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1);
  }

  function formatDate(value) {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function visibilityLabel(value) {
    return value === "women-only" ? "Women only" : "Mixed group";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getClient() {
    return client;
  }

  async function requestPasswordReset(email) {
    const ready = ensureConfigured();
    if (!ready.ok) {
      return ready;
    }

    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getEmailRedirectUrl().replace("index.html", "forgot-password.html")
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function updatePassword(newPassword) {
    const ready = ensureConfigured();
    if (!ready.ok) {
      return ready;
    }

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function updateProfile(payload) {
    const user = await getCurrentUser();
    const { error } = await client
      .from("profiles")
      .update({
        full_name: payload.fullName.trim(),
        city: payload.city.trim(),
        phone: payload.phone.trim(),
        gender: payload.gender,
        emergency_contact: payload.emergencyContact.trim()
      })
      .eq("id", user.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    await client.auth.updateUser({
      data: {
        full_name: payload.fullName.trim(),
        city: payload.city.trim(),
        phone: payload.phone.trim(),
        gender: payload.gender,
        emergency_contact: payload.emergencyContact.trim()
      }
    });

    cachedProfile = null;
    return { ok: true, data: await getProfile() };
  }

  async function isAdmin() {
    if (cachedAdminStatus !== null) {
      return cachedAdminStatus;
    }

    const user = await getCurrentUser();
    if (!user) {
      cachedAdminStatus = false;
      return false;
    }

    const { data, error } = await client
      .from("admin_users")
      .select("email")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    cachedAdminStatus = Boolean(data && !error);
    return cachedAdminStatus;
  }

  async function requireAdmin() {
    const admin = await isAdmin();
    if (!admin) {
      return false;
    }
    return true;
  }

  async function listAllProfiles() {
    const { data, error } = await client.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) {
      return { ok: false, error: error.message, data: [] };
    }
    return { ok: true, data: data || [] };
  }

  async function listAllTrips() {
    const { data, error } = await client.from("trips").select("*").order("created_at", { ascending: false });
    if (error) {
      return { ok: false, error: error.message, data: [] };
    }
    return { ok: true, data: data || [] };
  }

  async function listAllReports() {
    const { data, error } = await client.from("trip_reports").select("*").order("created_at", { ascending: false });
    if (error) {
      return { ok: false, error: error.message, data: [] };
    }
    return { ok: true, data: data || [] };
  }

  async function getTripRecord(id) {
    const { data, error } = await client.from("trips").select("*").eq("id", id).single();
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, data };
  }

  async function updateTrip(id, payload) {
    const { data, error } = await client
      .from("trips")
      .update({
        title: payload.title.trim(),
        city: payload.city.trim(),
        destination: payload.destination.trim(),
        trip_date: payload.date,
        interest: payload.interest,
        vibe: payload.vibe.trim(),
        visibility: payload.visibility,
        seats: Number(payload.seats),
        description: payload.description.trim()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  }

  async function deleteTrip(id) {
    const { error } = await client.from("trips").delete().eq("id", id);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function reportTripIssue(tripId, issue) {
    const user = await getCurrentUser();
    const profile = await getProfile();
    const { error } = await client.from("trip_reports").insert({
      trip_id: tripId,
      reporter_id: user.id,
      reporter_name: profile.full_name,
      issue: issue.trim()
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  window.Tripo = {
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getProfile,
    requireAuth,
    redirectAuthenticated,
    mountShell,
    listTrips,
    createTrip,
    getTripDetails,
    joinTrip,
    addMessage,
    addReview,
    getCities,
    getInterests,
    averageRating,
    formatDate,
    visibilityLabel,
    flash,
    showToast,
    hasBackendConfigured: () => configured,
    getClient,
    escapeHtml,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    getTripRecord,
    updateTrip,
    deleteTrip,
    reportTripIssue,
    ensureProfile,
    isAdmin,
    requireAdmin,
    listAllProfiles,
    listAllTrips,
    listAllReports
  };
})();
