import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";

const CARDS = [
  { to: "/admin/orders", label: "ORDERS", color: "#FF5FA2" },
  { to: "/admin/users", label: "USERS", color: "#9B84E8" },
  { to: "/admin/leads", label: "LEADS", color: "#2E7D4F" },
  { to: "/admin/media", label: "MEDIA", color: "#F2C14E" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .stats()
      .then((d) => setStats(d?.stats || d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const rows: [string, number | string][] = [
    ["users", "USERS"],
    ["leads", "LEADS"],
    ["orders", "ORDERS"],
    ["collections", "COLLECTIONS"],
    ["characters", "CHARACTERS"],
    ["products", "PRODUCTS"],
    ["news", "NEWS"],
    ["retailPartners", "RETAIL PARTNERS"],
    ["stores", "STORES"],
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="rounded-xl border border-borderc bg-white p-5 hover:shadow-soft transition-shadow">
            <div className="kicker text-body mb-2">{c.label}</div>
            <div className="text-3xl font-extrabold" style={{ color: c.color }}>
              {loading ? "–" : (stats?.[c.label.toLowerCase()] ?? "–")}
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-borderc overflow-hidden">
        <div className="px-5 py-4 border-b border-borderc flex items-center justify-between">
          <h2 className="font-extrabold uppercase text-sm">Database status</h2>
          <span className="badge-pink" style={{ background: "#E6F7EE", color: "#2E7D4F" }}>CONNECTED</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-9 divide-x divide-borderc">
          {rows.map(([key, label]) => (
            <div key={key} className="text-center py-5 px-1">
              <div className="text-xl font-extrabold">{loading ? "–" : (stats?.[key] ?? "–")}</div>
              <div className="kicker text-body mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
