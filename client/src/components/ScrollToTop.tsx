import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function useFadeUp() {
  useEffect(() => {
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" }
    );
    const observeAll = () => {
      if (cancelled) return;
      document
        .querySelectorAll<HTMLElement>(".fade-up:not(.visible)")
        .forEach((el) => io.observe(el));
    };
    observeAll();
    // Re-observe whenever the DOM changes (content loaded after mount)
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}
