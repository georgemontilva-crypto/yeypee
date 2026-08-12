import React, { useEffect, useState } from "react";
import { adminApi, uploadToR2 } from "../../lib/api";

export interface MediaItem {
  id: number;
  url: string;
  filename: string;
  type: "image" | "video";
  folder: string;
}

export default function MediaPickerModal({
  onPick,
  onClose,
  typeFilter,
}: {
  onPick: (item: MediaItem) => void;
  onClose: () => void;
  typeFilter?: "image" | "video";
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  /** Deletes the file from the library AND from R2 storage. */
  const del = async (m: MediaItem) => {
    // First call without confirm: the API reports where the file is in use.
    let warning = "";
    try {
      const check = await adminApi.deleteMedia(m.id, false);
      if (check?.warning) warning = check.warning;
    } catch {
      /* fall through to the plain confirmation */
    }
    const msg = warning
      ? `${warning}\n\nDelete "${m.filename}" anyway? It will be removed from storage too.`
      : `Delete "${m.filename}" permanently? It will be removed from storage too.`;
    if (!window.confirm(msg)) return;

    setDeleting(m.id);
    setError("");
    try {
      const out = await adminApi.deleteMedia(m.id, true);
      if (out && out.storageDeleted === false) {
        setError("Removed from the library, but the file could not be deleted from R2.");
      }
      await load();
    } catch (e: any) {
      setError(e?.data?.error || e?.message || "Could not delete the file");
    } finally {
      setDeleting(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminApi.media({ type: typeFilter || "image" });
      setItems(d.assets || d.media || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    setError("");
    try {
      for (const f of files) {
        await uploadToR2(f, (pct) => setProgress(pct));
      }
      await load();
    } catch (err: any) {
      setError(err?.data?.detail || err?.data?.error || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full my-8 max-h-[85vh] flex flex-col shadow-soft">
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderc">
          <h3 className="font-extrabold uppercase">MEDIA LIBRARY</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full border border-borderc hover:bg-bg-soft">✕</button>
        </div>
        <div className="px-6 py-4 border-b border-borderc flex items-center justify-between gap-3">
          <label className="btn-pill btn-primary text-[10px] px-5 py-3 cursor-pointer">
            {uploading ? `UPLOADING ${progress}%...` : "↑ UPLOAD FILE"}
            <input type="file" className="hidden" multiple accept={typeFilter === "video" ? "video/*" : "image/*,video/*"} onChange={handleUpload} disabled={uploading} />
          </label>
          <span className="text-[11px] text-body">Uploads go to Cloudflare R2 via presigned URL</span>
        </div>
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-candy-pink/40 bg-candy-pink/5 p-3">
            <div className="kicker text-candy-pink mb-1">Upload failed</div>
            <p className="text-[12px] text-ink">{error}</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-body text-sm">Loading library...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-body text-sm">Library is empty. Upload your first file above.</div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {items.map((m) => (
                <div key={m.id} className="group relative rounded-lg border border-borderc overflow-hidden bg-bg-soft hover:border-ink transition-colors aspect-square">
                  <button onClick={() => onPick(m)} className="absolute inset-0 w-full h-full" aria-label={`Use ${m.filename}`}>
                    {m.type === "video" ? (
                      <video src={m.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.url} alt={m.filename} loading="lazy" className="w-full h-full object-cover" />
                    )}
                  </button>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] truncate px-2 py-1">
                    {m.filename}
                  </span>
                  <button
                    onClick={() => del(m)}
                    disabled={deleting === m.id}
                    aria-label={`Delete ${m.filename}`}
                    title="Delete from library and storage"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 text-candy-pink border border-borderc flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white"
                  >
                    {deleting === m.id ? (
                      <span className="text-[9px] font-bold">...</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-borderc flex justify-end">
          <button onClick={onClose} className="btn-pill btn-secondary">CANCEL</button>
        </div>
      </div>
    </div>
  );
}
