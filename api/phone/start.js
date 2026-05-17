const { sendJson, parseBody, requireEnv, getAuthenticatedUser, getProfile, updateProfile } = require("../_lib/server");

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
  if (!phone) {
    return sendJson(res, 400, { error: "Enter a valid phone number first." });
  }

  try {
    const profile = await getProfile(user.id);
    await updateProfile(user.id, {
      phone,
      phone_verified: false,
      phone_verified_at: null,
      updated_at: new Date().toISOString(),
      full_name: profile.full_name,
      city: profile.city,
      gender: profile.gender,
      emergency_contact: profile.emergency_contact,
      age_range: profile.age_range,
      budget_band: profile.budget_band,
      travel_frequency: profile.travel_frequency,
      personality_style: profile.personality_style,
      adventure_level: profile.adventure_level,
      travel_interests: profile.travel_interests,
      bio: profile.bio
    });

    const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "sms"
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return sendJson(res, 400, {
        error: "We could not send the phone OTP right now. Check the number format and try again."
      });
    }

    return sendJson(res, 200, {
      ok: true,
      message: data.status === "pending" ? "OTP sent to your phone." : "Verification started."
    });
  } catch (error) {
    console.error("[Tripo:phone:start]", error);
    return sendJson(res, 500, { error: "We could not start phone verification right now." });
  }
};
