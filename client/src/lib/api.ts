const BASE = import.meta.env.VITE_API_URL || "";

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: res.status, data });
  return data as T;
}

// ---------- Auth ----------
export const authApi = {
  register: (body: { email: string; password: string; displayName?: string }) =>
    api<any>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<any>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => api<any>("/api/auth/logout", { method: "POST" }),
  me: () => api<any>("/api/auth/me"),
};

// ---------- Public content ----------
// Responses are wrapped by the server: { settings }, { collections }, { characters }, etc.
export const contentApi = {
  home: () => api<any>("/api/home"),
  settings: () => api<any>("/api/settings"),
  collections: () => api<any>("/api/collections"),
  collection: (slug: string) => api<any>(`/api/collections/${slug}`),
  characters: (params?: { collection?: number; rarity?: string }) => {
    const q = new URLSearchParams();
    if (params?.collection) q.set("collection", String(params.collection));
    if (params?.rarity) q.set("rarity", params.rarity);
    return api<any>(`/api/characters${q.toString() ? "?" + q.toString() : ""}`);
  },
  character: (slug: string) => api<any>(`/api/characters/${slug}`),
  news: () => api<any>("/api/news"),
  partners: () => api<any>("/api/retail-partners"),
  stores: (zip: string, radius: string) =>
    api<any>(`/api/stores?zip=${encodeURIComponent(zip)}&radius=${radius}`),
  products: (params?: { collection?: number }) => {
    const q = new URLSearchParams();
    if (params?.collection) q.set("collection", String(params.collection));
    return api<any>(`/api/products${q.toString() ? "?" + q.toString() : ""}`);
  },
  product: (slug: string) => api<any>(`/api/products/${slug}`),
  progress: () => api<any>("/api/collection/progress"),
  toggleProgress: (characterId: number, collected: boolean) =>
    api<any>("/api/collection/toggle", { method: "POST", body: JSON.stringify({ characterId, collected }) }),
  wholesale: (body: Record<string, string>) =>
    api<any>("/api/wholesale", { method: "POST", body: JSON.stringify(body) }),
  createLead: (body: { email: string; source?: string; consent?: boolean; hp?: string }) =>
    api<any>("/api/leads", { method: "POST", body: JSON.stringify(body) }),
};

// ---------- Admin ----------
export const adminApi = {
  stats: () => api<any>("/api/admin/stats"),
  orders: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return api<any>(`/api/admin/orders${q ? "?" + q : ""}`);
  },
  order: (id: number) => api<any>(`/api/admin/orders/${id}`),
  patchOrder: (id: number, body: any) =>
    api<any>(`/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  createOrder: (body: any) => api<any>("/api/admin/orders", { method: "POST", body: JSON.stringify(body) }),
  users: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return api<any>(`/api/admin/users${q ? "?" + q : ""}`);
  },
  user: (id: string) => api<any>(`/api/admin/users/${id}`),
  patchUser: (id: string, body: any) =>
    api<any>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (id: string) => api<any>(`/api/admin/users/${id}`, { method: "DELETE" }),
  leads: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return api<any>(`/api/admin/leads${q ? "?" + q : ""}`);
  },
  deleteLead: (id: number) => api<any>(`/api/admin/leads/${id}`, { method: "DELETE" }),
  getPresign: (body: { filename: string; mimeType: string; sizeBytes: number; folder?: string }) =>
    api<any>("/api/admin/media/presign", { method: "POST", body: JSON.stringify(body) }),
  wholesale: () => api<any>("/api/admin/wholesale"),
  setWholesaleStatus: (id: number, status: string) =>
    api<any>(`/api/admin/wholesale/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteWholesale: (id: number) => api<any>(`/api/admin/wholesale/${id}`, { method: "DELETE" }),
  r2Status: () => api<any>("/api/admin/r2-status"),
  registerMedia: (body: any) => api<any>("/api/admin/media", { method: "POST", body: JSON.stringify(body) }),
  media: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return api<any>(`/api/admin/media${q ? "?" + q : ""}`);
  },
  patchMedia: (id: number, body: any) =>
    api<any>(`/api/admin/media/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteMedia: (id: number, confirm = false) =>
    api<any>(`/api/admin/media/${id}?confirm=${confirm}`, { method: "DELETE" }),
  // generic crud
  crud: (entity: string) => ({
    list: (params?: Record<string, string>) => {
      const q = new URLSearchParams(params).toString();
      return api<any>(`/api/admin/${entity}${q ? "?" + q : ""}`);
    },
    get: (id: number) => api<any>(`/api/admin/${entity}/${id}`),
    create: (body: any) => api<any>(`/api/admin/${entity}`, { method: "POST", body: JSON.stringify(body) }),
    patch: (id: number, body: any) =>
      api<any>(`/api/admin/${entity}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    del: (id: number, confirm = false) =>
      api<any>(`/api/admin/${entity}/${id}?confirm=${confirm}`, { method: "DELETE" }),
  }),
  reorder: (entity: string, ids: number[]) =>
    api<any>(`/api/admin/${entity}/reorder`, { method: "PATCH", body: JSON.stringify({ ids }) }),
  settings: () => api<any>("/api/admin/settings"),
  patchSettings: (body: any) =>
    api<any>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(body) }),
  importStores: (rows: Record<string, string>[]) =>
    api<any>("/api/admin/stores/import-csv", { method: "POST", body: JSON.stringify({ rows }) }),
};

/** Upload a file directly to R2 using a presigned URL */
export async function uploadToR2(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ key: string; publicUrl: string; id: number }> {
  const folder = inferFolder(file.type, file.name);
  const mimeType = file.type || "application/octet-stream";
  const qs = new URLSearchParams({ filename: file.name, mimeType, folder }).toString();

  // The file goes to our own API, which forwards it to R2. Uploading straight
  // from the browser to R2 requires a CORS rule on the bucket; routing through
  // the server removes that dependency.
  const registered = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/api/admin/media/upload?${qs}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", mimeType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      let payload: any = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* not json */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload) return resolve(payload);
      if (xhr.status === 401 || xhr.status === 403) {
        return reject(new Error("Your admin session expired. Log in again and retry."));
      }
      if (xhr.status === 413) {
        return reject(new Error("The file is too large to upload through the server."));
      }
      reject(
        new Error(
          payload?.detail || payload?.error || `Upload failed with HTTP ${xhr.status}.`
        )
      );
    };
    xhr.onerror = () => reject(new Error("Could not reach the server. Check your connection and retry."));
    xhr.send(file);
  });

  return { key: registered.key, publicUrl: registered.url, id: registered.id };
}

function inferFolder(mime: string, name: string): string {
  const lower = name.toLowerCase();
  if (mime.startsWith("video/")) return "video";
  if (lower.includes("hero")) return "hero";
  if (lower.includes("partner") || lower.includes("logo")) return "partners";
  if (lower.includes("news")) return "news";
  if (lower.includes("character") || lower.includes("figure")) return "characters";
  if (lower.includes("product")) return "products";
  return "other";
}

function imageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/")) return Promise.resolve({ width: null, height: null });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = URL.createObjectURL(file);
  });
}
