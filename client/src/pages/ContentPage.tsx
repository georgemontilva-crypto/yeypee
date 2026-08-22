import { useEffect, useState } from "react";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { BackLink } from "../components/Shared";

/**
 * The four footer pages (about / contact / faq / privacy).
 *
 * Their copy lives in site_settings, so the admin edits them without a deploy.
 * The body accepts a very small amount of formatting:
 *   "## Heading"  -> section heading
 *   "Q: ..." / "A: ..." -> a question and its answer (used by the FAQ)
 *   blank line    -> new paragraph
 */

export interface PageConfig {
  slug: "about" | "contact" | "faq" | "privacy";
  fallbackTitle: string;
  fallbackBody: string;
}

function Block({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) {
          return (
            <h2 key={i} className="text-2xl md:text-[28px] mt-10 mb-3">
              {b.slice(3)}
            </h2>
          );
        }
        if (b.startsWith("Q:")) {
          const [q, ...rest] = b.split(/\n?A:/);
          return (
            <div key={i} className="border-b border-borderc py-5">
              <div className="font-extrabold text-ink mb-1.5">{q.replace(/^Q:\s*/, "")}</div>
              <p className="text-body leading-relaxed whitespace-pre-line">{rest.join("A:").trim()}</p>
            </div>
          );
        }
        return (
          <p key={i} className="text-body leading-relaxed mb-4 whitespace-pre-line">
            {b}
          </p>
        );
      })}
    </>
  );
}

export default function ContentPage({ slug, fallbackTitle, fallbackBody }: PageConfig) {
  useFadeUp();
  const [settings, setSettings] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    contentApi
      .settings()
      .then((d) => setSettings(d?.settings ?? {}))
      .catch(() => setSettings({}));
  }, [slug]);

  if (settings === null) {
    return (
      <div className="max-w-[820px] mx-auto px-6 lg:px-10 pt-6 md:pt-10 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-bg-soft mb-6" />
        <div className="h-4 w-full rounded bg-bg-soft mb-3" />
        <div className="h-4 w-4/5 rounded bg-bg-soft" />
      </div>
    );
  }

  const title = settings[`page_${slug}_title`] || fallbackTitle;
  const body = settings[`page_${slug}_body`] || fallbackBody;
  const images: string[] = [
    settings[`page_${slug}_image_1`],
    settings[`page_${slug}_image_2`],
    settings[`page_${slug}_image_3`],
  ].filter(Boolean);

  return (
    <>
      <BackLink to="/" label="BACK TO HOME" />

      <section className="py-10 md:py-16">
        <div className="max-w-[820px] mx-auto px-6 lg:px-10">
          <h1 className="text-[30px] sm:text-4xl md:text-5xl mb-6 fade-up">{title}</h1>

          {images[0] && (
            <img
              src={images[0]}
              alt=""
              className="w-full h-auto rounded-card mb-8 fade-up"
            />
          )}

          <div className="fade-up">
            <Block text={body} />
          </div>

          {images.length > 1 && (
            <div className="grid sm:grid-cols-2 gap-4 mt-10 fade-up">
              {images.slice(1).map((src) => (
                <img key={src} src={src} alt="" className="w-full h-auto rounded-card" />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
