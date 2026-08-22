import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { EmptyState, FigurePlaceholder, SECRET_FIGURE_IMAGE } from "../components/Shared";

export default function Home() {
  useFadeUp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  // Slider slides, falling back to the single-banner settings.
  const desktopSlides: string[] = (() => {
    const list = data?.settings?.hero_banners;
    if (Array.isArray(list) && list.length) return list;
    return data?.settings?.hero_banner ? [data.settings.hero_banner] : [];
  })();
  const mobileSlides: string[] = (() => {
    const list = data?.settings?.hero_banners_mobile;
    if (Array.isArray(list) && list.length) return list;
    return data?.settings?.hero_banner_mobile ? [data.settings.hero_banner_mobile] : [];
  })();
  const bannerAsset = desktopSlides[0] ?? null;
  const mobileBannerAsset = mobileSlides[0] ?? null;

  // One entry per slide, pairing the desktop and phone artwork by position so a
  // site can define either list (or both).
  const slides = Array.from(
    { length: Math.max(desktopSlides.length, mobileSlides.length) },
    (_, i) => ({
      desktop: desktopSlides[i] ?? desktopSlides[desktopSlides.length - 1] ?? null,
      mobile: mobileSlides[i] ?? mobileSlides[mobileSlides.length - 1] ?? null,
    })
  );
  const secretBanner = data?.settings?.secret_rare_banner ?? null;
  const secretCard = data?.settings?.secret_rare_card ?? null;
  const partnersBg = data?.settings?.partners_bg ?? null;
  const clubBg = data?.settings?.club_bg ?? null;
  const clubImage = data?.settings?.club_image ?? null;
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
  // Characters that belong to the featured collection, for its stats bar.
  const featuredCharacters = (data?.characters ?? []).filter(
    (ch: any) => featured && ch.collectionId === featured.id
  );
  const featuredSecrets = featuredCharacters.filter((ch: any) => ch.rarity === "secret_rare");
  const featuredRegulars = featuredCharacters.filter((ch: any) => ch.rarity !== "secret_rare");
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

  // Auto-advance the hero slider.
  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setSlideIndex((i) => (i + 1) % slides.length),
      6000
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (loading) {
    // A skeleton of the real layout: an empty box made the footer jump up and
    // left a blank strip on every reload.
    return (
      <div className="animate-pulse">
        <div className="w-full aspect-[4/5] lg:aspect-[21/9] bg-bg-soft" />
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-14 md:py-20">
          <div className="h-7 w-64 rounded-lg bg-bg-soft mb-8" />
          <div className="flex gap-6 md:gap-10">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="shrink-0">
                <div className="rounded-full bg-bg-soft w-[104px] h-[104px] md:w-[132px] md:h-[132px]" />
                <div className="h-3 w-20 rounded bg-bg-soft mt-3 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 1. Hero — horizontal banner. The image sets the height (no cropping).
          Desktop: headline on the left, vertically centred.
          Phone/tablet: a taller image is used and the headline sits centred at
          the top, leaving the lower half of the frame free for the figures. */}
      <section className="relative overflow-hidden bg-white">
        {bannerAsset || mobileBannerAsset ? (
          <div className="relative">
            {/* The first slide is in normal flow so it sets the section height;
                the rest are stacked on top and cross-fade over it. */}
            {slides.map((slide, i) => (
              <picture key={slide.desktop || slide.mobile || i}>
                {slide.mobile && <source media="(max-width: 1023px)" srcSet={slide.mobile} />}
                <img
                  src={slide.desktop || slide.mobile}
                  alt=""
                  className={`w-full h-auto max-h-[86vh] object-cover object-bottom lg:max-h-none lg:object-contain transition-opacity duration-1000 ${
                    i === 0 ? "block" : "absolute inset-0 h-full"
                  } ${i === slideIndex ? "opacity-100" : "opacity-0"}`}
                />
              </picture>
            ))}

            {slides.length > 1 && (
              <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    aria-current={i === slideIndex}
                    className={`h-2.5 rounded-full transition-all ${
                      i === slideIndex ? "w-7 bg-ink" : "w-2.5 bg-ink/30 hover:bg-ink/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
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
          <div className="w-full aspect-[4/5] lg:aspect-[21/9] bg-gradient-to-br from-[#FFE3EF] via-[#F7E9FF] to-[#FFF6E5] flex items-center justify-center">
            <FigurePlaceholder color="#F2C14E" size={200} />
          </div>
        )}

        {/* Readability scrim: from the top on phones (text above the figures),
            from the left on desktop (text beside them). */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/92 via-white/30 via-45% to-transparent lg:bg-gradient-to-r lg:from-white/80 lg:via-white/25 lg:to-transparent" />

        <div className="absolute inset-0 flex items-start lg:items-center">
          <div className="w-full max-w-[1500px] mx-auto px-6 lg:px-12 pt-[12%] sm:pt-[10%] lg:pt-0">
            <div className="text-center lg:text-left mx-auto lg:mx-0 max-w-none lg:max-w-[46%]">
              <h1
                className="text-ink font-extrabold uppercase tracking-tight"
                style={{ fontSize: "clamp(40px, 9vw, 104px)", lineHeight: 1.1 }}
              >
                Collect.<br />Discover.<br />Trade.
              </h1>
              <p
                className="mt-4 lg:mt-7 text-ink/80 mx-auto lg:mx-0 max-w-[22ch]"
                style={{ fontSize: "clamp(16px, 2.6vw, 24px)", lineHeight: 1.45 }}
              >
                Step into the magical world of YEYPEE.
              </p>
              <Link
                to="/collections"
                className="btn-pill mt-5 lg:mt-9 inline-flex items-center gap-2 bg-ink text-white hover:bg-ink/90"
                style={{ fontSize: "clamp(11px, 1.3vw, 14px)" }}
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

      {/* 2. Explore our worlds — circular shortcuts, one per collection.
          The artwork is shown as-is: no tint, no blend mode, no scrim. */}
      <section className="pt-16 md:pt-20 pb-4">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4 mb-8 fade-up">
            <h2 className="text-2xl md:text-[32px]">EXPLORE OUR WORLDS</h2>
            <Link to="/collections" className="nav-link btn-label text-body shrink-0">
              VIEW ALL
            </Link>
          </div>

          {data?.collections?.length ? (
            <div className="flex gap-6 md:gap-10 overflow-x-auto overflow-y-visible pt-4 pb-5 -mt-4 fade-up justify-start lg:justify-center -mx-6 px-6 lg:mx-0 lg:px-0">
              {data.collections.map((c: any) => {
                const comingSoon = c.status === "coming_soon";
                const inner = (
                  <>
                    <span className="relative block w-[104px] h-[104px] md:w-[132px] md:h-[132px] mx-auto">
                      {comingSoon && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ink text-white shadow-soft">
                          Coming soon
                        </span>
                      )}
                      <span className="world-bubble block rounded-full overflow-hidden bg-bg-soft w-full h-full">
                      {c.cardImage || c.heroImage ? (
                        // Card Image feeds both the /collections banner and this
                        // round shortcut; Hero Image is only the page banner.
                        <img
                          src={c.cardImage || c.heroImage}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-body">
                          ?
                        </span>
                      )}
                      </span>
                    </span>
                    <span className="kicker text-ink mt-3 block text-center max-w-[140px] mx-auto">
                      {c.name}
                    </span>
                  </>
                );
                return comingSoon ? (
                  <span key={c.id} className="shrink-0 cursor-default" title="Coming soon">
                    {inner}
                  </span>
                ) : (
                  <Link key={c.id} to={`/collections/${c.slug}`} className="world-link shrink-0">
                    {inner}
                  </Link>
                );
              })}

              <span className="shrink-0">
                <span className="rounded-full w-[104px] h-[104px] md:w-[132px] md:h-[132px] bg-ink text-white flex items-center justify-center text-4xl font-extrabold">
                  ?
                </span>
                <span className="kicker text-body mt-3 block text-center">COMING SOON</span>
              </span>
            </div>
          ) : (
            <EmptyState title="No worlds yet" text="Collections will appear here once created in the admin panel." />
          )}
        </div>
      </section>

      {/* 3. Featured collection */}
      <section className="py-14 md:py-[96px]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          {featured ? (
            <>
              <div className="grid md:grid-cols-2 gap-10 items-center fade-up">
                <div>
                  <div className="kicker text-candy-pink mb-3">FEATURED COLLECTION</div>
                  <h2 className="text-[30px] sm:text-4xl md:text-6xl mb-4">{featured.name}</h2>
                  {featured.tagline && (
                    <p className="text-ink/80 text-lg md:text-xl italic mb-4">{featured.tagline}</p>
                  )}
                  {/* The longer story comes from the collection's Description
                      field in the admin. */}
                  {featured.description && (
                    <p className="text-body leading-relaxed mb-8 max-w-prose whitespace-pre-line">
                      {featured.description}
                    </p>
                  )}
                  {!featured.tagline && !featured.description && <div className="mb-8" />}
                  <Link to={`/collections/${featured.slug}`} className="btn-pill btn-primary">
                    MEET THE COLLECTION
                  </Link>
                </div>
                {/* The image sets the shape: whatever ratio it has, it is shown
                    whole instead of being cropped to a fixed box. */}
                <div className="rounded-card overflow-hidden shadow-soft relative bg-bg-soft">
                  {featured.cardImage || featured.heroImage ? (
                    <img
                      src={featured.cardImage || featured.heroImage}
                      alt={featured.name}
                      className="block w-full h-auto"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] flex items-center justify-center">
                      <FigurePlaceholder color="#F2C14E" size={220} />
                    </div>
                  )}
                </div>
              </div>
              {/* Stats bar */}
              <div className="mt-10 md:mt-12 border-t border-borderc grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-borderc fade-up">
                {[
                  {
                    big:
                      featured.statCountValue ||
                      (featuredSecrets.length
                        ? `${featuredRegulars.length}+${featuredSecrets.length}`
                        : `${featuredRegulars.length}`),
                    small:
                      featured.statCountLabel ||
                      (featuredSecrets.length
                        ? `CHARACTERS + ${featuredSecrets.length} SECRET RARE${featuredSecrets.length > 1 ? "S" : ""}`
                        : "CHARACTERS"),
                  },
                  {
                    big: featured.seriesLabel || "SERIES 1",
                    small: featured.statSeriesLabel || (featured.name || "").toUpperCase(),
                  },
                  { big: featured.releaseYear || "2024", small: featured.statYearLabel || "RELEASED" },
                ].map((s, i) => (
                  <div key={i} className="py-5 md:py-6 px-3 text-center">
                    <div className="text-2xl md:text-4xl font-extrabold text-ink break-words">{s.big}</div>
                    <div className="kicker text-body mt-1 leading-snug">{s.small}</div>
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

      {/* 4. Meet the characters */}
      <section className="py-14 md:py-[96px]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-10 fade-up">
            <h2 className="text-[30px] sm:text-4xl md:text-[56px]">MEET THE CHARACTERS</h2>
            <div className="hidden md:flex gap-3">
              <button onClick={() => scrollCarousel(-1)} aria-label="Previous" className="w-11 h-11 rounded-full border border-borderc text-ink hover:bg-bg-soft transition-colors">←</button>
              <button onClick={() => scrollCarousel(1)} aria-label="Next" className="w-11 h-11 rounded-full border border-borderc text-ink hover:bg-bg-soft transition-colors">→</button>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 fade-up -mx-6 px-6 lg:mx-0 lg:px-0"
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
                    <div className="flex items-center justify-center p-5 sm:p-6 aspect-square md:aspect-auto md:h-52">
                      {ch.imageFront ? (
                        <img src={ch.imageFront} alt={ch.name} className="h-full object-contain" />
                      ) : (
                        <FigurePlaceholder color={ch.cardBgColor || "#FF5FA2"} size={150} />
                      )}
                    </div>
                    <div className="text-center py-4 bg-white">
                      <div className="font-extrabold uppercase tracking-tight text-lg">{ch.name}</div>
                      {ch.rarity !== "common" && (
                    <div
                      className="mt-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md inline-block"
                      style={{
                        background: `var(--rarity-${ch.rarity}-bg, var(--candy-pink-100))`,
                        color: `var(--rarity-${ch.rarity}-fg, var(--candy-pink))`,
                      }}
                    >
                      {ch.rarity.replace("_", " ")}
                    </div>
                  )}
                    </div>
                  </Link>
                ))}
                {/* Secret rare card */}
                <Link
                  to={secretRare?.slug ? `/characters/${secretRare.slug}` : "/characters"}
                  className="snap-start shrink-0 w-56 md:w-64 rounded-card overflow-hidden transition-transform hover:-translate-y-1 relative"
                  style={{ background: "radial-gradient(circle at 50% 40%, #F2C14E 0%, #0F0F0F 55%)" }}
                >
                  <div className="flex items-center justify-center p-5 sm:p-6 aspect-square md:aspect-auto md:h-52 gold-pulse">
                    {secretCard || secretRare?.imageFront ? (
                      <img
                        src={secretCard || secretRare.imageFront}
                        alt={secretRare?.name || "Secret rare"}
                        className="h-full object-contain"
                      />
                    ) : (
                      <img src={SECRET_FIGURE_IMAGE} alt="Secret rare" className="h-full object-contain" />
                    )}
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

      {/* 5. Secret rare. A banner uploaded in the admin fills the strip; if
          none is set it falls back to the gold glow plus the character art. */}
      <section className="py-10 md:py-16">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 fade-up">
          {secretBanner ? (
            <div className="rounded-card relative overflow-hidden bg-ink">
              <img src={secretBanner} alt="" className="block w-full h-auto" />
              {/* On phones the copy sits under the image so nothing gets clipped;
                  from lg it overlays the left half as designed. */}
              <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
              <div className="lg:absolute lg:inset-0 flex items-center">
                <div className="px-6 sm:px-8 lg:px-16 py-8 lg:py-0 w-full lg:w-auto lg:max-w-[60%]">
                  <div className="kicker text-gold mb-2 md:mb-3">SECRET RARE</div>
                  <h2
                    className="text-white mb-2 md:mb-3"
                    style={{ fontSize: "clamp(28px, 4.6vw, 56px)", lineHeight: 1.08 }}
                  >
                    {secretRare?.name || "THE GOLDEN ONE"}
                  </h2>
                  <p
                    className="text-white/80 italic mb-4 md:mb-6"
                    style={{ fontSize: "clamp(14px, 1.7vw, 18px)" }}
                  >
                    {secretRare?.description || "Can you find the Golden YEYPEE?"}
                  </p>
                  <Link
                    to={secretRare?.slug ? `/characters/${secretRare.slug}` : "/characters"}
                    className="btn-pill btn-outline-gold"
                  >
                    LEARN MORE
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-card relative overflow-hidden px-6 sm:px-8 md:px-16 py-10 sm:py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-8"
              style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(242,193,78,0.35) 0%, #0F0F0F 60%)" }}
            >
              <div className="text-center md:text-left">
                <div className="kicker text-gold mb-3">SECRET RARE</div>
                <h2 className="text-[30px] sm:text-4xl md:text-[56px] text-white mb-3">
                  {secretRare?.name || "THE GOLDEN ONE"}
                </h2>
                <p className="text-white/80 text-lg italic mb-6">
                  {secretRare?.description || "Can you find the Golden YEYPEE?"}
                </p>
                <Link
                  to={secretRare?.slug ? `/characters/${secretRare.slug}` : "/characters"}
                  className="btn-pill btn-outline-gold"
                >
                  LEARN MORE
                </Link>
              </div>
              <div className="gold-pulse shrink-0">
                {secretRare?.imageFront ? (
                  <img
                    src={secretRare.imageFront}
                    alt={secretRare.name}
                    className="w-[180px] h-[180px] md:w-[260px] md:h-[260px] object-contain"
                  />
                ) : (
                  <img src={SECRET_FIGURE_IMAGE} alt="Secret rare" className="h-[200px] w-auto object-contain" />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. Retail partners */}
      <section
        className={`relative py-14 md:py-[96px] ${partnersBg ? "" : "bg-bg-soft"}`}
        style={partnersBg ? { backgroundImage: `url(${partnersBg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {/* Veil so the title and logos stay readable over any photo. */}
        {partnersBg && <div className="absolute inset-0 bg-white/70" />}
        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-[30px] sm:text-4xl md:text-[56px] mb-10 fade-up">WHERE TO FIND YEYPEE</h2>
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
      <section className="py-14 md:py-[96px]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="mb-10 fade-up">
            <h2 className="text-[30px] sm:text-4xl md:text-[56px] mb-3">WHAT'S COMING NEXT?</h2>
            <p className="text-body text-lg italic">More adventures on the way.</p>
          </div>
          <div className="space-y-4">
            {data?.news?.length ? (
              data.news.map((n: any) => (
                <div key={n.id} className="fade-up rounded-smcard border border-borderc bg-white p-4 sm:p-5 md:p-6 flex items-center gap-4 sm:gap-6 hover:shadow-soft transition-shadow overflow-hidden">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-smcard overflow-hidden shrink-0 bg-bg-soft">
                    {n.thumbnail ? (
                      <img src={n.thumbnail} alt={n.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">✦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base sm:text-lg md:text-xl mb-1 normal-case font-bold">{n.title}</h3>
                      {/* Inside the text column so it can never push past the card. */}
                      {n.badgeLabel && (
                        <span className="badge-pink shrink-0 whitespace-nowrap text-[9px] px-2 py-1">
                          {n.badgeLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-body text-sm">{n.excerpt}</p>
                  </div>
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
      <section
        className={`relative py-14 md:py-[96px] ${clubBg ? "" : "bg-bg-soft"}`}
        style={clubBg ? { backgroundImage: `url(${clubBg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {clubBg && <div className="absolute inset-0 bg-white/70" />}
        <div className="relative max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-10 items-end fade-up">
            <div className="pb-2 md:pb-8">
              <h2 className="text-[30px] sm:text-4xl md:text-[56px] mb-4">JOIN THE YEYPEE CLUB!</h2>
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
            {clubImage ? (
              // Shown whole (never cropped), sitting on the same baseline as the
              // text column and using the full width of its half.
              <div className="hidden md:flex h-[22rem] lg:h-[30rem] items-end justify-center lg:justify-end">
                <img
                  src={clubImage}
                  alt=""
                  className="h-full w-full object-contain object-bottom"
                />
              </div>
            ) : (
              <div className="hidden md:flex items-center justify-center h-72 relative overflow-hidden rounded-card bg-gradient-to-br from-candy-pink-100 to-white">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #FF5FA2 2px, transparent 3px), radial-gradient(circle at 70% 60%, #9B84E8 2px, transparent 3px), radial-gradient(circle at 50% 80%, #F2C14E 2px, transparent 3px)" }} />
                <div className="flex gap-4">
                  <FigurePlaceholder color="#FF5FA2" size={120} />
                  <FigurePlaceholder color="#9B84E8" size={120} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
