import React, { useEffect, useState } from "react";
import { adminApi, uploadToR2 } from "../../lib/api";
import ImageSlots from "./ImageSlots";

interface MediaItem {
  id: number;
  url: string;
  filename: string;
  type: "image" | "video";
  folder: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  usage: string[];
}

export default function AdminMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<"image" | "video" | "all">("all");
  const [uploadError, setUploadError] = useState<string>("");
  // bumped after an upload so the slots panel refreshes its thumbnails
  const [slotsKey, setSlotsKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminApi.media(filter === "all" ? {} : { type: filter });
      setItems(d.assets || d.media || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    setUploadError("");
    try {
      for (const f of files) {
        await uploadToR2(f, (pct) => setProgress(pct));
      }
      await load();
      setSlotsKey((k) => k + 1);
    } catch (err: any) {
      setUploadError(err?.data?.detail || err?.data?.error || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const updateAlt = async (id: number, altText: string) => {
    try {
      await adminApi.patchMedia(id, { altText });
    } catch {
      /* ignore */
    }
  };

  const del = async (item: MediaItem) => {
    const isUsed = (item.usage || []).length > 0;
    if (isUsed) {
      alert(`This file is referenced in: ${item.usage.join(", ")}. Remove those references first.`);
      return;
    }
    const ok = window.confirm(`Delete "${item.filename}" permanently from storage?`);
    if (!ok) return;
    try {
      await adminApi.deleteMedia(item.id, true);
      await load();
    } catch (e: any) {
      alert(e?.data?.error || e.message || "Delete failed");
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      prompt("Copy this URL:", url);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {(["all", "image", "video"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-label px-4 py-2 rounded-full border transition-colors ${filter === f ? "bg-ink text-white border-ink" : "bg-white border-borderc text-body hover:border-ink"}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <label className={`btn-pill btn-primary text-[10px] px-5 py-3 cursor-pointer ${uploading ? "opacity-60" : ""}`}>
          {uploading ? `UPLOADING ${progress}%...` : "↑ UPLOAD FILES"}
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {uploadError && (
        <div className="mb-6 rounded-xl border border-candy-pink/40 bg-candy-pink/5 p-4">
          <div className="kicker text-candy-pink mb-1">Upload failed</div>
          <p className="text-[13px] text-ink">{uploadError}</p>
          <button onClick={() => setUploadError("")} className="text-[11px] font-bold text-body underline mt-2">Dismiss</button>
        </div>
      )}

      <ImageSlots key={slotsKey} />

      <h3 className="text-lg font-extrabold uppercase tracking-tight mb-3">Media library</h3>
      {loading ? (
        <div className="p-10 text-center text-body text-sm">Loading library...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-borderc p-10 text-center text-body text-sm">
          Your media library is empty. Upload images and videos above — they're stored in Cloudflare R2 and served from your public CDN URL.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-3">
          {items.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-borderc overflow-hidden flex flex-col">
              {/* Fixed square thumbnail: every card lines up regardless of the
                  original aspect ratio. */}
              <div className="relative w-full aspect-square bg-bg-soft shrink-0">
                {m.type === "video" ? (
                  <video src={m.url} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <img
                    src={m.url}
                    alt={m.altText || m.filename}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <span className="absolute top-1.5 left-1.5 badge-pink" style={{ fontSize: 8, padding: "2px 6px" }}>
                  {m.folder}
                </span>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <div className="text-[10px] font-bold truncate" title={m.filename}>{m.filename}</div>
                <div className="text-[9px] text-body truncate">
                  {m.width ? `${m.width}×${m.height}` : m.type} · {(m.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </div>
                <input
                  defaultValue={m.altText || ""}
                  placeholder="Alt text"
                  onBlur={(e) => updateAlt(m.id, e.target.value)}
                  className="text-[10px] rounded border border-borderc px-1.5 py-1 outline-none focus:border-ink w-full"
                />
                <div className="flex gap-1 mt-0.5">
                  <button onClick={() => copyUrl(m.url)} className="flex-1 text-[8px] font-bold uppercase px-1 py-1 rounded border border-borderc text-body hover:border-ink">
                    COPY
                  </button>
                  <button onClick={() => del(m)} className="flex-1 text-[8px] font-bold uppercase px-1 py-1 rounded border border-candy-pink/30 text-candy-pink hover:bg-candy-pink/10">
                    DELETE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
