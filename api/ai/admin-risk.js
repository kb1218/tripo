const { sendJson, requireEnv, getAuthenticatedUser, isAdminEmail, supabaseRest } = require("../_lib/server");

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

  const admin = await isAdminEmail(user.email || "");
  if (!admin) {
    return sendJson(res, 403, { error: "Admin access is required." });
  }

  try {
    const [reports, flaggedMessages, womenTrips, menTrips] = await Promise.all([
      supabaseRest("trip_reports?select=id,trip_id,reporter_name,issue,created_at"),
      supabaseRest("trip_messages?select=id,trip_id,author_name,moderation_label,created_at&moderation_status=eq.flagged"),
      supabaseRest("trips?select=id,title,host_name,visibility&visibility=eq.women-only"),
      supabaseRest("trips?select=id,title,host_name,visibility&visibility=eq.men-only")
    ]);

    const items = [];

    reports.slice(0, 5).forEach((report) => {
      items.push({
        level: "High",
        label: `Report on trip ${report.trip_id}: ${report.issue.slice(0, 72)}`
      });
    });

    flaggedMessages.slice(0, 5).forEach((message) => {
      items.push({
        level: "Medium",
        label: `${message.author_name} sent a flagged chat message (${message.moderation_label || "unsafe-language"}).`
      });
    });

    if (womenTrips.length >= 3) {
      items.push({
        level: "Watch",
        label: `${womenTrips.length} women-only trips are live. Review host behavior and report trends regularly.`
      });
    }

    if (menTrips.length >= 3) {
      items.push({
        level: "Watch",
        label: `${menTrips.length} men-only trips are live. Review member moderation and complaint trends regularly.`
      });
    }

    return sendJson(res, 200, {
      ok: true,
      items: items.slice(0, 8)
    });
  } catch (error) {
    console.error("[Tripo:ai:admin-risk]", error);
    return sendJson(res, 500, { error: "We could not load AI risk signals right now." });
  }
};
