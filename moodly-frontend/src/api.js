export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:1337";

export const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const isManager = (user = currentUser()) => {
  const role = user?.role;
  return [role?.type, role?.name].some(
    (v) => typeof v === "string" && v.toLowerCase() === "manager",
  );
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const explainError = (err) => {
  const message = String(err?.message || "");
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion.";
  }
  if (/invalid identifier or password/i.test(message)) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (/already taken/i.test(message)) {
    return "Cet e-mail ou ce nom d'utilisateur est déjà utilisé.";
  }
  if (/forbidden/i.test(message)) {
    return "Accès refusé pour ce compte.";
  }
  return message || "Une erreur est survenue.";
};

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("token");
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && auth) {
      logout();
      window.location.assign("/login");
    }
    throw new Error(json?.error?.message || `Erreur ${res.status}`);
  }
  return json;
}

async function startSession(jwt) {
  localStorage.setItem("token", jwt);
  const me = await request("/api/users/me?populate=role");
  localStorage.setItem("user", JSON.stringify(me));
  return me;
}

export async function login(identifier, password) {
  const data = await request("/api/auth/local", {
    method: "POST",
    body: { identifier, password },
    auth: false,
  });
  return startSession(data.jwt);
}

export async function register(username, email, password) {
  const data = await request("/api/auth/local/register", {
    method: "POST",
    body: { username, email, password },
    auth: false,
  });
  return startSession(data.jwt);
}

export const fetchMyEntries = () => request("/api/mood-entries/me");

export const saveToday = ({ score, Tags, Comment }) =>
  request("/api/mood-entries/today", {
    method: "POST",
    body: { score, Tags, Comment },
  });

export const fetchStats = (days) =>
  request(`/api/mood-entries/stats?days=${days}`);