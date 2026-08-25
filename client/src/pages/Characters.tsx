import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { EmptyState, FigurePlaceholder } from "../components/Shared";

const COLLECTION_CHIPS: Record<string, string> = {
  candy: "#FF5FA2",
  wild: "#2E7D4F",
  tiny: "#9B84E8",
};

function chipColorFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wild")) return COLLECTION_CHIPS.wild;
  if (lower.includes("tiny")) return COLLECTION_CHIPS.tiny;
  return COLLECTION_CHIPS.candy;
}

export default function Characters() {
  useFadeUp();
  const [characters, setCharacters] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [filterCollection, setFilterCollection] = useState<number | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([contentApi.characters(), contentApi.collections()])
      .then(([ch, co]) => {
        setCharacters(ch.characters);
        setCollections(co.collections);
      })
      .catch(() => {
        setCharacters([]);
        setCollections([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = characters.filter((ch) => {
    if (filterCollection && ch.collectionId !== filterCollection) return false;
    if (filterRarity && ch.rarity !== filterRarity) return false;
    return true;
  });

  const RARITY_CHIPS = [
    { value: null, label: "ALL" },
    { value: "common", label: "COMMON" },
    { value: "rare", label: "RARE" },
    { value: "secret_rare", label: "SECRET RARE" },
  ];

  return (
    <section className="pt-32 pb-24 md:py-[96px]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <h1 className="text-[30px] sm:text-4xl md:text-[56px] mb-8 fade-up">ALL CHARACTERS</h1>
        {/* Chips */}
        <div className="flex flex-wrap gap-3 mb-10 fade-up">
          <button
            onClick={() => setFilterCollection(null)}
            className={`btn-label px-5 py-3 rounded-full border transition-colors ${filterCollection === null ? "bg-ink text-white border-ink" : "bg-white border-borderc text-body hover:border-ink"}`}
          >
            ALL COLLECTIONS
          </button>
          {collections.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setFilterCollection(filterCollection === c.id ? null : c.id)}
              className={`btn-label px-5 py-3 rounded-full border transition-colors ${filterCollection === c.id ? "bg-ink text-white border-ink" : "bg-white border-borderc text-body hover:border-ink"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mb-12 fade-up">
          {RARITY_CHIPS.map((r) => (
            <button
              key={r.value ?? "all"}
              onClick={() => setFilterRarity(r.value)}
              className={`btn-label px-5 py-3 rounded-full border transition-colors ${filterRarity === r.value ? "bg-ink text-white border-ink" : "bg-white border-borderc text-body hover:border-ink"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {loading ? null : filtered.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filtered.map((ch: any) => (
              <Link key={ch.id} to={`/characters/${ch.slug}`} className="fade-up rounded-card border border-borderc shadow-soft overflow-hidden transition-transform hover:-translate-y-1" style={{ background: ch.cardBgColor || "#FFE3EF" }}>
                <div className="flex items-center justify-center p-2 sm:p-3 aspect-square md:aspect-auto md:h-48">
                  {ch.imageFront ? <img src={ch.imageFront} alt={ch.name} className="h-full w-full object-contain scale-[1.12]" /> : <FigurePlaceholder color={ch.cardBgColor} size={140} />}
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
          </div>
        ) : (
          <EmptyState title="No characters found" text="Try a different filter, or wait for new characters to be added." />
        )}
      </div>
    </section>
  );
}
