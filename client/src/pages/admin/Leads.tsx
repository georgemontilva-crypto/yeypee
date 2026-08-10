import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

export default function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const d = await adminApi.leads({ page: String(p), pageSize: String(pageSize) });
      setLeads(d.leads);
      setPage(p);
      setTotalPages(Math.max(1, Math.ceil((d.total ?? d.leads.length) / pageSize)));
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const del = async (id: number) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await adminApi.deleteLead(id);
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || "Delete failed");
    }
  };

  const exportCsv = async () => {
    try {
      const d = await adminApi.leads({ format: "csv", page: "1", pageSize: "10000" });
      const blob = new Blob([d.csv || ""], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-body">Signups from the homepage Collector Club form.</p>
        <button onClick={exportCsv} className="btn-pill btn-secondary text-[10px] px-5 py-3">EXPORT CSV</button>
      </div>
      <div className="bg-white rounded-xl border border-borderc overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-body text-sm">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-body text-sm">No leads yet. They'll appear here when visitors sign up.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borderc text-left">
                {["EMAIL", "SOURCE", "CONSENT", "SIGNED UP"].map((h) => (
                  <th key={h} className="kicker text-body py-3 px-4 font-bold whitespace-nowrap">{h}</th>
                ))}
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-borderc last:border-0 hover:bg-bg-soft/50">
                  <td className="py-3 px-4 font-bold">{l.email}</td>
                  <td className="py-3 px-4 text-body">{l.source || "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${l.consent ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {l.consent ? "YES" : "NO"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-body whitespace-nowrap">{l.createdAt?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => del(l.id)} className="text-xs font-bold text-candy-pink">DELETE</button>
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
    </div>
  );
}
