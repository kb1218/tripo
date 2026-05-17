const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function getMissingEnv(names) {
  return names.filter((name) => !process.env[name]);
}

function requireEnv(res, names) {
  const missing = getMissingEnv(names);
  if (!missing.length) {
    return true;
  }

  sendJson(res, 503, {
    error: "Server configuration is incomplete. Add the required environment variables in Vercel before using this feature."
  });
  return false;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice(7).trim();
}

async function getAuthenticatedUser(req) {
  if (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY)) {
    throw new Error("Supabase environment variables are missing.");
  }

  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function supabaseRest(path, { method = "GET", body, headers = {} } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "count=exact" : "return=representation",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error || data?.hint || "Supabase request failed.";
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

function esc(value) {
  return encodeURIComponent(String(value));
}

async function getProfile(userId) {
  const rows = await supabaseRest(`profiles?select=*&id=eq.${esc(userId)}`);
  return rows?.[0] || null;
}

async function updateProfile(userId, patch) {
  const rows = await supabaseRest(`profiles?id=eq.${esc(userId)}`, {
    method: "PATCH",
    body: patch
  });
  return rows?.[0] || null;
}

async function isAdminEmail(email) {
  const rows = await supabaseRest(`admin_users?select=email&email=eq.${esc(String(email).toLowerCase())}`);
  return Boolean(rows?.length);
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  sendJson,
  parseBody,
  requireEnv,
  getAuthenticatedUser,
  supabaseRest,
  getProfile,
  updateProfile,
  isAdminEmail,
  esc
};
