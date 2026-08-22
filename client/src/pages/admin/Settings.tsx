import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import MediaPickerModal from "./MediaPickerModal";
import { Icon, ICON_KEYS, iconLabel } from "../../components/Icons";

interface SettingRow {
  key: string;
  label: string;
  hint: string;
  media?: boolean;
  /** Where this image shows up on the site, in plain words. */
  where?: string;
  /** Recommended dimensions / format. */
  spec?: string;
  textarea?: boolean;
}

interface CollectionRow {
  id: number;
  name: string;
  slug: string;
  status?: string;
}

interface CharacterRow {
  id: number;
  name: string;
  rarity?: string;
  collectionName?: string;
  imageFront?: string | null;
}

const ATTR_ICONS = [
  { key: "icon_favorite_candy", label: "Favorite Candy", fallback: "candy" },
  { key: "icon_best_friend", label: "Best Friend", fallback: "heart" },
  { key: "icon_birthday", label: "Birthday", fallback: "calendar" },
  { key: "icon_appears_in", label: "Appears In", fallback: "sparkle" },
];

const RARITIES = [
  { key: "common", label: "Common", bg: "#FFE3EF", fg: "#FF5FA2" },
  { key: "rare", label: "Rare", bg: "#EDE7FD", fg: "#9B84E8" },
  { key: "secret_rare", label: "Secret Rare", bg: "#FDF1D6", fg: "#8A6A12" },
];

const SETTINGS: SettingRow[] = [
  {
    key: "logo_header_asset_id",
    label: "Logo — top bar",
    where: "Navigation bar, on every page. Falls back to the YEYPEE wordmark.",
    spec: "Transparent PNG or SVG, around 600 × 160 px.",
    hint: "",
    media: true,
  },
  {
    key: "logo_footer_asset_id",
    label: "Logo — footer",
    where: "Bottom of every page. Falls back to the YEYPEE wordmark.",
    spec: "Transparent PNG or SVG, around 900 × 240 px.",
    hint: "",
    media: true,
  },
  {
    key: "hero_banner_asset_id",
    label: "Homepage hero banner",
    where: "Top of the homepage — the first thing a visitor sees.",
    spec: "Horizontal image, ideally 2400 × 1000 px or wider. The headline and button are drawn on the left, so keep that area free of important artwork.",
    hint: "",
    media: true,
  },
  {
    key: "hero_banner_mobile_asset_id",
    label: "Hero banner — phone & tablet",
    where: "Used instead of the wide banner on screens under 1024px.",
    spec: "Vertical or square, around 1200 × 1600 px. Keep the characters in the lower half — the headline goes on top.",
    hint: "",
    media: true,
  },
  {
    key: "secret_rare_banner_asset_id",
    label: "Secret rare banner",
    where: 'The dark gold “Secret Rare” strip on the homepage.',
    spec: "Wide image, around 2400 × 900 px. The title and button sit on the LEFT, so keep the figure on the right side.",
    hint: "",
    media: true,
  },
  {
    key: "secret_rare_card_asset_id",
    label: "Secret rare card",
    where: 'The dark card at the end of the "Meet the characters" row on the homepage.',
    spec: "Square, around 1000 × 1000 px. Transparent PNG works best over the dark background.",
    hint: "",
    media: true,
  },
  {
    key: "partners_bg_asset_id",
    label: "Where to find YEYPEE — background",
    where: 'Background of the "Where to find YEYPEE" strip on the homepage.',
    spec: "Wide image, around 2400 x 900 px. Keep it calm: the title and logos sit on top.",
    hint: "",
    media: true,
  },
  {
    key: "club_bg_asset_id",
    label: "Join the club — background",
    where: 'Background of the "Join the YEYPEE Club" section.',
    spec: "Wide image, around 2400 x 900 px. Something soft works best behind the form.",
    hint: "",
    media: true,
  },
  {
    key: "club_image_asset_id",
    label: "Join the club — side image",
    where: 'The picture beside the club sign-up form.',
    spec: "Transparent PNG of the character, portrait (around 1024 x 1536 px). It is shown whole, never cropped.",
    hint: "",
    media: true,
  },
  {
    key: "hero_video_asset_id",
    label: "Homepage hero video (optional)",
    where: "Only used if no hero banner is set.",
    spec: "MP4, landscape.",
    hint: "",
    media: true,
  },
  {
    key: "hero_poster_asset_id",
    label: "Hero video poster (optional)",
    where: "Still frame shown while the video loads.",
    spec: "Same dimensions as the video.",
    hint: "",
    media: true,
  },
  { key: "site_name", label: "Site name", hint: "Used in browser tab and emails" },
  { key: "support_email", label: "Support email", hint: "Where contact messages are routed" },
  { key: "welcome_email_template", label: "Welcome email template", hint: "Sent when someone joins the Collector Club", textarea: true },
  { key: "order_confirmation_email_template", label: "Order confirmation template", hint: "Sent after a checkout completes", textarea: true },
  { key: "enable_checkout", label: "Enable checkout", hint: "Turn on real purchase flow (requires payment provider setup)" },
];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, any>>({});
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaKey, setMediaKey] = useState("");
  // key -> url, only for showing a thumbnail of the current selection
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([adminApi.settings(), adminApi.crud("collections").list(), adminApi.crud("characters").list()])
      .then(([settings, colls, chars]) => {
        setValues(settings.settings || {});
        setPreviews(settings.previews || {});
        setCollections(colls.collections || []);
        setCharacters(chars.characters || []);
      })
      .catch(() => setValues({}))
      .finally(() => setLoading(false));
  }, []);

  const featuredCollectionId = values.featured_collection_id ? Number(values.featured_collection_id) : null;
  const carouselIds: number[] = Array.isArray(values.carousel_character_ids)
    ? (values.carousel_character_ids as number[])
    : [];
  const secretRareCharacterId = values.secret_rare_character_id ? Number(values.secret_rare_character_id) : null;

  const toggleCarousel = (id: number) => {
    setValues((v: Record<string, any>) => {
      const ids: number[] = Array.isArray(v.carousel_character_ids) ? v.carousel_character_ids : [];
      return {
        ...v,
        carousel_character_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      };
    });
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Normalize homepage highlight keys before sending
      await adminApi.patchSettings({
        ...values,
        featured_collection_id: featuredCollectionId,
        secret_rare_character_id: secretRareCharacterId,
        carousel_character_ids: carouselIds,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      alert(e?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-body text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-body">Site-wide settings. Changes take effect immediately.</p>
        <div className="flex gap-2">
          {saved && <span className="self-center badge-pink" style={{ background: "#E6F7EE", color: "#2E7D4F" }}>SAVED ✓</span>}
          <button onClick={save} disabled={saving} className="btn-pill btn-primary text-[10px] px-5 py-3">
            {saving ? "SAVING..." : "SAVE SETTINGS"}
          </button>
        </div>
      </div>

      {/* Homepage highlights */}
      <h3 className="text-lg font-extrabold uppercase tracking-tight mb-3">Homepage highlights</h3>
      <div className="bg-white rounded-xl border border-borderc divide-y divide-borderc max-w-2xl mb-8">
        <div className="p-5">
          <div className="kicker text-body mb-1.5">Featured collection</div>
          <select
            value={featuredCollectionId ?? ""}
            onChange={(e) => setValues({ ...values, featured_collection_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink"
          >
            <option value="">— Auto (first collection) —</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.status === "coming_soon" ? " (coming soon)" : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-body mt-1.5">The collection highlighted on the homepage hero area. If unset, the first collection is used.</p>
        </div>
        <div className="p-5">
          <div className="kicker text-body mb-1.5">Character carousel (show on homepage)</div>
          <p className="text-[11px] text-body mb-3">Tick the characters that should appear in the "Meet the characters" carousel. If none is selected, all non-secret-rare characters are shown.</p>
          {characters.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {characters.map((ch) => (
                <label key={ch.id} className="flex items-center gap-2 border border-borderc rounded-lg px-3 py-2 cursor-pointer hover:bg-bg-soft">
                  <input
                    type="checkbox"
                    checked={carouselIds.includes(ch.id)}
                    onChange={() => toggleCarousel(ch.id)}
                    className="w-4 h-4 accent-black"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    {ch.imageFront ? (
                      <img src={ch.imageFront} alt="" className="h-6 w-6 object-contain shrink-0" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-candy-pink/20 shrink-0" />
                    )}
                    <span className="text-xs font-semibold truncate">{ch.name}</span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-body">No characters yet. Create them in the Characters module.</span>
          )}
        </div>
        <div className="p-5">
          <div className="kicker text-body mb-1.5">Secret rare character</div>
          <select
            value={secretRareCharacterId ?? ""}
            onChange={(e) => setValues({ ...values, secret_rare_character_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink"
          >
            <option value="">— Auto (rarity = secret rare) —</option>
            {characters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name} ({ch.collectionName})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-body mt-1.5">The character highlighted in the Secret Rare section. If unset, the character with rarity "secret rare" is used.</p>
        </div>
      </div>

      {/* Character card styling */}
      <h3 className="text-lg font-extrabold uppercase tracking-tight mb-3">Character details</h3>
      <div className="bg-white rounded-xl border border-borderc divide-y divide-borderc max-w-2xl mb-8">
        <div className="p-5">
          <div className="kicker text-body mb-1.5">Icons</div>
          <p className="text-[11px] text-body mb-4">
            Shown next to each fact on a character's page. The same icon is used for every character.
          </p>
          <div className="space-y-5">
            {ATTR_ICONS.map((a) => {
              const current = values[a.key] || a.fallback;
              return (
                <div key={a.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={current} size={20} />
                    <span className="text-[13px] font-bold">{a.label}</span>
                    <span className="text-[11px] text-body">— {iconLabel(current)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_KEYS.map((k) => (
                      <button
                        key={k}
                        onClick={() => setValues({ ...values, [a.key]: k })}
                        title={iconLabel(k)}
                        aria-label={iconLabel(k)}
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                          current === k ? "bg-ink text-white border-ink" : "bg-white border-borderc text-body hover:border-ink"
                        }`}
                      >
                        <Icon name={k} size={19} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          <div className="kicker text-body mb-1.5">Rarity label colours</div>
          <p className="text-[11px] text-body mb-4">
            The little badge shown on character cards and detail pages.
          </p>
          <div className="space-y-4">
            {RARITIES.map((r) => {
              const bg = values[`rarity_${r.key}_bg`] || r.bg;
              const fg = values[`rarity_${r.key}_fg`] || r.fg;
              return (
                <div key={r.key} className="flex flex-wrap items-center gap-4">
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-md"
                    style={{ background: bg, color: fg }}
                  >
                    {r.label}
                  </span>
                  <label className="flex items-center gap-2 text-[11px] text-body">
                    Background
                    <input
                      type="color"
                      value={bg}
                      onChange={(e) => setValues({ ...values, [`rarity_${r.key}_bg`]: e.target.value })}
                      className="w-9 h-9 rounded border border-borderc bg-white cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-body">
                    Text
                    <input
                      type="color"
                      value={fg}
                      onChange={(e) => setValues({ ...values, [`rarity_${r.key}_fg`]: e.target.value })}
                      className="w-9 h-9 rounded border border-borderc bg-white cursor-pointer"
                    />
                  </label>
                  <button
                    onClick={() =>
                      setValues({ ...values, [`rarity_${r.key}_bg`]: r.bg, [`rarity_${r.key}_fg`]: r.fg })
                    }
                    className="text-[11px] font-bold text-body underline"
                  >
                    Reset
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-extrabold uppercase tracking-tight mb-3">General</h3>
      <div className="bg-white rounded-xl border border-borderc divide-y divide-borderc max-w-2xl">
        {SETTINGS.map((s) => (
          <div key={s.key} className="p-5">
            <div className="kicker text-body mb-1.5">{s.label}</div>
            {s.media ? (
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => { setMediaKey(s.key); setMediaPickerOpen(true); }} className="btn-pill btn-secondary text-[10px] px-5 py-3">PICK FROM MEDIA LIBRARY</button>
                {values[s.key] ? (
                  <div className="flex items-center gap-2">
                    {previews[s.key] ? (
                      <img src={previews[s.key]} alt="" className="h-14 rounded-lg border border-borderc object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold text-body bg-bg-soft border border-borderc rounded-lg px-2 py-1">Media #{values[s.key]}</span>
                    )}
                    <button
                      onClick={() => { setValues({ ...values, [s.key]: null }); setPreviews({ ...previews, [s.key]: "" }); }}
                      className="text-xs text-candy-pink font-bold underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-body">Not set</span>
                )}
              </div>
            ) : s.textarea ? (
              <textarea
                value={values[s.key] || ""}
                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                rows={5}
                className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink font-mono"
              />
            ) : s.key === "enable_checkout" ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values[s.key] === "true" || values[s.key] === true}
                  onChange={(e) => setValues({ ...values, [s.key]: e.target.checked })}
                  className="w-4 h-4 accent-black"
                />
                <span className="text-sm">Enabled</span>
              </label>
            ) : (
              <input
                value={values[s.key] || ""}
                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink"
              />
            )}
            {s.where && <p className="text-[11px] font-semibold text-ink mt-2">Where it appears: <span className="font-normal text-body">{s.where}</span></p>}
            {s.spec && <p className="text-[11px] text-body mt-0.5">{s.spec}</p>}
            {s.hint && <p className="text-[11px] text-body mt-1.5">{s.hint}</p>}
          </div>
        ))}
      </div>

      {mediaPickerOpen && (
        <MediaPickerModal
          onPick={(item) => {
            // Settings keys ending in _asset_id store the media id; the url is
            // kept apart just to render the thumbnail.
            setValues({ ...values, [mediaKey]: item.id });
            setPreviews({ ...previews, [mediaKey]: item.url });
            setMediaPickerOpen(false);
          }}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}
    </div>
  );
}
