import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";
import MediaPickerModal, { type MediaItem } from "./MediaPickerModal";

/**
 * The image slots the site actually renders, so it's obvious what needs to be
 * uploaded and where each file ends up.
 *
 * - "site" slots live in site_settings and are assigned right here.
 * - "content" slots belong to an individual record (a collection, a character,
 *   a product...) and are assigned from that record's own module.
 */

interface SiteSlot {
  kind: "site";
  key: string;
  label: string;
  where: string;
  spec: string;
  type?: "image" | "video";
}

interface ContentSlot {
  kind: "content";
  label: string;
  where: string;
  spec: string;
  to: string;
  module: string;
}

const SITE_SLOTS: SiteSlot[] = [
  {
    kind: "site",
    key: "logo_header_asset_id",
    label: "Logo — top bar",
    where: "Replaces the YEYPEE wordmark in the navigation bar, on every page.",
    spec: "Transparent PNG or SVG, wide format, around 600 × 160 px. It is drawn at 32px tall.",
  },
  {
    kind: "site",
    key: "logo_footer_asset_id",
    label: "Logo — footer",
    where: "Replaces the big YEYPEE wordmark at the bottom of every page.",
    spec: "Transparent PNG or SVG, around 900 × 240 px. It is drawn at 56px tall.",
  },
  {
    kind: "site",
    key: "hero_banner_asset_id",
    label: "Homepage hero banner",
    where: "Very top of the homepage — the first thing a visitor sees.",
    spec: "Horizontal, 2400 × 1000 px or wider. The headline and button sit on the LEFT, so keep that area free of important artwork.",
  },
  {
    kind: "site",
    key: "hero_banner_mobile_asset_id",
    label: "Hero banner — phone & tablet",
    where: "Replaces the wide banner on phones and tablets (screens under 1024px).",
    spec: "Vertical or square, around 1200 × 1600 px. The headline sits at the TOP, so put the characters in the LOWER half.",
  },
  {
    kind: "site",
    key: "secret_rare_banner_asset_id",
    label: "Secret rare banner",
    where: 'The dark gold “Secret Rare” strip on the homepage.',
    spec: "Wide image, around 2400 × 900 px. The title and button sit on the LEFT, so keep the figure on the right side.",
  },
  {
    kind: "site",
    key: "hero_video_asset_id",
    label: "Homepage hero video (optional)",
    where: "Replaces the banner only if no banner is set.",
    spec: "MP4, landscape.",
    type: "video",
  },
  {
    kind: "site",
    key: "hero_poster_asset_id",
    label: "Hero video poster (optional)",
    where: "Still frame shown while the video loads.",
    spec: "Same size as the video.",
  },
];

const CONTENT_SLOTS: ContentSlot[] = [
  {
    kind: "content",
    label: "Collection hero image",
    where: "Banner at the top of each collection's page.",
    spec: "Horizontal, 2000 × 900 px or wider.",
    to: "/admin/collections",
    module: "Collections",
  },
  {
    kind: "content",
    label: "Collection card image",
    where: "Thumbnail in the collections grid and on the homepage.",
    spec: "Square, 1000 × 1000 px.",
    to: "/admin/collections",
    module: "Collections",
  },
  {
    kind: "content",
    label: "Character images (front / side / back)",
    where: "Character cards and the character detail page.",
    spec: "Square, 1200 × 1200 px. Transparent PNG works best.",
    to: "/admin/characters",
    module: "Characters",
  },
  {
    kind: "content",
    label: "Product image",
    where: "Shop listing and product page.",
    spec: "Square, 1200 × 1200 px.",
    to: "/admin/products",
    module: "Products",
  },
  {
    kind: "content",
    label: "News thumbnail",
    where: "News cards on the homepage and news list.",
    spec: "Landscape, 1200 × 800 px.",
    to: "/admin/news",
    module: "News",
  },
  {
    kind: "content",
    label: "Retail partner logo",
    where: '"Where to buy" partner strip.',
    spec: "Transparent PNG, around 400 × 200 px.",
    to: "/admin/partners",
    module: "Retail Partners",
  },
];

export default function ImageSlots({ onChanged }: { onChanged?: () => void }) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<SiteSlot | null>(null);
  const [saving, setSaving] = useState("");
  const [open, setOpen] = useState(true);
  const [diag, setDiag] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkR2 = async () => {
    setChecking(true);
    try {
      setDiag(await adminApi.r2Status());
    } catch (e: any) {
      setDiag({ reachable: false, error: e?.data?.error || e?.message || "Could not run the check" });
    } finally {
      setChecking(false);
    }
  };

  const load = () => {
    adminApi
      .settings()
      .then((d) => {
        setValues(d.settings || {});
        setPreviews(d.previews || {});
      })
      .catch(() => undefined);
  };

  useEffect(load, []);

  const assign = async (slot: SiteSlot, item: MediaItem | null) => {
    setSaving(slot.key);
    try {
      await adminApi.patchSettings({ [slot.key]: item ? item.id : null });
      setValues((v) => ({ ...v, [slot.key]: item ? item.id : null }));
      setPreviews((p) => ({ ...p, [slot.key]: item ? item.url : "" }));
      onChanged?.();
    } catch (e: any) {
      alert(e?.data?.error || e?.message || "Could not save");
    } finally {
      setSaving("");
      setPickerFor(null);
    }
  };

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-3 text-left"
      >
        <h3 className="text-lg font-extrabold uppercase tracking-tight">Where images go</h3>
        <span className="text-body text-xs">{open ? "▲ hide" : "▼ show"}</span>
      </button>

      {open && (
        <>
          <p className="text-[13px] text-body mb-3 max-w-3xl">
            Upload your files with the button above — that only puts them in the library. Then assign
            each one to its slot below.
          </p>

          <div className="mb-5">
            <button onClick={checkR2} disabled={checking} className="btn-pill btn-secondary text-[9px] px-4 py-2.5">
              {checking ? "CHECKING..." : "CHECK R2 CONNECTION"}
            </button>
            {diag && (
              <div className="mt-3 rounded-xl border border-borderc bg-white p-4 max-w-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[9px] font-bold px-2 py-1 rounded-md"
                    style={diag.reachable ? { background: "#E6F7EE", color: "#2E7D4F" } : { background: "#FDE8F0", color: "#D6336C" }}
                  >
                    {diag.reachable ? "STORAGE OK" : "STORAGE PROBLEM"}
                  </span>
                  <span className="text-[11px] text-body">
                    {diag.reachable
                      ? "The server can read and write the bucket. If uploads still fail, the problem is the bucket's CORS rule."
                      : "The server itself cannot use the bucket — fix this before retrying an upload."}
                  </span>
                </div>
                <dl className="text-[11px] text-body grid grid-cols-[130px_1fr] gap-y-1">
                  <dt className="font-bold text-ink">Bucket</dt>
                  <dd>{diag.bucket || "(empty)"}</dd>
                  <dt className="font-bold text-ink">Endpoint</dt>
                  <dd>{diag.endpointHost || "(empty)"}</dd>
                  <dt className="font-bold text-ink">Public URL</dt>
                  <dd>{diag.publicUrl || "(empty)"}</dd>
                  {diag.missing?.length ? (
                    <>
                      <dt className="font-bold text-ink">Missing vars</dt>
                      <dd className="text-candy-pink font-bold">{diag.missing.join(", ")}</dd>
                    </>
                  ) : null}
                  {diag.error ? (
                    <>
                      <dt className="font-bold text-ink">Error</dt>
                      <dd className="text-candy-pink">{diag.error}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            )}
          </div>

          <div className="kicker text-body mb-2">Site-wide — assign here</div>
          <div className="grid gap-3 md:grid-cols-3 mb-6">
            {SITE_SLOTS.map((s) => {
              const filled = values[s.key];
              return (
                <div key={s.key} className="bg-white rounded-xl border border-borderc p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13px] font-extrabold leading-tight">{s.label}</div>
                    <span
                      className="text-[9px] font-bold px-2 py-1 rounded-md shrink-0"
                      style={
                        filled
                          ? { background: "#E6F7EE", color: "#2E7D4F" }
                          : { background: "#F3F3F3", color: "#8A8A8A" }
                      }
                    >
                      {filled ? "SET" : "EMPTY"}
                    </span>
                  </div>
                  <p className="text-[11px] text-body mt-1.5">{s.where}</p>
                  <p className="text-[11px] text-body mt-1 italic">{s.spec}</p>

                  <div className="mt-3 rounded-lg bg-bg-soft border border-borderc h-24 flex items-center justify-center overflow-hidden">
                    {previews[s.key] ? (
                      <img src={previews[s.key]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-body">Nothing assigned</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setPickerFor(s)}
                      disabled={saving === s.key}
                      className="btn-pill btn-secondary text-[9px] px-4 py-2.5 flex-1"
                    >
                      {saving === s.key ? "SAVING..." : filled ? "REPLACE" : "CHOOSE FILE"}
                    </button>
                    {filled ? (
                      <button
                        onClick={() => assign(s, null)}
                        className="text-[9px] font-bold uppercase px-3 py-2.5 rounded border border-candy-pink/30 text-candy-pink hover:bg-candy-pink/10"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="kicker text-body mb-2">Per content — assign inside each module</div>
          <div className="bg-white rounded-xl border border-borderc divide-y divide-borderc">
            {CONTENT_SLOTS.map((s) => (
              <div key={s.label} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold">{s.label}</div>
                  <p className="text-[11px] text-body mt-0.5">{s.where}</p>
                  <p className="text-[11px] text-body italic">{s.spec}</p>
                </div>
                <Link to={s.to} className="btn-pill btn-secondary text-[9px] px-4 py-2.5 shrink-0">
                  GO TO {s.module.toUpperCase()}
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {pickerFor && (
        <MediaPickerModal
          typeFilter={pickerFor.type === "video" ? "video" : "image"}
          onPick={(item) => assign(pickerFor, item)}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}
