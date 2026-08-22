import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { FOOTER_PAGES } from "../../lib/footerPages";
import MediaPickerModal from "./MediaPickerModal";

/**
 * Editor for the four footer pages. Their copy lives in site_settings under
 * page_<slug>_title / _body / _image_N, so nothing here needs a database
 * migration when a page is added.
 */
export default function AdminPages() {
  const [values, setValues] = useState<Record<string, any>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [active, setActive] = useState(FOOTER_PAGES[0].slug);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickerKey, setPickerKey] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .settings()
      .then((d) => {
        setValues(d.settings || {});
        setPreviews(d.previews || {});
      })
      .catch(() => undefined);
  }, []);

  const page = FOOTER_PAGES.find((p) => p.slug === active)!;
  const set = (key: string, value: any) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const p of FOOTER_PAGES) {
        payload[`page_${p.slug}_title`] = values[`page_${p.slug}_title`] ?? "";
        payload[`page_${p.slug}_body`] = values[`page_${p.slug}_body`] ?? "";
        for (let i = 1; i <= p.images; i++) {
          payload[`page_${p.slug}_image_${i}_asset_id`] =
            values[`page_${p.slug}_image_${i}_asset_id`] ?? null;
        }
      }
      for (const k of [
        "popup_enabled",
        "popup_pages",
        "popup_trigger",
        "popup_delay",
        "popup_frequency",
        "popup_title",
        "popup_body",
        "popup_button_label",
        "popup_button_url",
      ]) {
        payload[k] = values[k] ?? "";
      }
      payload.popup_image_asset_id = values.popup_image_asset_id ?? null;
      await adminApi.patchSettings(payload);
      setSaved(true);
    } catch (e: any) {
      alert(e?.data?.error || e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {FOOTER_PAGES.map((p) => (
            <button
              key={p.slug}
              onClick={() => setActive(p.slug)}
              className={`btn-label px-4 py-2.5 rounded-full border transition-colors ${
                active === p.slug
                  ? "bg-ink text-white border-ink"
                  : "bg-white border-borderc text-body hover:border-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-[11px] font-bold text-green-700">SAVED</span>}
          <a
            href={`/${page.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold text-body underline"
          >
            VIEW PAGE
          </a>
          <button onClick={save} disabled={saving} className="btn-pill btn-primary text-[10px] px-5 py-3">
            {saving ? "SAVING..." : "SAVE ALL"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderc p-5 max-w-3xl">
        <label className="kicker text-body block mb-1.5">Page title</label>
        <input
          value={values[`page_${page.slug}_title`] ?? ""}
          onChange={(e) => set(`page_${page.slug}_title`, e.target.value)}
          placeholder={page.fallbackTitle}
          className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink mb-5"
        />

        <label className="kicker text-body block mb-1.5">Content</label>
        <p className="text-[11px] text-body mb-2">
          Leave a blank line between paragraphs. Start a line with <b>## </b> for a section heading.
          {page.slug === "faq" && (
            <>
              {" "}
              For questions use <b>Q:</b> on one line and <b>A:</b> on the next.
            </>
          )}
        </p>
        <textarea
          value={values[`page_${page.slug}_body`] ?? ""}
          onChange={(e) => set(`page_${page.slug}_body`, e.target.value)}
          placeholder={page.fallbackBody}
          rows={18}
          className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink font-mono text-[13px] leading-relaxed"
        />
        <p className="text-[11px] text-body mt-2">
          Empty means the default text keeps showing on the site.
        </p>

        {page.images > 0 && (
          <div className="mt-6">
            <div className="kicker text-body mb-1.5">Images</div>
            <p className="text-[11px] text-body mb-3">
              The first one shows full width under the title; the rest go at the bottom, side by side.
            </p>
            <div className="space-y-3">
              {Array.from({ length: page.images }, (_, i) => i + 1).map((n) => {
                const key = `page_${page.slug}_image_${n}_asset_id`;
                const url = previews[key];
                return (
                  <div key={key} className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-body w-16">Image {n}</span>
                    {values[key] ? (
                      url ? (
                        <img src={url} alt="" className="h-14 w-24 object-cover rounded-lg border border-borderc" />
                      ) : (
                        <span className="text-[11px] font-bold text-body bg-bg-soft border border-borderc rounded-lg px-2 py-1">
                          Media #{values[key]}
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-body">Not set</span>
                    )}
                    <button
                      onClick={() => setPickerKey(key)}
                      className="btn-pill btn-secondary text-[9px] px-4 py-2.5"
                    >
                      {values[key] ? "REPLACE" : "CHOOSE"}
                    </button>
                    {values[key] ? (
                      <button
                        onClick={() => {
                          set(key, null);
                          setPreviews((p) => ({ ...p, [key]: "" }));
                        }}
                        className="text-[10px] font-bold uppercase text-candy-pink"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Popup */}
      <h3 className="text-lg font-extrabold uppercase tracking-tight mt-10 mb-3">Popup</h3>
      <div className="bg-white rounded-xl border border-borderc p-5 max-w-3xl space-y-5">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={String(values.popup_enabled) === "true"}
            onChange={(e) => set("popup_enabled", e.target.checked ? "true" : "false")}
            className="w-4 h-4"
          />
          <span className="text-[13px] font-bold">Show the popup on the site</span>
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="kicker text-body block mb-1.5">Where it appears</label>
            <select
              value={values.popup_pages || "all"}
              onChange={(e) => set("popup_pages", e.target.value)}
              className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink bg-white"
            >
              <option value="all">Every page</option>
              <option value="home">Homepage only</option>
              <option value="collections">Collections pages</option>
              <option value="characters">Character pages</option>
              <option value="shop">Shop page</option>
            </select>
          </div>

          <div>
            <label className="kicker text-body block mb-1.5">When it opens</label>
            <select
              value={values.popup_trigger || "time"}
              onChange={(e) => set("popup_trigger", e.target.value)}
              className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink bg-white"
            >
              <option value="time">After a few seconds</option>
              <option value="scroll">After scrolling down</option>
              <option value="exit">When the visitor is about to leave</option>
            </select>
          </div>

          {(values.popup_trigger || "time") !== "exit" && (
            <div>
              <label className="kicker text-body block mb-1.5">
                {(values.popup_trigger || "time") === "scroll" ? "Percent scrolled" : "Seconds to wait"}
              </label>
              <input
                type="number"
                value={values.popup_delay ?? ((values.popup_trigger || "time") === "scroll" ? 50 : 5)}
                onChange={(e) => set("popup_delay", e.target.value)}
                className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink"
              />
            </div>
          )}

          <div>
            <label className="kicker text-body block mb-1.5">How often</label>
            <select
              value={values.popup_frequency || "session"}
              onChange={(e) => set("popup_frequency", e.target.value)}
              className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink bg-white"
            >
              <option value="session">Once per visit</option>
              <option value="day">Once a day</option>
              <option value="always">Every time</option>
            </select>
          </div>
        </div>

        <div>
          <label className="kicker text-body block mb-1.5">Banner image (shown above the text)</label>
          <div className="flex items-center gap-3 flex-wrap">
            {values.popup_image_asset_id ? (
              previews.popup_image_asset_id ? (
                <img src={previews.popup_image_asset_id} alt="" className="h-16 w-28 object-cover rounded-lg border border-borderc" />
              ) : (
                <span className="text-[11px] font-bold text-body bg-bg-soft border border-borderc rounded-lg px-2 py-1">
                  Media #{values.popup_image_asset_id}
                </span>
              )
            ) : (
              <span className="text-[11px] text-body">Not set</span>
            )}
            <button onClick={() => setPickerKey("popup_image_asset_id")} className="btn-pill btn-secondary text-[9px] px-4 py-2.5">
              {values.popup_image_asset_id ? "REPLACE" : "CHOOSE"}
            </button>
            {values.popup_image_asset_id ? (
              <button
                onClick={() => {
                  set("popup_image_asset_id", null);
                  setPreviews((p) => ({ ...p, popup_image_asset_id: "" }));
                }}
                className="text-[10px] font-bold uppercase text-candy-pink"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-body mt-2">Horizontal, around 900 x 500 px.</p>
        </div>

        <div>
          <label className="kicker text-body block mb-1.5">Title</label>
          <input
            value={values.popup_title ?? ""}
            onChange={(e) => set("popup_title", e.target.value)}
            placeholder="NEW COLLECTION OUT NOW!"
            className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="kicker text-body block mb-1.5">Text</label>
          <textarea
            value={values.popup_body ?? ""}
            onChange={(e) => set("popup_body", e.target.value)}
            rows={4}
            placeholder="Wild Friends is here. Seven characters to collect plus a secret rare."
            className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="kicker text-body block mb-1.5">Button label</label>
            <input
              value={values.popup_button_label ?? ""}
              onChange={(e) => set("popup_button_label", e.target.value)}
              placeholder="SEE THE COLLECTION"
              className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="kicker text-body block mb-1.5">Button link</label>
            <input
              value={values.popup_button_url ?? ""}
              onChange={(e) => set("popup_button_url", e.target.value)}
              placeholder="/collections/wild-friends"
              className="w-full rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink"
            />
            <p className="text-[11px] text-body mt-1">Start with / for a page of this site.</p>
          </div>
        </div>
      </div>

      {pickerKey && (
        <MediaPickerModal
          typeFilter="image"
          onPick={(item) => {
            set(pickerKey, item.id);
            setPreviews((p) => ({ ...p, [pickerKey]: item.url }));
            setPickerKey(null);
          }}
          onClose={() => setPickerKey(null)}
        />
      )}
    </div>
  );
}
