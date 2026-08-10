import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../lib/api";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FFF7E0", fg: "#8A6A12" },
  paid: { bg: "#E6F7EE", fg: "#2E7D4F" },
  fulfilled: { bg: "#F0F4FF", fg: "#3B5FD6" },
  refunded: { bg: "#FFE3EF", fg: "#C4316E" },
  cancelled: { bg: "#F3F3F4", fg: "#6B6B72" },
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminApi
      .order(Number(id))
      .then((d) => setOrder(d.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  const patch = async (s: string) => {
    try {
      await adminApi.patchOrder(Number(id), { status: s });
      const d = await adminApi.order(Number(id));
      setOrder(d.order);
    } catch (e: any) {
      alert(e?.data?.error || "Update failed");
    }
  };

  return (
    <div>
      <Link to="/admin/orders" className="btn-label text-body hover:text-ink mb-5 inline-block">‹ BACK TO ORDERS</Link>
      {loading ? (
        <div className="p-10 text-center text-body text-sm">Loading...</div>
      ) : !order ? (
        <div className="p-10 text-center text-body text-sm">Order not found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-borderc p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold">Order #{order.id}</h2>
              <p className="text-body text-sm mt-1">Created {order.createdAt}</p>
            </div>
            <select
              value={order.status}
              onChange={(e) => patch(e.target.value)}
              className="rounded-md text-xs font-bold px-4 py-2"
              style={{ background: STATUS_COLORS[order.status]?.bg, color: STATUS_COLORS[order.status]?.fg }}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="rounded-smcard bg-bg-soft p-5">
              <div className="kicker text-body mb-3">CUSTOMER</div>
              <div className="font-bold">{order.name}</div>
              <div className="text-body">{order.email}</div>
              {order.address && <div className="text-body mt-1">{order.address}</div>}
            </div>
            <div className="rounded-smcard bg-bg-soft p-5">
              <div className="kicker text-body mb-3">ORDER</div>
              <div className="font-bold font-mono">{order.sku}</div>
              <div className="text-body">Quantity: {order.quantity}</div>
              <div className="text-body">Total: ${(order.totalCents / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
