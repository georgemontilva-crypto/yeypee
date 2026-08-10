import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV_LINKS = [
  { to: "/collections", label: "COLLECTIONS" },
  { to: "/characters", label: "CHARACTERS" },
  { to: "/shop", label: "SHOP" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const transparent = scrolled || location.pathname !== "/";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          transparent ? "nav-scrolled bg-white/97" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
          <Link to="/" className={`logo-mark text-xl ${transparent ? "text-ink" : "text-white"}`}>
            YEYPEE
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`btn-label ${transparent ? "text-body hover:text-ink" : "text-white/90 hover:text-white"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <Link to="/my-collection" className={`btn-label ${transparent ? "text-body hover:text-ink" : "text-white/90 hover:text-white"}`}>
                  MY COLLECTION
                </Link>
                <Link to="/account" className={`btn-label ${transparent ? "text-body hover:text-ink" : "text-white/90 hover:text-white"}`}>
                  {user.displayName}
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin" className={`btn-label ${transparent ? "text-candy-pink" : "text-gold"}`}>
                    ADMIN
                  </Link>
                )}
              </div>
            ) : (
              <Link to="/login" className={`btn-label hidden md:block ${transparent ? "text-body hover:text-ink" : "text-white/90 hover:text-white"}`}>
                LOG IN
              </Link>
            )}
            <button
              aria-label="Open menu"
              className={`md:hidden ${transparent ? "text-ink" : "text-white"}`}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M6 6l12 12M6 18L18 6" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center gap-8 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-2xl font-extrabold uppercase tracking-tight text-ink">
              {l.label}
            </Link>
          ))}
          <Link to="/my-collection" className="text-2xl font-extrabold uppercase tracking-tight text-ink">
            MY COLLECTION
          </Link>
          {user ? (
            <>
              <Link to="/account" className="text-2xl font-extrabold uppercase tracking-tight text-ink">
                {user.displayName}
              </Link>
              {user.role === "admin" && (
                <Link to="/admin" className="text-2xl font-extrabold uppercase tracking-tight text-candy-pink">
                  ADMIN
                </Link>
              )}
              <button
                onClick={() => logout()}
                className="text-lg font-bold uppercase tracking-wider text-body"
              >
                LOG OUT
              </button>
            </>
          ) : (
            <Link to="/login" className="text-2xl font-extrabold uppercase tracking-tight text-ink">
              LOG IN
            </Link>
          )}
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-borderc mt-0">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="logo-mark text-4xl text-ink">YEYPEE</div>
            <div className="flex items-center gap-5">
              {[
                { label: "Instagram", path: "M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 5a5 5 0 100 10 5 5 0 000-10zm5.5-.75a1 1 0 100 2 1 1 0 000-2z" },
                { label: "TikTok", path: "M16 3c.8 1.5 2.3 2.5 4 2.5v3.5c-1.6 0-3-.5-4-1.4V13a6 6 0 11-6-6v3.5a2.5 2.5 0 102.5 2.5V3H16z" },
                { label: "YouTube", path: "M21 7s-.2-1.4-.8-2c-.7-.8-1.5-.8-1.9-.8C15.5 4 12 4 12 4s-3.5 0-6.3.2c-.4 0-1.2 0-1.9.8-.6.6-.8 2-.8 2S2.8 8.6 2.8 10v2c0 1.4.2 3 .2 3s.2 1.4.8 2c.7.8 1.7.8 2.1.9 1.5.1 6.1.2 6.1.2s3.5 0 6.3-.2c.4-.1 1.2-.1 1.9-.9.6-.6.8-2 .8-2s.2-1.6.2-3v-2c0-1.4-.2-3-.2-3zM10 15V9l5.2 3-5.2 3z" },
              ].map((s) => (
                <a key={s.label} href="https://example.com" target="_blank" rel="noreferrer" aria-label={s.label} className="text-body hover:text-ink transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={s.path} /></svg>
                </a>
              ))}
            </div>
            <nav className="flex items-center gap-6">
              {["ABOUT US", "CONTACT", "FAQ", "PRIVACY"].map((l) => (
                <a key={l} href="#" className="btn-label text-body hover:text-ink">
                  {l}
                </a>
              ))}
            </nav>
          </div>
          <div className="mt-10 pt-6 border-t border-borderc text-sm text-body">
            © 2024 YEYPEE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
