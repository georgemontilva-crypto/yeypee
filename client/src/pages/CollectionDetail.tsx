import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { BackLink, EmptyState, FigurePlaceholder } from "../components/Shared";

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

  if (loading) return <div className="min-h-[60vh]" />;
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
          <div className="relative rounded-card overflow-hidden h-[300px] md:h-[420px] fade-up bg-bg-soft">
            {c.heroImage ? (
              <img
                src={c.heroImage}
                alt={c.name}
                className={`w-full h-full object-cover transition-opacity duration-700 ${
                  videoOn ? "opacity-0" : "opacity-100"
                }`}
              />
            ) : !c.heroVideo ? (
              <div className="w-full h-full flex items-center justify-center">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 sm:p-8 md:p-12">
              <h1 className="text-white text-[30px] sm:text-4xl md:text-6xl mb-3">{c.name}</h1>
              <p className="text-white/85 italic text-base md:text-lg mb-6 max-w-xl">{c.description || c.tagline}</p>
              <a href="#collection-grid" className="btn-pill btn-primary bg-white text-ink">MEET THE COLLECTION</a>
            </div>
          </div>
          {/* Stats */}
          <div className="mt-8 border-t border-borderc grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-borderc fade-up">
            {[
              { big: `${chars.length}+1`, small: "CHARACTERS + 1 SECRET RARE" },
              { big: c.seriesLabel || "SERIES 1", small: c.name.toUpperCase() },
              { big: c.releaseYear || "2024", small: "RELEASED" },
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
          {regulars.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {regulars.map((ch: any) => (
                <Link key={ch.id} to={`/characters/${ch.slug}`} className="fade-up rounded-card border border-borderc shadow-soft overflow-hidden transition-transform hover:-translate-y-1" style={{ background: ch.cardBgColor || "#FFE3EF" }}>
                  <div className="flex items-center justify-center p-8 h-56">
                    {ch.imageFront ? <img src={ch.imageFront} alt={ch.name} className="h-full object-contain" /> : <FigurePlaceholder color={ch.cardBgColor} size={170} />}
                  </div>
                  <div className="text-center py-4 bg-white">
                    <div className="font-extrabold uppercase tracking-tight text-xl">{ch.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No characters yet" text="Characters will appear here once added in the admin panel." />
          )}
          {/* Secret rare band */}
          {secretRare && (
            <div className="mt-10 fade-up">
              <Link to={`/characters/${secretRare.slug}`} className="rounded-card relative overflow-hidden block px-6 sm:px-8 md:px-16 py-10 sm:py-14 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8" style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(242,193,78,0.35) 0%, #0F0F0F 60%)" }}>
                <div className="text-center md:text-left">
                  <div className="kicker text-gold mb-3">SECRET RARE</div>
                  <h3 className="text-[26px] sm:text-3xl md:text-5xl text-white mb-2">{secretRare.name}</h3>
                  <p className="text-white/80 italic">Can you find the Golden YEYPEE?</p>
                </div>
                <div className="gold-pulse">
                  {secretRare.imageFront ? (
                    <img
                      src={secretRare.imageFront}
                      alt={secretRare.name}
                      className="h-[180px] w-auto object-contain"
                    />
                  ) : (
                    <FigurePlaceholder mystery size={180} />
                  )}
                </div>
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
