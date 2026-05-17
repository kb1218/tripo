const { sendJson, parseBody, requireEnv, getAuthenticatedUser, updateProfile } = require("../_lib/server");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (
    !requireEnv(res, [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_VERIFY_SERVICE_SID"
    ])
  ) {
    return;
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return sendJson(res, 401, { error: "Please log in again to continue." });
  }

  const body = await parseBody(req).catch(() => null);
  const phone = String(body?.phone || "").trim();
  const code = String(body?.code || "").trim();
  if (!phone || !code) {
    return sendJson(res, 400, { error: "Enter both phone number and OTP." });
  }

  try {
    const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: phone,
          Code: code
        })
      }
    );

    const data = await response.json();
    if (!response.ok || data.status !== "approved") {
      return sendJson(res, 400, { error: "That OTP could not be verified. Please try again." });
    }

    await updateProfile(user.id, {
      phone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString()
    });

    return sendJson(res, 200, {
      ok: true,
      message: "Phone verified successfully."
    });
  } catch (error) {
    console.error("[Tripo:phone:verify]", error);
    return sendJson(res, 500, { error: "We could not verify that code right now." });
  }
};
