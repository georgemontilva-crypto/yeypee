import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

interface Inquiry {
  id: number;
  businessName: string;
  contactName: string;
  phone: string | null;
  email: string;
  address: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

const STATUSES = ["new", "contacted", "closed"];

export default function AdminWholesale() {
  const [rows, setRows] = useState<Inquiry[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const load = () =>
    adminApi
      .wholesale()
      .then((d) => setRows(d.wholesale || []))
      .catch(() => setRows([]));

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: number, status: string) => {
    setRows((r) => (r ? r.map((x) => (x.id === id ? { ...x, status } : x)) : r));
    try {
      await adminApi.setWholesaleStatus(id, status);
    } catch {
      load();
    }
  };

  const del = async (row: Inquiry) => {
    if (!window.confirm(`Delete the enquiry from "${row.businessName}"?`)) return;
    try {
      await adminApi.deleteWholesale(row.id);
      await load();
    } catch (e: any) {
      alert(e?.data?.error || e?.message || "Could not delete");
    }
  };

  if (rows === null) return <div className="p-10 text-center text-body text-sm">Loading...</div>;

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-borderc p-10 text-center text-body text-sm">
        No wholesale enquiries yet. They arrive from the form at <b>/wholesale</b>.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-borderc overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-borderc text-left">
            {["BUSINESS", "CONTACT", "EMAIL", "PHONE", "STATUS", "RECEIVED"].map((h) => (
              <th key={h} className="kicker text-body py-3 px-4 font-bold whitespace-nowrap">
                {h}
              </th>
            ))}
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <>
              <tr key={r.id} className="border-b border-borderc hover:bg-bg-soft/50 transition-colors">
                <td className="py-3 px-4 font-bold">{r.businessName}</td>
                <td className="py-3 px-4">{r.contactName}</td>
                <td className="py-3 px-4">
                  <a href={`mailto:${r.email}`} className="underline">
                    {r.email}
                  </a>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">{r.phone || "—"}</td>
                <td className="py-3 px-4">
                  <select
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value)}
                    className="text-xs rounded-md border border-borderc px-2 py-1 bg-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4 text-body whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setOpen(open === r.id ? null : r.id)}
                      className="text-xs font-bold text-body hover:text-ink underline"
                    >
                      {open === r.id ? "HIDE" : "DETAILS"}
                    </button>
                    <button onClick={() => del(r)} className="text-xs font-bold text-candy-pink hover:opacity-80">
                      DELETE
                    </button>
                  </div>
                </td>
              </tr>
              {open === r.id && (
                <tr key={`${r.id}-details`} className="border-b border-borderc bg-bg-soft/40">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="grid sm:grid-cols-2 gap-4 text-[13px]">
                      <div>
                        <div className="kicker text-body mb-1">Address</div>
                        <p className="whitespace-pre-line">{r.address || "—"}</p>
                      </div>
                      <div>
                        <div className="kicker text-body mb-1">Additional notes</div>
                        <p className="whitespace-pre-line">{r.notes || "—"}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
