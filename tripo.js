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
  let cachedUser = undefined;

  const GENERIC_MESSAGES = {
    default: "Something went wrong. Please try again in a moment.",
    auth: "We could not complete that sign-in request. Please check your details and try again.",
    signup: "We could not create your account right now. Please review your details and try again.",
    session: "Your session has expired. Please log in again.",
    permission: "Your account is not allowed to do that right now.",
    verified: "Please verify your email before using this feature.",
    createTrip: "We could not publish the trip right now. Please review the details and try again.",
    joinTrip: "We could not join this trip right now. Please check your verification status and trip eligibility.",
    profile: "We could not save your profile right now. Please try again.",
    trips: "We could not load trips right now. Please refresh and try again.",
    messages: "We could not send that message right now. Please try again.",
    reviews: "We could not save your review right now. Please try again.",
    reports: "We could not submit that report right now. Please try again.",
    verification: "We could not verify that code right now. Please try again.",
    ai: "The AI assistant is unavailable right now. Please try again shortly."
  };

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

  function logSystemError(scope, error) {
    console.error(`[Tripo:${scope}]`, error);
  }

  function getErrorText(error) {
    if (!error) {
      return "";
    }
    return String(error.message || error.error_description || error.details || error.hint || error).trim();
  }

  function userSafeError(error, fallbackKey = "default") {
    const raw = getErrorText(error).toLowerCase();
    if (!raw) {
      return GENERIC_MESSAGES[fallbackKey] || GENERIC_MESSAGES.default;
    }
    if (raw.includes("invalid login credentials") || raw.includes("email not confirmed")) {
      return "Please check your login details and confirm your email before signing in.";
    }
    if (raw.includes("jwt") || raw.includes("session")) {
      return GENERIC_MESSAGES.session;
    }
    if (raw.includes("duplicate key")) {
      return "That action has already been completed.";
    }
    if (raw.includes("violates row-level security") || raw.includes("permission denied")) {
      return GENERIC_MESSAGES.permission;
    }
    if (raw.includes("user_matches_trip_visibility")) {
      return "This trip is limited to a different gender-specific group.";
    }
    if (raw.includes("profile_is_verified")) {
      return GENERIC_MESSAGES.verified;
    }
    if (raw.includes("trip_has_space") || raw.includes("trip full")) {
      return "This trip is already full.";
    }
    if (raw.includes("check constraint") || raw.includes("violates check constraint")) {
      return "Please review the values you entered and try again.";
    }
    if (raw.includes("network") || raw.includes("fetch")) {
      return "We could not reach the server. Please check your connection and try again.";
    }
    if (raw.includes("phone verification")) {
      return GENERIC_MESSAGES.verification;
    }
    return GENERIC_MESSAGES[fallbackKey] || GENERIC_MESSAGES.default;
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
          emergency_contact: payload.emergencyContact.trim(),
          age_range: payload.ageRange,
          budget_band: payload.budgetBand,
          travel_frequency: payload.travelFrequency,
          personality_style: payload.personalityStyle,
          adventure_level: Number(payload.adventureLevel),
          travel_interests: payload.travelInterests.trim(),
          bio: payload.bio.trim()
        }
      }
    });

    if (error) {
      logSystemError("signUp", error);
      return { ok: false, error: userSafeError(error, "signup") };
    }

    cachedProfile = null;
    cachedUser = data.user || undefined;
    cachedAdminStatus = null;

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
      logSystemError("signIn", error);
      return { ok: false, error: userSafeError(error, "auth") };
    }

    cachedProfile = null;
    cachedUser = undefined;
    cachedAdminStatus = null;
    return { ok: true };
  }

  async function signOut() {
    if (client) {
      await client.auth.signOut();
    }
    cachedUser = undefined;
    cachedProfile = null;
    cachedAdminStatus = null;
    window.location.href = "login.html";
  }

  async function getCurrentUser() {
    if (!client) {
      return null;
    }
    if (cachedUser !== undefined) {
      return cachedUser;
    }
    const { data } = await client.auth.getUser();
    cachedUser = data.user || null;
    return cachedUser;
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
      emergency_contact: metadata.emergency_contact || "Not set",
      age_range: metadata.age_range || "25-34",
      budget_band: metadata.budget_band || "Budget",
      travel_frequency: metadata.travel_frequency || "Occasional",
      personality_style: metadata.personality_style || "Balanced",
      adventure_level: Number(metadata.adventure_level || 3),
      travel_interests: metadata.travel_interests || "",
      bio: metadata.bio || ""
    };

    const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      logSystemError("ensureProfile", error);
      return { ok: false, error: userSafeError(error, "profile") };
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

  async function getAccessToken() {
    if (!client) {
      return null;
    }
    const { data } = await client.auth.getSession();
    return data.session?.access_token || null;
  }

  async function callSecureApi(path, payload = {}, method = "POST") {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, error: GENERIC_MESSAGES.session };
    }

    try {
      const response = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: method === "GET" ? undefined : JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        logSystemError(`api:${path}`, data);
        return { ok: false, error: data.error || GENERIC_MESSAGES.ai, data };
      }
      return { ok: true, data };
    } catch (error) {
      logSystemError(`api:${path}`, error);
      return { ok: false, error: userSafeError(error, "ai") };
    }
  }

  async function getVerificationStatus() {
    const user = await getCurrentUser();
    const profile = await getProfile();
    return {
      emailVerified: Boolean(user?.email_confirmed_at),
      phoneVerified: Boolean(profile?.phone_verified),
      isVerified: Boolean(user?.email_confirmed_at)
    };
  }

  async function requireVerifiedAccount() {
    const status = await getVerificationStatus();
    if (!status.isVerified) {
      return { ok: false, error: GENERIC_MESSAGES.verified };
    }
    return { ok: true };
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
            <span>${escapeHtml(profile?.city || "City not set")} &bull; ${escapeHtml(profile?.phone || "")}</span>
          </div>
          <nav class="side-nav">
            ${navLink("dashboard.html", "Dashboard", "Your travel command center", activePage === "dashboard")}
            ${navLink("trips.html", "Discover Trips", "Browse local plans", activePage === "trips" || activePage === "trip-detail")}
            ${navLink("create-trip.html", "Create Trip", "Publish a new trip", activePage === "create-trip")}
            ${navLink("profile.html", "Profile", "Privacy and account details", activePage === "profile")}
            ${admin ? navLink("admin.html", "Admin Console", "Users, trips, and reports", activePage === "admin") : ""}
          </nav>
        </aside>
        <main class="app-main">
          <header class="topbar">
            <div>
              <strong>Never travel alone again.</strong>
              <p>Find your people, plan your trip, and travel together.</p>
            </div>
            <div class="topbar-actions">
              <a class="button button-secondary" href="create-trip.html">Create trip</a>
              <a class="button button-ghost" href="trips.html">Explore trips</a>
              <button class="button button-ghost" id="logoutBtn" type="button">Logout</button>
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
      logSystemError("listTrips", error);
      return { ok: false, error: userSafeError(error, "trips"), data: [] };
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
    const verified = await requireVerifiedAccount();
    if (!verified.ok) {
      return verified;
    }
    const user = await getCurrentUser();
    const ensured = await ensureProfile();
    if (!ensured.ok) {
      return { ok: false, error: ensured.error || GENERIC_MESSAGES.profile };
    }
    const profile = await getProfile();
    if (!profile) {
      return {
        ok: false,
        error: GENERIC_MESSAGES.profile
      };
    }
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
      logSystemError("createTrip", error);
      return { ok: false, error: userSafeError(error, "createTrip") };
    }

    return { ok: true, data };
  }

  async function getTripDetails(id) {
    const user = await getCurrentUser();
    const { data: trip, error } = await client.from("trips").select("*").eq("id", id).single();
    if (error) {
      logSystemError("getTripDetails", error);
      return { ok: false, error: "That trip could not be loaded." };
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
    const verified = await requireVerifiedAccount();
    if (!verified.ok) {
      return verified;
    }
    const user = await getCurrentUser();
    const profile = await getProfile();
    const { error } = await client.from("trip_members").insert({
      trip_id: id,
      user_id: user.id,
      member_name: profile.full_name
    });

    if (error) {
      logSystemError("joinTrip", error);
      return { ok: false, error: userSafeError(error, "joinTrip") };
    }

    return getTripDetails(id);
  }

  async function addMessage(id, text) {
    const user = await getCurrentUser();
    const profile = await getProfile();
    const moderation = await callSecureApi("/api/ai/moderate-message", {
      content: text.trim(),
      tripId: id
    });

    if (!moderation.ok) {
      return moderation;
    }

    if (moderation.data.blocked) {
      return {
        ok: false,
        error: moderation.data.userMessage || "That message was blocked for safety reasons."
      };
    }

    const { error } = await client.from("trip_messages").insert({
      trip_id: id,
      author_id: user.id,
      author_name: profile.full_name,
      content: text.trim(),
      moderation_status: moderation.data.flagged ? "flagged" : "clear",
      moderation_label: moderation.data.label || ""
    });

    if (error) {
      logSystemError("addMessage", error);
      return { ok: false, error: userSafeError(error, "messages") };
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
      logSystemError("addReview", error);
      return { ok: false, error: userSafeError(error, "reviews") };
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
    if (value === "women-only") {
      return "Women only";
    }
    if (value === "men-only") {
      return "Men only";
    }
    return "Mixed group";
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

  function extractPhoneNumber(value) {
    const digits = String(value || "").replace(/[^\d+]/g, "");
    return digits || "";
  }

  function callNumber(value) {
    const phone = extractPhoneNumber(value);
    if (!phone) {
      return false;
    }
    window.location.href = `tel:${phone}`;
    return true;
  }

  function openEmergencyService() {
    window.location.href = "tel:112";
  }

  async function shareLocationOnWhatsApp(contactValue, tripTitle) {
    const phone = extractPhoneNumber(contactValue);
    if (!phone) {
      return { ok: false, error: "No valid phone number was found in the emergency contact." };
    }

    if (!navigator.geolocation) {
      return { ok: false, error: "Geolocation is not available in this browser." };
    }

    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    }).catch((error) => ({ error }));

    if (position.error) {
      return { ok: false, error: "Unable to get your current location. Please allow location access." };
    }

    const { latitude, longitude } = position.coords;
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = encodeURIComponent(
      `SOS from Tripo${tripTitle ? ` for "${tripTitle}"` : ""}. My current location is: ${mapsLink}`
    );
    window.location.href = `https://wa.me/${phone}?text=${message}`;
    return { ok: true };
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
    const currentProfile = await getProfile();
    const phoneChanged = String(currentProfile?.phone || "").trim() !== payload.phone.trim();
    const { error } = await client
      .from("profiles")
      .update({
        full_name: payload.fullName.trim(),
        city: payload.city.trim(),
        phone: payload.phone.trim(),
        gender: payload.gender,
        emergency_contact: payload.emergencyContact.trim(),
        phone_verified: phoneChanged ? false : Boolean(currentProfile?.phone_verified),
        phone_verified_at: phoneChanged ? null : currentProfile?.phone_verified_at || null,
        age_range: payload.ageRange,
        budget_band: payload.budgetBand,
        travel_frequency: payload.travelFrequency,
        personality_style: payload.personalityStyle,
        adventure_level: Number(payload.adventureLevel),
        travel_interests: payload.travelInterests.trim(),
        bio: payload.bio.trim()
      })
      .eq("id", user.id);

    if (error) {
      logSystemError("updateProfile", error);
      return { ok: false, error: userSafeError(error, "profile") };
    }

    await client.auth.updateUser({
      data: {
        full_name: payload.fullName.trim(),
        city: payload.city.trim(),
        phone: payload.phone.trim(),
        gender: payload.gender,
        emergency_contact: payload.emergencyContact.trim(),
        age_range: payload.ageRange,
        budget_band: payload.budgetBand,
        travel_frequency: payload.travelFrequency,
        personality_style: payload.personalityStyle,
        adventure_level: Number(payload.adventureLevel),
        travel_interests: payload.travelInterests.trim(),
        bio: payload.bio.trim()
      }
    });

    cachedProfile = null;
    cachedAdminStatus = null;
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
      logSystemError("listAllProfiles", error);
      return { ok: false, error: userSafeError(error), data: [] };
    }
    return { ok: true, data: data || [] };
  }

  async function listAllTrips() {
    const { data, error } = await client.from("trips").select("*").order("created_at", { ascending: false });
    if (error) {
      logSystemError("listAllTrips", error);
      return { ok: false, error: userSafeError(error), data: [] };
    }
    return { ok: true, data: data || [] };
  }

  async function listAllReports() {
    const { data, error } = await client.from("trip_reports").select("*").order("created_at", { ascending: false });
    if (error) {
      logSystemError("listAllReports", error);
      return { ok: false, error: userSafeError(error), data: [] };
    }
    return { ok: true, data: data || [] };
  }

  async function adminUpdateProfile(id, payload) {
    const { data, error } = await client
      .from("profiles")
      .update({
        full_name: payload.fullName.trim(),
        city: payload.city.trim(),
        phone: payload.phone.trim(),
        gender: payload.gender.trim(),
        emergency_contact: payload.emergencyContact.trim()
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      logSystemError("adminUpdateProfile", error);
      return { ok: false, error: userSafeError(error, "profile") };
    }
    cachedProfile = null;
    return { ok: true, data };
  }

  async function adminDeleteProfile(id) {
    const { error } = await client.from("profiles").delete().eq("id", id);
    if (error) {
      logSystemError("adminDeleteProfile", error);
      return { ok: false, error: userSafeError(error) };
    }
    return { ok: true };
  }

  async function adminUpdateTrip(id, payload) {
    return updateTrip(id, payload);
  }

  async function adminDeleteReport(id) {
    const { error } = await client.from("trip_reports").delete().eq("id", id);
    if (error) {
      logSystemError("adminDeleteReport", error);
      return { ok: false, error: userSafeError(error) };
    }
    return { ok: true };
  }

  async function getTripRecord(id) {
    const { data, error } = await client.from("trips").select("*").eq("id", id).single();
    if (error) {
      logSystemError("getTripRecord", error);
      return { ok: false, error: "That trip could not be loaded." };
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
      logSystemError("updateTrip", error);
      return { ok: false, error: userSafeError(error, "createTrip") };
    }

    return { ok: true, data };
  }

  async function deleteTrip(id) {
    const { error } = await client.from("trips").delete().eq("id", id);
    if (error) {
      logSystemError("deleteTrip", error);
      return { ok: false, error: userSafeError(error) };
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
      logSystemError("reportTripIssue", error);
      return { ok: false, error: userSafeError(error, "reports") };
    }

    return { ok: true };
  }

  async function startPhoneVerification(phone) {
    const response = await callSecureApi("/api/phone/start", {
      phone: phone.trim()
    });
    if (!response.ok) {
      return response;
    }
    return { ok: true, message: response.data.message || "OTP sent to your phone." };
  }

  async function verifyPhoneOtp(phone, code) {
    const response = await callSecureApi("/api/phone/verify", {
      phone: phone.trim(),
      code: code.trim()
    });
    if (!response.ok) {
      return response;
    }
    cachedProfile = null;
    return { ok: true, message: response.data.message || "Phone verified successfully." };
  }

  async function getProfileInsights() {
    return callSecureApi("/api/ai/profile-insights");
  }

  async function getTripCompatibility(tripId) {
    return callSecureApi("/api/ai/trip-compatibility", { tripId });
  }

  async function getTripPlan(prompt, city, budget, duration) {
    return callSecureApi("/api/ai/trip-plan", { prompt, city, budget, duration });
  }

  async function getAdminRiskSignals() {
    return callSecureApi("/api/ai/admin-risk");
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
    extractPhoneNumber,
    callNumber,
    openEmergencyService,
    shareLocationOnWhatsApp,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    getVerificationStatus,
    requireVerifiedAccount,
    startPhoneVerification,
    verifyPhoneOtp,
    getProfileInsights,
    getTripCompatibility,
    getTripPlan,
    getAdminRiskSignals,
    getTripRecord,
    updateTrip,
    deleteTrip,
    reportTripIssue,
    ensureProfile,
    isAdmin,
    requireAdmin,
    listAllProfiles,
    listAllTrips,
    listAllReports,
    adminUpdateProfile,
    adminDeleteProfile,
    adminDeleteReport,
    adminUpdateTrip
  };
})();
