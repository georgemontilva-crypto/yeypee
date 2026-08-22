import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { BackLink, EmptyState, FigurePlaceholder, SECRET_FIGURE_IMAGE } from "../components/Shared";

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();
  useFadeUp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Swap the still banner for the video after the delay set in the admin.
  // Respects the reduced-motion preference and cleans up on navigation.
  useEffect(() => {
    const col = data?.collection;
    setVideoOn(false);
    if (!col?.heroVideo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const delay = Math.max(0, Number(col.heroVideoDelayMs ?? 2000));
    const timer = window.setTimeout(() => {
      setVideoOn(true);
      videoRef.current?.play().catch(() => undefined);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (!slug) return;
    contentApi
      .collection(slug)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-6 md:pt-10 animate-pulse">
        <div className="h-3 w-32 rounded bg-bg-soft mb-6" />
        <div className="rounded-card bg-bg-soft h-[300px] md:h-[420px]" />
        <div className="h-6 w-72 rounded-lg bg-bg-soft mt-8" />
      </div>
    );
  if (!data?.collection) {
    return (
      <>
        <BackLink />
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16">
          <EmptyState title="Collection not found" />
        </div>
      </>
    );
  }
  const c = data.collection;
  const chars = data.characters || [];
  const secretRare = chars.find((ch: any) => ch.rarity === "secret_rare");
  const regulars = chars.filter((ch: any) => ch.rarity !== "secret_rare");

  return (
    <>
      <BackLink />
      <section className="pb-24 md:pb-[96px]">
        {/* Hero */}
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-8">
          <div
            // With a video the banner keeps the old fixed height (the video is
            // absolutely positioned and needs a box to fill). Without one, the
            // image sets the height so nothing gets cropped.
            className={`relative rounded-card overflow-hidden fade-up bg-bg-soft ${
              c.heroVideo ? "h-[300px] md:h-[420px]" : ""
            }`}
          >
            {c.heroImage ? (
              // The banner sets the height: no cropping, so a wide strip with
              // the character on one side is shown exactly as uploaded.
              <img
                src={c.heroImage}
                alt={c.name}
                className={`block w-full transition-opacity duration-700 ${
                  c.heroVideo ? "h-full object-cover" : "h-auto"
                } ${videoOn ? "opacity-0" : "opacity-100"}`}
              />
            ) : !c.heroVideo ? (
              <div className="w-full aspect-[21/9] flex items-center justify-center">
                <FigurePlaceholder color="#F2C14E" size={240} />
              </div>
            ) : null}

            {/* The video fades in over the still after the configured delay. */}
            {c.heroVideo && (
              <video
                ref={videoRef}
                src={c.heroVideo}
                muted
                loop
                playsInline
                preload="auto"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                  videoOn ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 sm:p-8 md:p-12">
              <h1 className="text-white text-[30px] sm:text-4xl md:text-6xl mb-3">{c.name}</h1>
              <p className="text-white/85 italic text-base md:text-lg mb-6 max-w-xl">{c.description || c.tagline}</p>
              <a href="#collection-grid" className="btn-pill btn-primary bg-white text-ink">MEET THE COLLECTION</a>
            </div>
          </div>
          {/* Stats */}
          <div className="mt-8 border-t border-borderc grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-borderc fade-up">
            {[
              {
                big: c.statCountValue || `${chars.length}${secretRare ? "+1" : ""}`,
                small: c.statCountLabel || (secretRare ? "CHARACTERS + 1 SECRET RARE" : "CHARACTERS"),
              },
              { big: c.seriesLabel || "SERIES 1", small: c.statSeriesLabel || c.name.toUpperCase() },
              { big: c.releaseYear || "2024", small: c.statYearLabel || "RELEASED" },
            ].map((s, i) => (
              <div key={i} className="py-6 text-center">
                <div className="text-3xl md:text-4xl font-extrabold">{s.big}</div>
                <div className="kicker text-body mt-1">{s.small}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div id="collection-grid" className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-20">
          <div className="mb-10 fade-up">
            <h2 className="text-[26px] sm:text-3xl md:text-5xl mb-3">MEET THE COLLECTION</h2>
            <p className="text-body italic">{chars.length > 1 ? `${chars.length} to collect + 1 secret rare!` : "Collect them all!"}</p>
          </div>
          {regulars.length || secretRare ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {regulars.map((ch: any) => (
                <Link key={ch.id} to={`/characters/${ch.slug}`} className="fade-up rounded-card border border-borderc shadow-soft overflow-hidden transition-transform hover:-translate-y-1" style={{ background: ch.cardBgColor || "#FFE3EF" }}>
                  <div className="flex items-center justify-center p-5 sm:p-6 h-56 md:h-64">
                    {ch.imageFront ? <img src={ch.imageFront} alt={ch.name} className="h-full object-contain" /> : <FigurePlaceholder color={ch.cardBgColor} size={170} />}
                  </div>
                  <div className="text-center py-4 bg-white">
                    <div className="font-extrabold uppercase tracking-tight text-xl">{ch.name}</div>
                  </div>
                </Link>
              ))}

              {/* The secret rare closes the grid as one more card, in the same
                  shape as the rest but in the dark gold treatment. */}
              {secretRare && (
                <Link
                  to={`/characters/${secretRare.slug}`}
                  className="fade-up rounded-card border border-borderc shadow-soft overflow-hidden transition-transform hover:-translate-y-1"
                  style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(242,193,78,0.35) 0%, #0F0F0F 62%)" }}
                >
                  <div className="flex items-center justify-center p-5 sm:p-6 h-56 md:h-64 gold-pulse">
                    {secretRare.imageFront ? (
                      <img src={secretRare.imageFront} alt={secretRare.name} className="h-full object-contain" />
                    ) : (
                      <img src={SECRET_FIGURE_IMAGE} alt="Secret rare" className="h-full object-contain" />
                    )}
                  </div>
                  <div className="text-center py-4 bg-ink">
                    <div className="kicker text-gold mb-1">SECRET RARE</div>
                    <div className="font-extrabold uppercase tracking-tight text-xl text-white">{secretRare.name}</div>
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <EmptyState title="No characters yet" text="Characters will appear here once added in the admin panel." />
          )}
        </div>
      </section>
    </>
  );
}
