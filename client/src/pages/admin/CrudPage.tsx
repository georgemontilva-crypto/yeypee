import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/api";
import MediaPickerModal, { type MediaItem } from "./MediaPickerModal";

/** Companion form key that holds a media preview URL; never sent to the API. */
const PREVIEW_SUFFIX = "__previewUrl";

/**
 * The API expects ids as numbers (collectionId, heroImageId, ...) but <select>
 * and <input> always hand back strings. This normalises the form before saving
 * and drops the preview-only keys.
 */
function normalizePayload(form: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(form)) {
    if (key.endsWith(PREVIEW_SUFFIX)) continue;
    if (key.endsWith("Id") && key !== "id") {
      if (value === "" || value === null || value === undefined) {
        out[key] = null;
        continue;
      }
      const asNumber = Number(value);
      out[key] = Number.isFinite(asNumber) ? asNumber : value;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export interface FieldSpec {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "media";
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
}

interface CrudPageProps {
  entity: string;
  fields: FieldSpec[];
  labelSingular: string;
  title: string;
  /** Columns rendered in the list */
  columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[];
  /** Transform db row into form state for the modal */
  toForm?: (row: any) => Record<string, any>;
  /** Parse form state back before saving */
  toPayload?: (form: Record<string, any>) => Record<string, any>;
  /** Optional row actions (e.g., view detail link) */
  rowAction?: (row: any) => React.ReactNode;
  importable?: boolean;
}

export default function CrudPage({ entity, fields, labelSingular, title, columns, toForm, toPayload, rowAction, importable }: CrudPageProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaField, setMediaField] = useState<string | null>(null);

  const pageSize = 25;

  // API response key for this entity (e.g. "retail-partners" → "retailPartners")
  const responseKey = useMemo(() => {
    if (entity === "retail-partners") return "retailPartners";
    if (entity === "news") return "newsPosts";
    return entity;
  }, [entity]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), pageSize: String(pageSize) };
      if (search) params.search = search;
      if (status) params.status = status;
      const d = await adminApi.crud(entity).list(params);
      const list = (d && (d[responseKey] ?? d.rows)) || [];
      setRows(list);
      setPage(p);
      setTotalPages(Math.max(1, Math.ceil((d?.total ?? list.length) / pageSize)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [entity]);

  const openCreate = () => {
    setEditing(null);
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "boolean") initial[f.key] = false;
      else if (f.type === "number") initial[f.key] = "";
      else if (f.type === "select" && f.options?.length) initial[f.key] = f.options[0].value;
      else initial[f.key] = "";
    });
    setForm(initial);
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm(toForm ? toForm(row) : row);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = normalizePayload(toPayload ? toPayload(form) : form);
      if (editing) {
        await adminApi.crud(entity).patch(editing.id, payload);
      } else {
        await adminApi.crud(entity).create(payload);
      }
      setModalOpen(false);
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async (row: any) => {
    if (!window.confirm(`Delete "${row.name || row.title || row.email || row.id}"? This cannot be undone.`)) return;
    try {
      await adminApi.crud(entity).del(row.id, true);
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || e.message || "Delete failed");
    }
  };

  const reorderStart = useMemo(() => {
    // sort control enabled for entities whose schema has sort_order
    return ["collections", "characters", "products", "news", "retail-partners", "stores"].includes(entity);
  }, [entity]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= rows.length) return;
    const nextRows = [...rows];
    [nextRows[index], nextRows[next]] = [nextRows[next], nextRows[index]];
    setRows(nextRows);
    try {
      await adminApi.reorder(entity, nextRows.map((r) => r.id));
    } catch {
      await load(page);
    }
  };

  const openMediaFor = (field: string) => {
    setMediaField(field);
    setMediaPickerOpen(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${labelSingular.toLowerCase()}...`}
            className="rounded-lg border border-borderc bg-white px-4 py-2.5 text-sm outline-none focus:border-ink w-56"
          />
          {status && (
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-borderc bg-white px-3 py-2.5 text-sm">
              <option value="">All statuses</option>
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {importable && (
            <button onClick={() => alert("Use the CSV import feature in this module (see hint on module page).")} className="btn-pill btn-secondary text-[10px] px-5 py-3">
              IMPORT CSV
            </button>
          )}
          <button onClick={openCreate} className="btn-pill btn-primary text-[10px] px-5 py-3">
            + NEW {labelSingular.toUpperCase()}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderc overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-body text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-body text-sm">
            No {entity.replace("-", " ")} yet. Create the first one with the button above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borderc text-left">
                {reorderStart && <th className="w-10" />}
                {columns.map((c) => (
                  <th key={c.key} className="kicker text-body py-3 px-4 font-bold whitespace-nowrap">{c.label}</th>
                ))}
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, i: number) => (
                <tr key={row.id} className="border-b border-borderc last:border-0 hover:bg-bg-soft/50 transition-colors">
                  {reorderStart && (
                    <td className="px-2 py-2">
                      <div className="flex flex-col">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="text-[10px] text-body disabled:opacity-30">▲</button>
                        <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-[10px] text-body disabled:opacity-30">▼</button>
                      </div>
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className="py-3 px-4 whitespace-nowrap">
                      {c.render ? c.render(row[c.key], row) : row[c.key] ?? "—"}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      {rowAction?.(row)}
                      <button onClick={() => openEdit(row)} className="text-xs font-bold text-body hover:text-ink underline">EDIT</button>
                      <button onClick={() => del(row)} className="text-xs font-bold text-candy-pink hover:opacity-80">DELETE</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="btn-pill btn-secondary text-[10px] px-5 py-3">‹ PREV</button>
          <span className="self-center text-sm text-body">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="btn-pill btn-secondary text-[10px] px-5 py-3">NEXT ›</button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full my-8 shadow-soft p-6">
            <h3 className="text-xl font-extrabold uppercase mb-5">{editing ? `Edit ${labelSingular}` : `New ${labelSingular}`}</h3>
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="kicker text-body block mb-1.5">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink"
                    />
                  ) : f.type === "select" ? (
                    <select
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm bg-white"
                    >
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.type === "boolean" ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm">Enabled</span>
                    </label>
                  ) : f.type === "media" ? (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => openMediaFor(f.key)} className="btn-pill btn-secondary text-[10px] px-5 py-3">
                        PICK FROM MEDIA LIBRARY
                      </button>
                      {form[f.key] ? (
                        <div className="flex items-center gap-2">
                          {form[`${f.key}${PREVIEW_SUFFIX}`] ? (
                            <img src={form[`${f.key}${PREVIEW_SUFFIX}`]} alt="" className="h-12 rounded-lg border border-borderc object-cover" />
                          ) : (
                            <span className="text-[11px] font-bold text-body bg-bg-soft border border-borderc rounded-lg px-2 py-1">
                              Media #{form[f.key]}
                            </span>
                          )}
                          <button
                            onClick={() => setForm({ ...form, [f.key]: null, [`${f.key}${PREVIEW_SUFFIX}`]: "" })}
                            className="text-xs text-candy-pink font-bold underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink"
                    />
                  )}
                  {f.hint && <p className="text-[11px] text-body mt-1">{f.hint}</p>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="btn-pill btn-secondary">CANCEL</button>
              <button onClick={save} disabled={saving} className="btn-pill btn-primary">{saving ? "SAVING..." : "SAVE"}</button>
            </div>
          </div>
        </div>
      )}

      {mediaPickerOpen && mediaField && (
        <MediaPickerModal
          onPick={(item: MediaItem) => {
            // The API stores media by id (heroImageId, imageId, ...). We keep the
            // url only for the preview, under a companion key that is stripped
            // out before saving.
            setForm({ ...form, [mediaField]: item.id, [`${mediaField}${PREVIEW_SUFFIX}`]: item.url });
            setMediaPickerOpen(false);
          }}
          onClose={() => setMediaPickerOpen(false)}
          typeFilter="image"
        />
      )}
    </div>
  );
}
