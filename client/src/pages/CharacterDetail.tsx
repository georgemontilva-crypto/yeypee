import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { contentApi } from "../lib/api";
import { Icon } from "../components/Icons";
import { useFadeUp } from "../components/ScrollToTop";
import { BackLink, EmptyState, FigurePlaceholder, Badge } from "../components/Shared";

export default function CharacterDetail() {
  const { slug } = useParams<{ slug: string }>();
  useFadeUp();
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<"front" | "side" | "back">("front");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    contentApi.settings().then((d) => setSettings(d?.settings ?? {})).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setView("front");
    contentApi
      .character(slug)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-[60vh]" />;
  if (!data?.character) {
    return (
      <>
        <BackLink />
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-16">
          <EmptyState title="Character not found" />
        </div>
      </>
    );
  }
  const ch = data.character;
  const attrs = [
    { icon: "🍭", key: settings.icon_favorite_candy, label: "Favorite Candy", value: ch.favoriteCandy },
    { icon: "♥", key: settings.icon_best_friend, label: "Best Friend", value: ch.bestFriend },
    { icon: "📅", key: settings.icon_birthday, label: "Birthday", value: ch.birthday },
    { icon: "◎", key: settings.icon_appears_in, label: "Appears In", value: ch.appearsIn || ch.collectionName },
  ].filter((a) => a.value);
  const currentImg = view === "front" ? ch.imageFront : view === "side" ? ch.imageSide : ch.imageBack;

  const views: { key: "front" | "side" | "back"; img: string | null }[] = [
    { key: "front", img: ch.imageFront },
    { key: "side", img: ch.imageSide },
    { key: "back", img: ch.imageBack },
  ];

  return (
    <>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-24">
        <div className="flex items-center justify-between">
          <Link to="/characters" className="btn-label text-body hover:text-ink inline-flex items-center gap-1">
            ‹ ALL CHARACTERS
          </Link>
          <div className="flex items-center gap-3">
            {data.prev && (
              <Link to={`/characters/${data.prev.slug}`} className="btn-label text-body hover:text-ink">PREV</Link>
            )}
            <span className="text-borderc">|</span>
            {data.next && (
              <Link to={`/characters/${data.next.slug}`} className="btn-label text-body hover:text-ink">NEXT</Link>
            )}
          </div>
        </div>
      </div>

      <section className="py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-12 items-start">
          <div className="fade-up">
            <div className="rounded-card border border-borderc bg-white min-h-[420px] flex items-center justify-center overflow-hidden">
              {currentImg ? (
                <img src={currentImg} alt={ch.name} className="max-h-[460px] object-contain p-8" />
              ) : (
                <FigurePlaceholder color={ch.cardBgColor} size={220} />
              )}
            </div>
            {/* Thumbnails */}
            <div className="flex gap-4 mt-5">
              {views.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`flex-1 rounded-smcard border overflow-hidden h-24 transition-all ${view === v.key ? "border-ink ring-2 ring-ink/10" : "border-borderc opacity-70 hover:opacity-100"}`}
                >
                  {v.img ? (
                    <img src={v.img} alt={v.key} className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-body bg-bg-soft">
                      {v.key}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-3">
              {views.map((v) => (
                <span key={v.key} className={`kicker ${view === v.key ? "text-ink" : "text-body"}`}>{v.key.toUpperCase()}</span>
              ))}
            </div>
          </div>

          <div className="fade-up">
            <div className="kicker text-candy-pink mb-2">{ch.collectionName} SERIES</div>
            <h1 className="text-[30px] sm:text-4xl md:text-6xl mb-4">{ch.name}</h1>
            <div className="mb-6"><Badge label={ch.rarity.toUpperCase().replace("_", " ")} rarity={ch.rarity} /></div>
            <p className="text-body leading-relaxed mb-8">{ch.description || "A lovable YEYPEE character waiting to join your collection."}</p>
            <div className="space-y-4 mb-10">
              {attrs.map((a) => (
                <div key={a.label} className="flex items-center gap-4 border-b border-borderc pb-4">
                  <span className="w-8 flex items-center justify-center text-xl text-ink">
                    {a.key ? <Icon name={a.key} size={22} /> : a.icon}
                  </span>
                  <div className="kicker text-body w-36">{a.label}</div>
                  <div className="font-bold text-ink">{a.value}</div>
                </div>
              ))}
            </div>
            <Link to={`/collections/${ch.collectionSlug}`} className="btn-pill btn-secondary">EXPLORE {ch.collectionName?.toUpperCase()}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
