import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: "▤" },
  { to: "/admin/orders", label: "Orders", icon: "📦" },
  { to: "/admin/users", label: "Users", icon: "👤" },
  { to: "/admin/leads", label: "Leads", icon: "✉" },
  { to: "/admin/media", label: "Media", icon: "🖼" },
  { to: "/admin/collections", label: "Collections", icon: "🌍" },
  { to: "/admin/characters", label: "Characters", icon: "★" },
  { to: "/admin/products", label: "Products", icon: "$" },
  { to: "/admin/news", label: "News", icon: "📰" },
  { to: "/admin/partners", label: "Retail Partners", icon: "🤝" },
  { to: "/admin/stores", label: "Stores", icon: "📍" },
  { to: "/admin/settings", label: "Settings", icon: "⚙" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isHomeAdmin = location.pathname === "/admin" || location.pathname === "/admin/";

  return (
    <div className="h-[100dvh] overflow-hidden bg-bg-soft flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 z-40 h-[100dvh] lg:h-auto w-60 shrink-0 bg-white border-r border-borderc flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 p-5 border-b border-borderc flex items-center justify-between">
          <div className="logo-mark text-lg">YEYPEE <span className="kicker text-candy-pink">ADMIN</span></div>
          <button className="lg:hidden w-8 h-8 rounded-full border border-borderc" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive ? "bg-ink text-white" : "text-body hover:bg-bg-soft hover:text-ink"
                }`
              }
            >
              <span className="w-5 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 p-4 border-t border-borderc">
          <div className="text-xs font-bold text-body mb-3 truncate">{user?.email}</div>
          <Link to="/" className="btn-label text-body hover:text-ink block mb-2">VIEW SITE →</Link>
          <button onClick={() => logout()} className="btn-label text-candy-pink hover:text-candy-pink/80">LOG OUT</button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col h-full">
        <header className="shrink-0 z-20 bg-white border-b border-borderc px-5 lg:px-8 h-16 flex items-center justify-between">
          <button className="lg:hidden w-9 h-9 rounded-full border border-borderc" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1 className="text-lg font-extrabold uppercase tracking-tight">
            {NAV.find((n) => n.to === location.pathname)?.label || (isHomeAdmin ? "Dashboard" : "Admin")}
          </h1>
          <div />
        </header>
        <main className="flex-1 overflow-y-auto overscroll-contain p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
