const { sendJson, parseBody, requireEnv, getAuthenticatedUser } = require("../_lib/server");
const { moderateTextFallback } = require("../_lib/ai");
const { moderateText } = require("../_lib/openai");

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
    const content = String(body.content || "").trim();
    if (!content) {
      return sendJson(res, 400, { error: "Message content is required." });
    }

    const fallback = moderateTextFallback(content);
    const moderation = await moderateText(content);
    const result = moderation?.results?.[0];

    if (!result) {
      return sendJson(res, 200, fallback);
    }

    const categoryEntries = Object.entries(result.categories || {}).filter(([, flagged]) => Boolean(flagged));
    const blocked = Boolean(result.flagged);
    const label = categoryEntries[0]?.[0] || fallback.label || "";

    return sendJson(res, 200, {
      blocked,
      flagged: blocked,
      label,
      userMessage: blocked ? "That message was blocked because it may be unsafe or abusive." : ""
    });
  } catch (error) {
    console.error("[Tripo:ai:moderate-message]", error);
    return sendJson(res, 200, moderateTextFallback((req.body && req.body.content) || ""));
  }
};
