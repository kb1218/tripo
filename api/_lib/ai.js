function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function listify(value) {
  return String(value || "")
    .split(/[,/|]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function overlapScore(left, right) {
  const a = listify(left);
  const b = listify(right);
  if (!a.length || !b.length) {
    return 0;
  }
  return a.filter((item) => b.includes(item)).length;
}

function genderEligible(gender, visibility) {
  const normalized = String(gender || "").trim().toLowerCase();
  if (visibility === "mixed") {
    return true;
  }
  if (visibility === "women-only") {
    return ["woman", "women", "female"].includes(normalized);
  }
  if (visibility === "men-only") {
    return ["man", "men", "male"].includes(normalized);
  }
  return true;
}

function computeCompatibility(profile, trip) {
  let score = 45;
  if (String(profile.city || "").toLowerCase() === String(trip.city || "").toLowerCase()) {
    score += 12;
  }
  if (overlapScore(profile.travel_interests, `${trip.interest}, ${trip.vibe}, ${trip.description}`) > 0) {
    score += 18;
  }
  if (String(profile.budget_band || "").toLowerCase() === budgetFromTrip(trip)) {
    score += 10;
  }
  if (String(profile.personality_style || "").toLowerCase() === vibeFromTrip(trip)) {
    score += 8;
  }
  score += 12 - Math.min(Math.abs(Number(profile.adventure_level || 3) - adventureFromTrip(trip)), 4) * 3;
  if (genderEligible(profile.gender, trip.visibility)) {
    score += 5;
  }
  return clamp(Math.round(score), 5, 99);
}

function budgetFromTrip(trip) {
  const haystack = `${trip.vibe || ""} ${trip.description || ""}`.toLowerCase();
  if (haystack.includes("premium") || haystack.includes("luxury")) {
    return "premium";
  }
  if (haystack.includes("mid")) {
    return "mid-range";
  }
  return "budget";
}

function vibeFromTrip(trip) {
  const haystack = `${trip.vibe || ""} ${trip.description || ""}`.toLowerCase();
  if (haystack.includes("calm") || haystack.includes("relaxed")) {
    return "calm";
  }
  if (haystack.includes("spontaneous")) {
    return "spontaneous";
  }
  if (haystack.includes("social") || haystack.includes("outgoing")) {
    return "outgoing";
  }
  return "balanced";
}

function adventureFromTrip(trip) {
  const haystack = `${trip.interest || ""} ${trip.vibe || ""} ${trip.description || ""}`.toLowerCase();
  if (haystack.includes("adventure") || haystack.includes("trek")) {
    return 5;
  }
  if (haystack.includes("beach") || haystack.includes("nature")) {
    return 4;
  }
  if (haystack.includes("culture") || haystack.includes("food")) {
    return 2;
  }
  return 3;
}

function computeSafetyScore({
  emailVerified,
  phoneVerified,
  joinedTrips,
  hostedTrips,
  reviewAverage,
  reportCount,
  flaggedMessages
}) {
  let score = 35;
  if (emailVerified) {
    score += 18;
  }
  if (phoneVerified) {
    score += 22;
  }
  score += Math.min(joinedTrips * 3, 12);
  score += Math.min(hostedTrips * 4, 12);
  score += Math.round((Number(reviewAverage || 0) / 5) * 12);
  score -= Math.min(reportCount * 10, 28);
  score -= Math.min(flaggedMessages * 6, 18);
  return clamp(score, 0, 100);
}

function buildProfileSummary(profile) {
  const interests = listify(profile.travel_interests).slice(0, 3);
  const interestText = interests.length ? interests.join(", ") : "local discovery";
  return `${profile.full_name || "This traveler"} enjoys ${interestText}, prefers ${String(profile.budget_band || "balanced").toLowerCase()} plans, and travels with a ${String(profile.personality_style || "balanced").toLowerCase()} style.`;
}

function fallbackTripPlan({ city, budget, duration, prompt }) {
  return {
    headline: `${duration} plan for ${city}`,
    budget,
    summary: `A compact ${duration.toLowerCase()} itinerary for ${city} focused on ${prompt.toLowerCase()}.`,
    stops: [
      { time: "8:00 AM", title: `Start with a local breakfast in ${city}` },
      { time: "11:00 AM", title: "Visit the top scenic or cultural spot" },
      { time: "2:00 PM", title: "Budget-friendly lunch and rest break" },
      { time: "5:30 PM", title: "Sunset point or social hangout" }
    ]
  };
}

function moderateTextFallback(content) {
  const normalized = String(content || "").toLowerCase();
  const riskyPatterns = [
    "come alone",
    "send money",
    "private room",
    "secret location",
    "don't tell anyone",
    "meet me alone"
  ];
  const abusivePatterns = ["idiot", "stupid", "bitch", "harass", "scam"];
  const riskyHit = riskyPatterns.find((item) => normalized.includes(item));
  const abusiveHit = abusivePatterns.find((item) => normalized.includes(item));
  if (riskyHit || abusiveHit) {
    return {
      blocked: true,
      flagged: true,
      label: riskyHit ? "unsafe-behavior" : "abusive-language",
      userMessage: "That message was blocked because it may be unsafe or abusive."
    };
  }
  return {
    blocked: false,
    flagged: false,
    label: ""
  };
}

module.exports = {
  clamp,
  listify,
  overlapScore,
  genderEligible,
  computeCompatibility,
  computeSafetyScore,
  buildProfileSummary,
  fallbackTripPlan,
  moderateTextFallback
};
