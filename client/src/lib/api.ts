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
  const presign = await adminApi.getPresign({
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    folder,
  });
  const xhr = new XMLHttpRequest();
  await new Promise<void>((resolve, reject) => {
    xhr.open("PUT", presign.uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      // R2 answers with an XML error body; surface its <Code> if present.
      const code = /<Code>([^<]+)<\/Code>/.exec(xhr.responseText || "")?.[1];
      if (xhr.status === 403) {
        return reject(
          new Error(
            `R2 rejected the upload (403${code ? " " + code : ""}). Check that R2_BUCKET matches the bucket your API token was issued for, and that the access key and secret are correct.`
          )
        );
      }
      if (xhr.status === 404) {
        return reject(
          new Error(`Bucket not found (404). Check R2_BUCKET and R2_ENDPOINT.`)
        );
      }
      reject(new Error(`Upload failed with HTTP ${xhr.status}${code ? " (" + code + ")" : ""}.`));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "The browser could not reach R2. This is almost always a missing CORS rule on the bucket: add your site's URL to the bucket's CORS policy with PUT allowed."
        )
      );
    xhr.send(file);
  });
  const imgSize = await imageDimensions(file);
  const registered = await adminApi.registerMedia({
    key: presign.key,
    url: presign.publicUrl,
    filename: file.name,
    mimeType: file.type,
    type: file.type.startsWith("video/") ? "video" : "image",
    sizeBytes: file.size,
    width: imgSize.width,
    height: imgSize.height,
    folder,
  });
  return { key: presign.key, publicUrl: presign.publicUrl || registered.url, id: registered.id };
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
