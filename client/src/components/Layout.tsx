import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { contentApi } from "../lib/api";

interface SearchItem {
  kind: string;
  label: string;
  to: string;
  image: string | null;
}

function searchIndex(items: SearchItem[], q: string): SearchItem[] {
  const needle = q.trim().toLowerCase();
  return items.filter((i) => i.label.toLowerCase().includes(needle)).slice(0, 8);
}

const NAV_LINKS = [
  { to: "/collections", label: "COLLECTIONS" },
  { to: "/characters", label: "CHARACTERS" },
  { to: "/shop", label: "SHOP" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<SearchItem[]>([]);
  const [logos, setLogos] = useState<{ header: string | null; footer: string | null }>({ header: null, footer: null });
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Custom logos, if the admin uploaded any.
  useEffect(() => {
    contentApi
      .settings()
      .then((d: any) =>
        setLogos({ header: d?.settings?.logo_header ?? null, footer: d?.settings?.logo_footer ?? null })
      )
      .catch(() => undefined);
  }, []);

  // The search index is fetched once, the first time the overlay is opened.
  useEffect(() => {
    if (!searchOpen || catalog.length) return;
    Promise.all([
      contentApi.characters().catch(() => ({ characters: [] })),
      contentApi.collections().catch(() => ({ collections: [] })),
      contentApi.products().catch(() => ({ products: [] })),
    ]).then(([ch, co, pr]: any[]) => {
      setCatalog([
        ...(co.collections || []).map((c: any) => ({
          kind: "Collection", label: c.name, to: `/collections/${c.slug}`, image: c.cardImage || c.heroImage || null,
        })),
        ...(ch.characters || []).map((c: any) => ({
          kind: "Character", label: c.name, to: `/characters/${c.slug}`, image: c.imageFront || null,
        })),
        ...(pr.products || []).map((p: any) => ({
          kind: "Product", label: p.name, to: "/shop", image: p.image || null,
        })),
      ]);
    });
  }, [searchOpen, catalog.length]);

  // The bar is always a solid white strip, on every page and at any scroll
  // position, so the links are legible over any hero artwork.
  const compact = scrolled;

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const results = query.trim().length >= 2 ? searchIndex(catalog, query) : [];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation */}
      <header
        className={`fixed top-0 inset-x-0 z-50 bg-white border-b border-borderc transition-shadow duration-300 ${
          compact ? "shadow-soft" : ""
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-5 lg:px-10 flex items-center justify-between h-16 lg:h-[72px] gap-4">
          <Link to="/" className="shrink-0 flex items-center" aria-label="YEYPEE — home">
            {logos.header ? (
              <img src={logos.header} alt="YEYPEE" className="h-8 lg:h-9 w-auto object-contain" />
            ) : (
              <span className="logo-mark text-ink text-xl lg:text-2xl">YEYPEE</span>
            )}
          </Link>

          <nav className="hidden lg:flex items-center gap-9 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="nav-link btn-label text-body">
                {l.label}
              </Link>
            ))}
            {user && (
              <Link to="/my-collection" className="nav-link btn-label text-body">
                MY COLLECTION
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="nav-icon"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            {user ? (
              <div className="hidden lg:flex items-center gap-6 ml-2">
                <Link to="/account" className="nav-link btn-label text-body max-w-[160px] truncate">
                  {user.displayName}
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin" className="nav-link btn-label text-candy-pink">
                    ADMIN
                  </Link>
                )}
                <button onClick={() => logout()} className="nav-link btn-label text-body">
                  LOG OUT
                </button>
              </div>
            ) : (
              <Link to="/login" className="hidden lg:inline-block nav-link btn-label text-body ml-2">
                LOG IN
              </Link>
            )}
            <button
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="nav-icon lg:hidden"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Phone menu. It stays mounted and is animated with CSS so that closing
          is as smooth as opening; `inert` keeps it out of the tab order when
          hidden. */}
      <div
        className={`menu-panel lg:hidden ${menuOpen ? "is-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className="px-6 py-10 flex flex-col items-center gap-7">
          {[...NAV_LINKS, { to: "/my-collection", label: "MY COLLECTION" }].map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              tabIndex={menuOpen ? 0 : -1}
              className="menu-link menu-item"
              style={{ transitionDelay: menuOpen ? `${80 + i * 55}ms` : "0ms" }}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                to="/account"
                tabIndex={menuOpen ? 0 : -1}
                className="menu-link menu-item"
                style={{ transitionDelay: menuOpen ? "300ms" : "0ms" }}
              >
                {user.displayName}
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  tabIndex={menuOpen ? 0 : -1}
                  className="menu-link menu-item text-candy-pink"
                  style={{ transitionDelay: menuOpen ? "355ms" : "0ms" }}
                >
                  ADMIN
                </Link>
              )}
              <button
                onClick={() => logout()}
                tabIndex={menuOpen ? 0 : -1}
                className="btn-label text-body menu-item"
                style={{ transitionDelay: menuOpen ? "410ms" : "0ms" }}
              >
                LOG OUT
              </button>
            </>
          ) : (
            <Link
              to="/login"
              tabIndex={menuOpen ? 0 : -1}
              className="menu-link menu-item"
              style={{ transitionDelay: menuOpen ? "300ms" : "0ms" }}
            >
              LOG IN
            </Link>
          )}
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4 pt-24">
          <div className="bg-white rounded-card w-full max-w-xl shadow-soft overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-borderc">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-body shrink-0">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                placeholder="Search characters, collections, products..."
                className="flex-1 text-base outline-none"
              />
              <button onClick={closeSearch} aria-label="Close search" className="text-body hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-5 py-6 text-sm text-body">Type at least two letters.</p>
              ) : results.length === 0 ? (
                <p className="px-5 py-6 text-sm text-body">Nothing found for “{query}”.</p>
              ) : (
                results.map((r) => (
                  <Link
                    key={r.kind + r.to}
                    to={r.to}
                    onClick={closeSearch}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-bg-soft transition-colors border-b border-borderc last:border-0"
                  >
                    {r.image ? (
                      <img src={r.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="w-9 h-9 rounded-lg bg-candy-pink-100 shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-bold truncate">{r.label}</span>
                      <span className="block text-[11px] uppercase tracking-wider text-body">{r.kind}</span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pt-16 lg:pt-[72px]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-borderc mt-0">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            {logos.footer ? (
              <img src={logos.footer} alt="YEYPEE" className="h-14 w-auto object-contain" />
            ) : (
              <div className="logo-mark text-4xl text-ink">YEYPEE</div>
            )}
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
