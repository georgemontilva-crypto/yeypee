import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FFF7E0", fg: "#8A6A12" },
  paid: { bg: "#E6F7EE", fg: "#2E7D4F" },
  fulfilled: { bg: "#F0F4FF", fg: "#3B5FD6" },
  refunded: { bg: "#FFE3EF", fg: "#C4316E" },
  cancelled: { bg: "#F3F3F4", fg: "#6B6B72" },
};

const SAMPLE_SKUS = ["YEY-DISPLAY-01", "YEY-BLIND-06", "YEY-BLIND-12", "YEY-CASE-01"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ name: "", email: "", sku: SAMPLE_SKUS[0], quantity: 1, status: "pending" });

  const pageSize = 25;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const d = await adminApi.orders({ page: String(p), pageSize: String(pageSize), status, search });
      setOrders(d.orders);
      setPage(p);
      setTotalPages(Math.max(1, Math.ceil((d.total ?? d.orders.length) / pageSize)));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [status, search]);

  const create = async () => {
    if (!newOrder.email) return;
    try {
      await adminApi.createOrder(newOrder);
      setCreateOpen(false);
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || "Create failed");
    }
  };

  const patchStatus = async (id: number, s: string) => {
    try {
      await adminApi.patchOrder(id, { status: s });
      await load(page);
    } catch (e: any) {
      alert(e?.data?.error || "Update failed");
    }
  };

  const exportCsv = async () => {
    try {
      const d = await adminApi.orders({ format: "csv", status, search });
      const blob = new Blob([d.csv || ""], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or ID..."
            className="rounded-lg border border-borderc bg-white px-4 py-2.5 text-sm outline-none focus:border-ink w-56"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-borderc bg-white px-3 py-2.5 text-sm">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-pill btn-secondary text-[10px] px-5 py-3">EXPORT CSV</button>
          <button onClick={() => setCreateOpen(true)} className="btn-pill btn-primary text-[10px] px-5 py-3">+ NEW ORDER</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderc overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-body text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-body text-sm">No orders yet. Create a test order manually or wait for real checkouts.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borderc text-left">
                {["ID", "CUSTOMER", "SKU", "QTY", "TOTAL", "STATUS", "CREATED"].map((h) => (
                  <th key={h} className="kicker text-body py-3 px-4 font-bold whitespace-nowrap">{h}</th>
                ))}
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-borderc last:border-0 hover:bg-bg-soft/50">
                  <td className="py-3 px-4 font-bold">#{o.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold">{o.name}</div>
                    <div className="text-[11px] text-body">{o.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">{o.sku}</td>
                  <td className="py-3 px-4">{o.quantity}</td>
                  <td className="py-3 px-4">${(o.totalCents / 100).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <select
                      value={o.status}
                      onChange={(e) => patchStatus(o.id, e.target.value)}
                      className="rounded-md border-0 text-xs font-bold px-2 py-1"
                      style={{ background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.fg }}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="refunded">Refunded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-body whitespace-nowrap">{o.createdAt?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/admin/orders/${o.id}`} className="text-xs font-bold text-body hover:text-ink underline">DETAILS</Link>
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

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-soft">
            <h3 className="font-extrabold uppercase mb-5">New order</h3>
            <div className="space-y-4">
              <input value={newOrder.name} onChange={(e) => setNewOrder({ ...newOrder, name: e.target.value })} placeholder="Customer name" className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <input value={newOrder.email} onChange={(e) => setNewOrder({ ...newOrder, email: e.target.value })} placeholder="Customer email" className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <select value={newOrder.sku} onChange={(e) => setNewOrder({ ...newOrder, sku: e.target.value })} className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm bg-white">
                {SAMPLE_SKUS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input type="number" min={1} value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })} className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm outline-none focus:border-ink" />
              <select value={newOrder.status} onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })} className="w-full rounded-lg border border-borderc px-3 py-2.5 text-sm bg-white">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} className="btn-pill btn-secondary">CANCEL</button>
              <button onClick={create} className="btn-pill btn-primary">CREATE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
