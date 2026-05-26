import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000/api";

export const API_BASE = API_URL.replace(/\/api\/?$/, "");

interface Options extends RequestInit {
  json?: unknown;
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { json, headers, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(headers as Record<string, string>),
    },
    body: json ? JSON.stringify(json) : rest.body,
  });
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

// Convierte una URL de imagen del backend (e.g. "http://localhost:4000/uploads/abc.jpg")
// asegurando que sea válida y resolviendo paths relativos
export function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}
