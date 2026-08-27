const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("kjs_admin_token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !endpoint.includes("/v1/auth/login")) {
      localStorage.removeItem("kjs_admin_token");
      localStorage.removeItem("kjs_admin_user");
      window.dispatchEvent(new Event("kjs:session_expired"));
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Session expired. Please log in again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }

  return data as T;
}
