import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { EmptyState, FigurePlaceholder } from "../components/Shared";

const GRADIENTS: Record<string, string> = {
  jungle: "linear-gradient(105deg, #2E7D4F 0%, #4E9B6F 100%)",
  pink: "linear-gradient(105deg, #FF5FA2 0%, #FF9DC4 100%)",
  lavender: "linear-gradient(105deg, #9B84E8 0%, #C3B4F5 100%)",
};

const COLOR_BY_SLUG: Record<string, string> = {
  "wild-friends": "jungle",
  "candy-carnival": "pink",
  "tiny-friends": "lavender",
};

export default function Home() {
  useFadeUp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const bannerAsset = data?.settings?.hero_banner ?? null;
  const videoAsset = data?.settings?.hero_video ?? null;
  const posterAsset = data?.settings?.hero_poster ?? null;
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    contentApi
      .home()
      .then((d) => setData({ settings: d.home.settings, collections: d.home.collections, characters: d.home.characters, news: d.home.news, partners: d.home.partners }))
      .catch(() => setData({ settings: {}, collections: [], characters: [], news: [], partners: [] }))
      .finally(() => setLoading(false));
  }, []);

  const featuredId = data?.settings?.featured_collection_id;
  const featured =
    data?.collections?.find((c: any) => (featuredId ? c.id === Number(featuredId) : c.featured)) ??
    data?.collections?.[0] ??
    null;
  const carouselIds = data?.settings?.carousel_character_ids ?? null;
  const secretRareId = data?.settings?.secret_rare_character_id ?? null;
  const carousel = carouselIds
    ? Array.isArray(carouselIds)
      ? data?.characters?.filter((c: any) => (carouselIds as number[]).includes(c.id))
      : null
    : null;
  const secretRare = secretRareId
    ? data?.characters?.find((c: any) => c.id === Number(secretRareId)) ?? null
    : data?.characters?.find((c: any) => c.rarity === "secret_rare") ?? null;
  const commonChars =
    carousel ?? data?.characters?.filter((c: any) => c.rarity !== "secret_rare") ?? [];
  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) {
      setLeadStatus("error");
      return;
    }
    setLeadStatus("sending");
    try {
      await contentApi.createLead({ email: leadEmail, source: "homepage_club", consent: true, hp: "" });
      setLeadStatus("done");
      setLeadEmail("");
    } catch {
      setLeadStatus("error");
    }
  };

  // Character carousel
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center" />;
  }

  return (
    <>
      {/* 1. Hero — horizontal banner. The image sets the height (no cropping);
          the headline and CTA sit on top, aligned left. Falls back to the
          video only if no banner has been set in Settings. */}
      <section className="relative overflow-hidden bg-white">
        {bannerAsset ? (
          <img
            src={bannerAsset}
            alt=""
            className="block w-full h-auto"
          />
        ) : !prefersReducedMotion && videoAsset ? (
          <video
            ref={videoRef}
            className="block w-full h-auto"
            autoPlay
            muted
            loop
            playsInline
            poster={posterAsset || undefined}
          >
            <source src={videoAsset.url || videoAsset} type="video/mp4" />
          </video>
        ) : (
          <div className="w-full aspect-[21/9] bg-gradient-to-br from-[#FFE3EF] via-[#F7E9FF] to-[#FFF6E5] flex items-center justify-center">
            <FigurePlaceholder color="#F2C14E" size={200} />
          </div>
        )}

        {/* Readability scrim: only on the left, where the text sits. */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/40 to-transparent md:from-white/75 md:via-white/20" />

        <div className="absolute inset-0 flex items-center">
          <div className="w-full max-w-[1400px] mx-auto px-6 md:px-10">
            <div className="max-w-[52%] md:max-w-[46%]">
              <h1
                className="text-ink font-extrabold uppercase tracking-tight"
                style={{ fontSize: "clamp(26px, 5.2vw, 76px)", lineHeight: 0.95 }}
              >
                Collect.<br />Discover.<br />Trade.
              </h1>
              <p className="mt-3 md:mt-5 text-ink/80" style={{ fontSize: "clamp(12px, 1.5vw, 20px)" }}>
                Step into the magical<br className="hidden sm:block" /> world of YEYPEE.
              </p>
              <Link
                to="/collections"
                className="btn-pill mt-4 md:mt-8 inline-flex items-center gap-2 bg-ink text-white hover:bg-ink/90"
                style={{ fontSize: "clamp(9px, 1.05vw, 13px)" }}
              >
                EXPLORE COLLECTIONS <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 text-ink/40 scroll-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 10l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* 2. Featured collection */}
      <section className="py-24 md:py-[96px]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          {featured ? (
            <>
              <div className="grid md:grid-cols-2 gap-10 items-center fade-up">
                <div>
                  <div className="kicker text-candy-pink mb-3">FEATURED COLLECTION</div>
                  <h2 className="text-4xl md:text-6xl mb-4">{featured.name}</h2>
                  <p className="text-body leading-relaxed mb-8">{featured.tagline || featured.description}</p>
                  <Link to={`/collections/${featured.slug}`} className="btn-pill btn-primary">
                    MEET THE COLLECTION
                  </Link>
                </div>
                <div className="rounded-card overflow-hidden shadow-soft relative aspect-[4/3] bg-bg-soft">
                  {featured.heroImage ? (
                    <img src={featured.heroImage} alt={featured.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(105deg, ${featured.accentColor}22, ${featured.accentColor}55)` }}>
                      <FigurePlaceholder color={featured.accentColor} size={220} />
                    </div>
                  )}
                </div>
              </div>
              {/* Stats bar */}
              <div className="mt-12 border-t border-borderc grid grid-cols-3 divide-x divide-borderc fade-up">
                {[
                  { big: "7", small: "CHARACTERS + 1 SECRET RARE" },
                  { big: featured.seriesLabel || "SERIES 1", small: (featured.name || "").toUpperCase() },
                  { big: featured.releaseYear || "2024", small: "RELEASED" },
                ].map((s, i) => (
                  <div key={i} className="py-6 text-center">
                    <div className="text-3xl md:text-4xl font-extrabold text-ink">{s.big}</div>
                    <div className="kicker text-body mt-1">{s.small}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="fade-up">
              <EmptyState title="No featured collection yet" text="The featured collection will appear here once it's set in the admin panel." />
            </div>
          )}
        </div>
      </section>

      {/* 3. Explore all collections */}
      <section className="py-24 md:py-[96px] bg-bg-soft">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="mb-12 fade-up">
            <h2 className="text-4xl md:text-[56px] mb-3">EXPLORE THE WORLDS</h2>
            <p className="text-body text-lg italic">Each world. A new adventure.</p>
          </div>
          <div className="space-y-6">
            {data?.collections?.length ? (
              data.collections.map((c: any, i: number) => {
                const gradKey = COLOR_BY_SLUG[c.slug] || Object.keys(GRADIENTS)[i % 3];
                const grad = GRADIENTS[gradKey] || GRADIENTS.pink;
                const active = c.status !== "coming_soon";
                return (
                  <div
                    key={c.id}
                    className="zoom-parent relative rounded-card overflow-hidden h-[220px] md:h-[240px] fade-up"
                    style={{ background: grad }}
                  >
                    {c.cardImage && <img src={c.cardImage} alt={c.name} className="zoom-img absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
                    <div className="relative z-10 h-full flex items-center justify-between px-8 md:px-12">
                      <div>
                        <h3 className="text-white text-2xl md:text-[28px] mb-1">{c.name}</h3>
                        <p className="text-white/85 text-sm md:text-base italic">{c.tagline || c.description}</p>
                        {c.status === "coming_soon" && <span className="badge-pink mt-3">COMING SOON</span>}
                      </div>
                      {active ? (
                        <Link
                          to={`/collections/${c.slug}`}
                          className="w-12 h-12 rounded-full bg-white text-ink flex items-center justify-center text-xl font-bold hover:scale-105 transition-transform"
                          aria-label={`Explore ${c.name}`}
                        >
                          →
                        </Link>
                      ) : (
                        <span className="w-12 h-12 rounded-full bg-white/25 text-white flex items-center justify-center text-xl">→</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No worlds yet" text="Collections will appear here once created in the admin panel." />
            )}
          </div>
        </div>
      </section>

      {/* 4. Meet the characters */}
      <section className="py-24 md:py-[96px]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-10 fade-up">
            <h2 className="text-4xl md:text-[56px]">MEET THE CHARACTERS</h2>
            <div className="hidden md:flex gap-3">
              <button onClick={() => scrollCarousel(-1)} aria-label="Previous" className="w-11 h-11 rounded-full border border-borderc text-ink hover:bg-bg-soft transition-colors">←</button>
              <button onClick={() => scrollCarousel(1)} aria-label="Next" className="w-11 h-11 rounded-full border border-borderc text-ink hover:bg-bg-soft transition-colors">→</button>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 fade-up"
          >
            {commonChars.length ? (
              <>
                {commonChars.map((ch: any) => (
                  <Link
                    key={ch.id}
                    to={`/characters/${ch.slug}`}
                    className="snap-start shrink-0 w-56 md:w-64 rounded-card border border-borderc shadow-soft overflow-hidden transition-transform hover:-translate-y-1"
                    style={{ background: ch.cardBgColor || "#FFE3EF" }}
                  >
                    <div className="flex items-center justify-center p-6 h-52">
                      {ch.imageFront ? (
                        <img src={ch.imageFront} alt={ch.name} className="h-full object-contain" />
                      ) : (
                        <FigurePlaceholder color={ch.cardBgColor || "#FF5FA2"} size={150} />
                      )}
                    </div>
                    <div className="text-center py-4 bg-white">
                      <div className="font-extrabold uppercase tracking-tight text-lg">{ch.name}</div>
                      {ch.rarity !== "common" && <div className="badge-pink mt-1 text-[10px]">{ch.rarity.replace("_", " ")}</div>}
                    </div>
                  </Link>
                ))}
                {/* Secret rare card */}
                <Link
                  to="/characters"
                  className="snap-start shrink-0 w-56 md:w-64 rounded-card overflow-hidden transition-transform hover:-translate-y-1 relative"
                  style={{ background: "radial-gradient(circle at 50% 40%, #F2C14E 0%, #0F0F0F 55%)" }}
                >
                  <div className="flex items-center justify-center p-6 h-52 gold-pulse">
                    <FigurePlaceholder mystery size={150} />
                  </div>
                  <div className="text-center py-4">
                    <div className="font-extrabold uppercase tracking-tight text-lg text-gold">SECRET RARE</div>
                    <div className="kicker text-white/70 mt-1">Can you find it?</div>
                  </div>
                </Link>
              </>
            ) : (
              <EmptyState title="No characters yet" text="Characters will appear here once created in the admin panel." />
            )}
          </div>
        </div>
      </section>

      {/* 5. Secret rare */}
      <section className="py-10 md:py-16">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 fade-up">
          <div
            className="rounded-card relative overflow-hidden px-8 md:px-16 py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-8"
            style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(242,193,78,0.35) 0%, #0F0F0F 60%)" }}
          >
            <div className="text-center md:text-left">
              <div className="kicker text-gold mb-3">SECRET RARE</div>
              <h2 className="text-4xl md:text-[56px] text-white mb-3">{secretRare?.name || "THE GOLDEN ONE"}</h2>
              <p className="text-white/80 text-lg italic mb-6">Can you find the Golden YEYPEE?</p>
              <Link to="/characters" className="btn-pill btn-outline-gold">LEARN MORE</Link>
            </div>
            <div className="gold-pulse">
              <FigurePlaceholder mystery size={220} />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Retail partners */}
      <section className="py-24 md:py-[96px] bg-bg-soft">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-4xl md:text-[56px] mb-10 fade-up">WHERE TO FIND YEYPEE</h2>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 mb-10 fade-up">
            {data?.partners?.length ? (
              data.partners.map((p: any) => (
                <div key={p.id} className="grayscale hover:grayscale-0 transition-all duration-300">
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={p.name} className="h-10 object-contain" />
                  ) : (
                    <div className="h-10 flex items-center font-extrabold text-2xl text-body/70">{p.name}</div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-body">Retail partners will appear here once added in the admin panel.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 fade-up">
            <Link to="/shop" className="btn-pill btn-primary">FIND IN STORE</Link>
            <a href="/shop?online=1" className="btn-pill btn-secondary">SHOP ONLINE</a>
          </div>
        </div>
      </section>

      {/* 7. Latest news */}
      <section className="py-24 md:py-[96px]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="mb-10 fade-up">
            <h2 className="text-4xl md:text-[56px] mb-3">WHAT'S COMING NEXT?</h2>
            <p className="text-body text-lg italic">More adventures on the way.</p>
          </div>
          <div className="space-y-4">
            {data?.news?.length ? (
              data.news.map((n: any) => (
                <div key={n.id} className="fade-up rounded-smcard border border-borderc bg-white p-5 md:p-6 flex items-center gap-6 hover:shadow-soft transition-shadow">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-smcard overflow-hidden shrink-0 bg-bg-soft">
                    {n.thumbnail ? (
                      <img src={n.thumbnail} alt={n.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">✦</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl mb-1 normal-case font-bold">{n.title}</h3>
                    <p className="text-body text-sm">{n.excerpt}</p>
                  </div>
                  {n.badgeLabel && <span className="badge-pink shrink-0">{n.badgeLabel}</span>}
                </div>
              ))
            ) : (
              <EmptyState title="No news yet" text="Announcements will appear here once published in the admin panel." />
            )}
          </div>
          <div className="text-center mt-10 fade-up">
            <Link to="/collections" className="btn-pill btn-primary">VIEW ALL UPCOMING</Link>
          </div>
        </div>
      </section>

      {/* 8. Collector club */}
      <section className="py-24 md:py-[96px] bg-bg-soft">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-10 items-center fade-up">
            <div>
              <h2 className="text-4xl md:text-[56px] mb-4">JOIN THE YEYPEE CLUB!</h2>
              <p className="text-body text-lg mb-8">Get special updates, collector tips, and early access!</p>
              {leadStatus === "done" ? (
                <div className="rounded-smcard bg-candy-pink-100 text-candy-pink font-bold px-6 py-5 text-center">
                  🎉 You're in! Welcome to the YEYPEE Club.
                </div>
              ) : (
                <form onSubmit={submitLead} className="flex flex-col sm:flex-row gap-3">
                  {/* honeypot */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                  <input
                    type="email"
                    required
                    value={leadEmail}
                    onChange={(e) => {
                      setLeadEmail(e.target.value);
                      setLeadStatus("idle");
                    }}
                    placeholder="your@email.com"
                    className="flex-1 rounded-smcard border border-borderc px-5 py-4 outline-none focus:border-ink transition-colors bg-white"
                  />
                  <button type="submit" disabled={leadStatus === "sending"} className="btn-pill btn-primary whitespace-nowrap">
                    {leadStatus === "sending" ? "JOINING..." : "JOIN NOW"}
                  </button>
                </form>
              )}
              {leadStatus === "error" && (
                <p className="text-candy-pink text-sm mt-3">Please enter a valid email address.</p>
              )}
            </div>
            <div className="hidden md:flex items-center justify-center h-72 relative overflow-hidden rounded-card bg-gradient-to-br from-candy-pink-100 to-white">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #FF5FA2 2px, transparent 3px), radial-gradient(circle at 70% 60%, #9B84E8 2px, transparent 3px), radial-gradient(circle at 50% 80%, #F2C14E 2px, transparent 3px)" }} />
              <div className="flex gap-4">
                <FigurePlaceholder color="#FF5FA2" size={120} />
                <FigurePlaceholder color="#9B84E8" size={120} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
