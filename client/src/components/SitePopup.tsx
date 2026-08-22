import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Site-wide popup, fully configured from the admin (site_settings):
 *
 *   popup_enabled      "true" | "false"
 *   popup_pages        "all" | "home" | "collections" | "characters" | "shop"
 *   popup_trigger      "time" | "scroll" | "exit"
 *   popup_delay        seconds (time) or percent scrolled (scroll)
 *   popup_frequency    "always" | "session" | "day"
 *   popup_title / popup_body / popup_button_label / popup_button_url
 *   popup_image        banner drawn above the text
 */

interface Props {
  settings: Record<string, any>;
}

const STORAGE_KEY = "yeypee_popup_seen";

export default function SitePopup({ settings }: Props) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const enabled = String(settings.popup_enabled) === "true";
  const pages = settings.popup_pages || "all";
  const trigger = settings.popup_trigger || "time";
  const delay = Number(settings.popup_delay ?? (trigger === "scroll" ? 50 : 5));
  const frequency = settings.popup_frequency || "session";

  // Does this popup apply to the page we are on?
  const path = location.pathname;
  const onRightPage =
    pages === "all" ||
    (pages === "home" && path === "/") ||
    (pages === "collections" && path.startsWith("/collections")) ||
    (pages === "characters" && path.startsWith("/characters")) ||
    (pages === "shop" && path.startsWith("/shop"));

  useEffect(() => {
    if (!enabled || !onRightPage) return;
    if (path.startsWith("/admin")) return;

    // Frequency cap
    if (frequency !== "always") {
      try {
        const store = frequency === "session" ? sessionStorage : localStorage;
        const seen = store.getItem(STORAGE_KEY);
        if (seen) {
          if (frequency === "session") return;
          if (Date.now() - Number(seen) < 24 * 60 * 60 * 1000) return;
        }
      } catch {
        /* storage disabled — just show it */
      }
    }

    const show = () => setOpen(true);

    if (trigger === "time") {
      const timer = window.setTimeout(show, Math.max(0, delay) * 1000);
      return () => window.clearTimeout(timer);
    }

    if (trigger === "scroll") {
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? (window.scrollY / max) * 100 : 100;
        if (pct >= delay) {
          show();
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    // "exit": the pointer leaves through the top of the window
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        show();
        document.removeEventListener("mouseout", onLeave);
      }
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, [enabled, onRightPage, trigger, delay, frequency, path]);

  const close = () => {
    setOpen(false);
    if (frequency !== "always") {
      try {
        const store = frequency === "session" ? sessionStorage : localStorage;
        store.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
  };

  if (!open) return null;

  const url: string = settings.popup_button_url || "";
  const label: string = settings.popup_button_label || "";
  const isInternal = url.startsWith("/");

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-card w-full max-w-md overflow-hidden shadow-soft max-h-[calc(100dvh-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {settings.popup_image && (
          <img src={settings.popup_image} alt="" className="block w-full h-auto" />
        )}

        <div className="p-6 overflow-y-auto">
          {settings.popup_title && (
            <h2 className="text-2xl md:text-[28px] mb-3">{settings.popup_title}</h2>
          )}
          {settings.popup_body && (
            <p className="text-body leading-relaxed whitespace-pre-line">{settings.popup_body}</p>
          )}

          <div className="flex items-center gap-3 mt-6">
            {label && url ? (
              isInternal ? (
                <Link to={url} onClick={close} className="btn-pill btn-primary">
                  {label}
                </Link>
              ) : (
                <a href={url} target="_blank" rel="noreferrer" onClick={close} className="btn-pill btn-primary">
                  {label}
                </a>
              )
            ) : null}
            <button onClick={close} className="btn-label text-body hover:text-ink">
              NO THANKS
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={close}
        aria-label="Close"
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white text-ink flex items-center justify-center"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}
