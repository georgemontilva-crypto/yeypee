import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { EmptyState } from "../components/Shared";

const GRADIENTS = ["linear-gradient(105deg, #2E7D4F 0%, #4E9B6F 100%)", "linear-gradient(105deg, #FF5FA2 0%, #FF9DC4 100%)", "linear-gradient(105deg, #9B84E8 0%, #C3B4F5 100%)"];

export default function Collections() {
  useFadeUp();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi
      .collections()
      .then((d) => setCollections(d.collections))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="pt-32 pb-24 md:py-[96px]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="mb-12 fade-up">
          <h1 className="text-4xl md:text-[56px] mb-3">EXPLORE THE WORLDS</h1>
          <p className="text-body text-lg italic">Each world. A new adventure.</p>
        </div>
        {loading ? null : collections.length ? (
          <div className="space-y-6">
            {collections.map((c, i) => {
              const active = c.status !== "coming_soon";
              return (
                <div key={c.id} className="zoom-parent relative rounded-card overflow-hidden h-[220px] md:h-[240px] fade-up" style={{ background: c.accentColor ? `linear-gradient(105deg, ${c.accentColor}, ${c.accentColor}88)` : GRADIENTS[i % 3] }}>
                  {c.cardImage && <img src={c.cardImage} alt={c.name} className="zoom-img absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
                  <div className="relative z-10 h-full flex items-center justify-between px-8 md:px-12">
                    <div>
                      <h3 className="text-white text-2xl md:text-[28px] mb-1">{c.name}</h3>
                      <p className="text-white/85 text-sm md:text-base italic">{c.tagline || c.description}</p>
                      {c.status === "coming_soon" && <span className="badge-pink mt-3">COMING SOON</span>}
                    </div>
                    {active ? (
                      <Link to={`/collections/${c.slug}`} className="w-12 h-12 rounded-full bg-white text-ink flex items-center justify-center text-xl font-bold hover:scale-105 transition-transform">→</Link>
                    ) : (
                      <span className="w-12 h-12 rounded-full bg-white/25 text-white flex items-center justify-center text-xl">→</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No worlds yet" text="Collections will appear here once created in the admin panel." />
        )}
      </div>
    </section>
  );
}
