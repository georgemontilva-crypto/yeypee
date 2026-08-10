import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

const EXAMPLE_CSV = `name,zip,radius
"Flagship Store",10001,25
"Midtown Toys",10019,10
"Downtown Fun Shop",10013,10`;

export default function AdminStores() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState(EXAMPLE_CSV);
  const [importResult, setImportResult] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState<any>({ name: "", address: "", city: "", state: "", zip: "", zipRadius: 25, partnerName: "" });

  const pageSize = 50;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const d = await adminApi.crud("stores").list({ page: String(p), pageSize: String(pageSize), search });
      setStores(d.rows);
      setPage(p);
      setTotalPages(Math.max(1, Math.ceil((d.total ?? d.rows.length) / pageSize)));
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [search]);

  const importCsv = async () => {
    const rows = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.toLowerCase().startsWith("name"));
    const parsed = rows.map((l) => {
      // simple CSV parse respecting quoted fields
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else current += ch;
      }
      cells.push(current.trim());
      return { name: cells[0] || "", zip: cells[1] || "", radius: cells[2] || "25" };
    }).filter((r) => r.name && r.zip);
    setSaving(true);
    try {
      const d = await adminApi.importStores(parsed);
      setImportResult(d.created);
      await load(1);
    } catch (e: any) {
      alert(e?.data?.error || "Import failed");
    } finally {
      setSaving(false);
    }
  };

  const addStore = async () => {
    if (!adding.name || !adding.zip) return;
    try {
      await adminApi.crud("stores").create({ ...adding, zipRadius: Number(adding.zipRadius) });
      setAdding({ name: "", address: "", city: "", state: "", zip: "", zipRadius: 25, partnerName: "" });
      await load(1);
    } catch (e: any) {
      alert(e?.data?.error || "Save failed");
    }
  };

  const del = async (row: any) => {
    if (!window.confirm(`Delete store "${row.name}"?`)) return;
    try {
      await adminApi.crud("stores").del(row.id, true);
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stores..."
          className="rounded-lg border border-borderc bg-white px-4 py-2.5 text-sm outline-none focus:border-ink w-56"
        />
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="btn-pill btn-secondary text-[10px] px-5 py-3">IMPORT CSV</button>
          <button onClick={() => setImportOpen(true)} className="btn-pill btn-primary text-[10px] px-5 py-3">+ NEW STORE</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderc overflow-x-auto mb-6">
        {loading ? (
          <div className="p-10 text-center text-body text-sm">Loading...</div>
        ) : stores.length === 0 ? (
          <div className="p-10 text-center text-body text-sm">
            No stores yet. Use IMPORT CSV to bulk-add store locations, or create one manually.
            <div className="mt-4">
              <button onClick={() => setImportOpen(true)} className="btn-pill btn-secondary text-[10px] px-5 py-3">IMPORT CSV</button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borderc text-left">
                {["NAME", "ADDRESS", "ZIP", "RADIUS", "PARTNER"].map((h) => (
                  <th key={h} className="kicker text-body py-3 px-4 font-bold whitespace-nowrap">{h}</th>
                ))}
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-b border-borderc last:border-0 hover:bg-bg-soft/50">
                  <td className="py-3 px-4 font-bold">{s.name}</td>
                  <td className="py-3 px-4 text-body">{[s.address, s.city, s.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="py-3 px-4">{s.zip}</td>
                  <td className="py-3 px-4">{s.zipRadius} mi</td>
                  <td className="py-3 px-4 text-body">{s.partnerName || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => del(s)} className="text-xs font-bold text-candy-pink">DELETE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-3">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="btn-pill btn-secondary text-[10px] px-5 py-3">‹ PREV</button>
          <span className="self-center text-sm text-body">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="btn-pill btn-secondary text-[10px] px-5 py-3">NEXT ›</button>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full my-8 p-6 shadow-soft">
            <h3 className="font-extrabold uppercase mb-2">Add stores</h3>
            <p className="text-[11px] text-body mb-4">Paste CSV: <code className="bg-bg-soft px-1 rounded">name, zip, radius</code> (header row ignored). Or fill the manual form below.</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm font-mono outline-none focus:border-ink mb-4"
            />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} placeholder="Store name" className="rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <input value={adding.zip} onChange={(e) => setAdding({ ...adding, zip: e.target.value })} placeholder="ZIP code" className="rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <input value={adding.address} onChange={(e) => setAdding({ ...adding, address: e.target.value })} placeholder="Street address" className="rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <input value={adding.city} onChange={(e) => setAdding({ ...adding, city: e.target.value })} placeholder="City" className="rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <input value={adding.state} onChange={(e) => setAdding({ ...adding, state: e.target.value })} placeholder="State" className="rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <input type="number" value={adding.zipRadius} onChange={(e) => setAdding({ ...adding, zipRadius: Number(e.target.value) })} placeholder="Radius (mi)" className="rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
            </div>
            {importResult != null && (
              <div className="mb-4 rounded-smcard bg-candy-pink-100 text-candy-pink font-bold px-4 py-3 text-sm">
                ✓ {importResult} store(s) added.
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setImportOpen(false); setImportResult(null); }} className="btn-pill btn-secondary">CLOSE</button>
              <button onClick={importCsv} disabled={saving} className="btn-pill btn-secondary">{saving ? "SAVING..." : "IMPORT PASTED CSV"}</button>
              <button onClick={addStore} className="btn-pill btn-primary">ADD STORE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
