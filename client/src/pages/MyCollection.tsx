import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { contentApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useFadeUp } from "../components/ScrollToTop";
import { EmptyState, FigurePlaceholder, SECRET_FIGURE_IMAGE } from "../components/Shared";

export default function MyCollection() {
  useFadeUp();
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [charsByCollection, setCharsByCollection] = useState<Record<number, any[]>>({});
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([contentApi.collections(), contentApi.characters()])
      .then(async ([co, ch]) => {
        setCollections(co.collections);
        const map: Record<number, any[]> = {};
        for (const c of ch.characters) {
          (map[c.collectionId] ||= []).push(c);
        }
        setCharsByCollection(map);
        if (user) {
          try {
            const d = await contentApi.progress();
            const prog: Record<number, boolean> = {};
            for (const p of d.progress) prog[p.characterId] = p.collected;
            setProgress(prog);
          } catch {
            /* guest */
          }
        }
      })
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, [user]);

  const toggle = async (characterId: number, collected: boolean) => {
    if (!user) return;
    setProgress((prev) => ({ ...prev, [characterId]: collected }));
    try {
      await contentApi.toggleProgress(characterId, collected);
    } catch {
      setProgress((prev) => ({ ...prev, [characterId]: !collected }));
    }
  };

  return (
    <section className="pt-32 pb-24 md:py-[96px]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="mb-10 fade-up">
          <h1 className="text-[30px] sm:text-4xl md:text-[56px] mb-3">YOUR COLLECTION</h1>
          <p className="text-body text-lg italic">Track your progress!</p>
        </div>
        {!user && (
          <div className="mb-8 rounded-smcard bg-candy-pink-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 fade-up">
            <span className="text-body text-sm">Sign in to save your collection progress.</span>
            <Link to="/login" className="btn-pill btn-primary text-[10px] px-5 py-3">LOG IN TO SAVE PROGRESS</Link>
          </div>
        )}
        {loading ? null : collections.length ? (
          <div className="space-y-10">
            {collections.map((c: any) => {
              const chars = charsByCollection[c.id] || [];
              const total = chars.length + (chars.some((x) => x.rarity === "secret_rare") ? 0 : 0);
              const collectedCount = chars.filter((ch: any) => progress[ch.id]).length;
              const pct = total > 0 ? Math.round((collectedCount / total) * 100) : 0;
              return (
                <div key={c.id} className="rounded-card border border-borderc bg-white p-6 md:p-8 fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-2xl md:text-3xl">{c.name}</h2>
                      <p className="text-body text-sm mt-1">{c.seriesLabel || "Series 1"} · {total} to collect + 1 secret rare</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold">{collectedCount}/{total} Collected</div>
                      <div className="progress-track w-48 mt-2"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {chars.length ? (
                      chars.map((ch: any) => {
                        const isSecret = ch.rarity === "secret_rare";
                        const done = progress[ch.id];
                        return (
                          <Link key={ch.id} to={`/characters/${ch.slug}`} className={`rounded-smcard border overflow-hidden transition-all ${done ? "border-jungle bg-jungle/5" : isSecret ? "border-gold/50 bg-black/5" : "border-borderc opacity-60"}`}>
                            <div className="flex items-center justify-center p-2 aspect-square sm:aspect-auto sm:h-40" style={{ background: isSecret ? undefined : (done ? undefined : ch.cardBgColor) }}>
                              {isSecret ? (
                                // Transparent PNG: no background box behind it.
                                <img
                                  src={SECRET_FIGURE_IMAGE}
                                  alt="Secret rare"
                                  className="h-full w-full object-contain scale-[1.12]"
                                />
                              ) : done ? (
                                <img src={ch.imageFront || undefined} alt={ch.name} className="h-full w-full object-contain scale-[1.12]" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <FigurePlaceholder color={ch.cardBgColor} size={90} />
                              )}
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 bg-white">
                              <span className="font-bold uppercase text-xs">{ch.name}</span>
                              {user ? (
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggle(ch.id, !done);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="accent-jungle w-4 h-4"
                                />
                              ) : (
                                <span className={`w-4 h-4 rounded-full border-2 ${done ? "bg-jungle border-jungle" : "border-borderc"}`} />
                              )}
                            </div>
                          </Link>
                        );
                      })
                    ) : (
                      <div className="col-span-full">
                        <EmptyState title="No characters in this collection yet" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No collections yet" text="Your collection tracker will appear here once collections are created in the admin panel." />
        )}
      </div>
    </section>
  );
}
