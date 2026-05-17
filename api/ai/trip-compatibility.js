const { sendJson, parseBody, requireEnv, getAuthenticatedUser, getProfile, supabaseRest, esc } = require("../_lib/server");
const { computeCompatibility, genderEligible } = require("../_lib/ai");
const { generateJson } = require("../_lib/openai");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) {
    return;
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return sendJson(res, 401, { error: "Please log in again to continue." });
  }

  try {
    const body = await parseBody(req);
    const tripId = String(body.tripId || "").trim();
    if (!tripId) {
      return sendJson(res, 400, { error: "Trip id is required." });
    }

    const [profile, trips] = await Promise.all([
      getProfile(user.id),
      supabaseRest(`trips?select=*&id=eq.${esc(tripId)}`)
    ]);

    const trip = trips[0];
    if (!trip || !profile) {
      return sendJson(res, 404, { error: "Trip not found." });
    }

    const compatibilityScore = computeCompatibility(profile, trip);
    const joinEligible = Boolean(profile.phone_verified) && Boolean(user.email_confirmed_at) && genderEligible(profile.gender, trip.visibility);
    const reason = !profile.phone_verified
      ? "Verify your phone number to unlock joining."
      : !user.email_confirmed_at
        ? "Verify your email before joining trips."
        : !genderEligible(profile.gender, trip.visibility)
          ? `This ${trip.visibility === "women-only" ? "women-only" : "men-only"} trip is restricted to matching profiles.`
          : compatibilityScore >= 75
            ? "Strong match for your interests, style, and travel preferences."
            : "Decent match based on your profile and this trip's vibe.";

    const candidates = await supabaseRest(
      `profiles?select=full_name,travel_interests,budget_band,personality_style,adventure_level,gender,city,phone_verified&id=neq.${esc(user.id)}&city=eq.${esc(trip.city)}&limit=3`
    ).catch(() => []);

    const suggestedBuddies = candidates
      .filter((candidate) => genderEligible(candidate.gender, trip.visibility))
      .map((candidate) => ({
        name: candidate.full_name,
        score: computeCompatibility(candidate, trip)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    const fallback = {
      headline: compatibilityScore >= 80 ? "Great group fit" : compatibilityScore >= 65 ? "Promising match" : "Partial match",
      reason,
      suggestedBuddies
    };

    const ai = await generateJson({
      system: "You explain group compatibility for a travel matching app in a short, practical way.",
      prompt: `Profile: ${JSON.stringify({
        city: profile.city,
        budget: profile.budget_band,
        travel_interests: profile.travel_interests,
        personality_style: profile.personality_style,
        adventure_level: profile.adventure_level,
        gender: profile.gender
      })}\nTrip: ${JSON.stringify({
        title: trip.title,
        city: trip.city,
        interest: trip.interest,
        vibe: trip.vibe,
        visibility: trip.visibility,
        description: trip.description
      })}\nCompatibility score: ${compatibilityScore}`,
      fallback,
      schemaHint: '{"headline":"string","reason":"string"}'
    });

    return sendJson(res, 200, {
      ok: true,
      compatibilityScore,
      joinEligible,
      headline: ai.headline || fallback.headline,
      reason: ai.reason || fallback.reason,
      suggestedBuddies
    });
  } catch (error) {
    console.error("[Tripo:ai:trip-compatibility]", error);
    return sendJson(res, 500, { error: "We could not load trip compatibility right now." });
  }
};
