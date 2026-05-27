const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
export const API_BASE = API_URL.replace(/\/api\/?$/, "");

export interface ApiOptions extends RequestInit {
  token?: string | null;
  json?: unknown;
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { token, json, headers, ...rest } = opts;
  const init: RequestInit = {
    ...rest,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
    body: json ? JSON.stringify(json) : (rest as RequestInit).body,
  };
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("spa_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("spa_token", token);
  else localStorage.removeItem("spa_token");
}

// Upload de archivo (multipart). Devuelve URL relativa al backend.
export async function uploadImage(file: File, token: string): Promise<{ url: string; mime: string }> {
  if (file.size > 3 * 1024 * 1024) throw new Error("Imagen demasiado grande (máx 3 MB)");
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Formato no soportado (JPG, PNG, WebP)");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/uploads/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { msg = (await res.json()).error ?? msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  // Con storage local la url es relativa ("/uploads/xxx") → la hacemos absoluta.
  // Con S3/R2 ya viene absoluta ("https://...") → la dejamos tal cual.
  const url: string = /^https?:\/\//.test(data.url) ? data.url : `${API_BASE}${data.url}`;
  return { url, mime: data.mime };
}
