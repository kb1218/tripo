const { sendJson, requireEnv, getAuthenticatedUser, getProfile, updateProfile, supabaseRest, esc } = require("../_lib/server");
const { computeSafetyScore, buildProfileSummary } = require("../_lib/ai");
const { generateJson } = require("../_lib/openai");

module.exports = async (req, res) => {
  if (req.method !== "POST" && req.method !== "GET") {
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
    const profile = await getProfile(user.id);
    if (!profile) {
      return sendJson(res, 404, { error: "Profile not found." });
    }

    const [joinedTrips, hostedTrips, ownReviews, reports, flaggedMessages] = await Promise.all([
      supabaseRest(`trip_members?select=trip_id&user_id=eq.${esc(user.id)}`),
      supabaseRest(`trips?select=id&host_id=eq.${esc(user.id)}`),
      supabaseRest(`trip_reviews?select=rating&author_id=eq.${esc(user.id)}`),
      supabaseRest(`trip_reports?select=id&reporter_id=eq.${esc(user.id)}`),
      supabaseRest(`trip_messages?select=id&author_id=eq.${esc(user.id)}&moderation_status=eq.flagged`)
    ]);

    const averageRating =
      ownReviews.length > 0
        ? ownReviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / ownReviews.length
        : 0;

    const safetyScore = computeSafetyScore({
      emailVerified: Boolean(user.email_confirmed_at),
      phoneVerified: Boolean(profile.phone_verified),
      joinedTrips: joinedTrips.length,
      hostedTrips: hostedTrips.length,
      reviewAverage: averageRating,
      reportCount: reports.length,
      flaggedMessages: flaggedMessages.length
    });

    const fallback = {
      summary: buildProfileSummary(profile),
      safetyHeadline: safetyScore >= 85 ? "Highly trusted traveler" : safetyScore >= 70 ? "Trusted traveler" : "Growing verified profile",
      highlights: [
        `${joinedTrips.length} joined trips`,
        `${hostedTrips.length} hosted trips`,
        `${reports.length} reports on record`,
        `${profile.phone_verified ? "Phone verified" : "Phone verification pending"}`
      ]
    };

    const ai = await generateJson({
      system: "You write concise trust-first travel profile summaries for a social travel app.",
      prompt: `Traveler profile: ${JSON.stringify({
        city: profile.city,
        budget_band: profile.budget_band,
        personality_style: profile.personality_style,
        adventure_level: profile.adventure_level,
        travel_interests: profile.travel_interests,
        bio: profile.bio,
        joinedTrips: joinedTrips.length,
        hostedTrips: hostedTrips.length,
        safetyScore
      })}`,
      fallback,
      schemaHint: '{"summary":"string","safetyHeadline":"string","highlights":["string"]}'
    });

    await updateProfile(user.id, {
      ai_summary: ai.summary || fallback.summary,
      safety_score: safetyScore
    });

    return sendJson(res, 200, {
      ok: true,
      safetyScore,
      summary: ai.summary || fallback.summary,
      safetyHeadline: ai.safetyHeadline || fallback.safetyHeadline,
      highlights: ai.highlights || fallback.highlights
    });
  } catch (error) {
    console.error("[Tripo:ai:profile-insights]", error);
    return sendJson(res, 500, { error: "We could not load AI profile insights right now." });
  }
};
