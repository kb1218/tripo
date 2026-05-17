const { sendJson, parseBody, requireEnv, getAuthenticatedUser } = require("../_lib/server");
const { fallbackTripPlan } = require("../_lib/ai");
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
    const city = String(body.city || "").trim();
    const budget = String(body.budget || "").trim();
    const duration = String(body.duration || "").trim();
    const prompt = String(body.prompt || "").trim();

    if (!city || !budget || !duration || !prompt) {
      return sendJson(res, 400, { error: "Please complete all trip planner fields." });
    }

    const fallback = fallbackTripPlan({ city, budget, duration, prompt });
    const ai = await generateJson({
      system: "You generate concise India-friendly local trip itineraries for a social travel app.",
      prompt: `Create a trip plan for ${city}. Budget: ${budget}. Duration: ${duration}. Prompt: ${prompt}. Keep it realistic and shareable.`,
      fallback,
      schemaHint: '{"headline":"string","budget":"string","summary":"string","stops":[{"time":"string","title":"string"}]}'
    });

    return sendJson(res, 200, {
      ok: true,
      headline: ai.headline || fallback.headline,
      budget: ai.budget || fallback.budget,
      summary: ai.summary || fallback.summary,
      stops: Array.isArray(ai.stops) && ai.stops.length ? ai.stops : fallback.stops
    });
  } catch (error) {
    console.error("[Tripo:ai:trip-plan]", error);
    return sendJson(res, 500, { error: "We could not generate a trip plan right now." });
  }
};
