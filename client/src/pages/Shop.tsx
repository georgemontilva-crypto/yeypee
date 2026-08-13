import { useEffect, useState } from "react";
import { contentApi } from "../lib/api";
import { useFadeUp } from "../components/ScrollToTop";
import { EmptyState, FigurePlaceholder } from "../components/Shared";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-card max-w-lg w-full max-h-[85vh] overflow-y-auto p-8 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full border border-borderc hover:bg-bg-soft">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StoreLocatorModal({ partners, onClose }: { partners: any[]; onClose: () => void }) {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState("25");
  const [stores, setStores] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  const search = async () => {
    if (zip.trim().length < 3) {
      setError(true);
      return;
    }
    setError(false);
    try {
      const d = await contentApi.stores(zip.trim(), radius);
      setStores(d.stores);
      setSearched(true);
    } catch {
      setSearched(true);
    }
  };

  return (
    <Modal title="Find in store" onClose={onClose}>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          value={zip}
          onChange={(e) => {
            setZip(e.target.value);
            setError(false);
          }}
          placeholder="ZIP code"
          className="flex-1 rounded-smcard border border-borderc px-4 py-3 outline-none focus:border-ink"
        />
        <button onClick={search} className="btn-pill btn-primary shrink-0">SEARCH</button>
      </div>
      {error && <p className="text-candy-pink text-sm mb-3">Please enter a valid ZIP code.</p>}
      <div className="flex gap-5 mb-6">
        {["10", "25", "50"].map((r) => (
          <label key={r} className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" name="radius" checked={radius === r} onChange={() => setRadius(r)} className="accent-black" />
            {r} miles
          </label>
        ))}
      </div>
      {searched && (
        stores.length ? (
          <ul className="space-y-3">
            {stores.map((s) => (
              <li key={s.id} className="border border-borderc rounded-smcard p-4">
                <div className="font-bold">{s.name}</div>
                <div className="text-sm text-body">
                  {[s.address, s.city, s.state].filter(Boolean).join(", ")} {s.zip} · {s.distance} mi
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.address, s.city, s.state, s.zip].filter(Boolean).join(", "))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-label text-candy-pink mt-2 inline-block"
                >
                  DIRECTIONS →
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <p className="text-body mb-4">No stores found near that ZIP. Try Shop Online!</p>
            <a href="/shop?online=1" className="btn-pill btn-primary">SHOP ONLINE</a>
          </div>
        )
      )}
    </Modal>
  );
}

function ShopOnlineModal({ partners, onClose }: { partners: any[]; onClose: () => void }) {
  const online = partners.filter((p) => p.type === "online" || p.type === "both");
  return (
    <Modal title="Shop online" onClose={onClose}>
      {online.length ? (
        <div className="space-y-4">
          {online.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-borderc rounded-smcard p-4">
              <div className="flex items-center gap-4">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt={p.name} className="h-8 object-contain grayscale hover:grayscale-0 transition-all" />
                ) : (
                  <div className="font-extrabold text-lg">{p.name}</div>
                )}
              </div>
              <a
                href={p.onlineUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="btn-pill btn-primary text-[10px] px-5 py-3"
              >
                BUY AT {p.name.toUpperCase()}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-body">Online retailers will appear here once added in the admin panel.</div>
      )}
    </Modal>
  );
}

export default function Shop() {
  useFadeUp();
  const [partners, setPartners] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [modal, setModal] = useState<null | "locator" | "online">(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Promise.all([contentApi.partners(), contentApi.products()])
      .then(([p, pr]) => {
        setPartners(p.partners);
        setProducts(pr.products);
        if (params.get("online") === "1") setModal("online");
      })
      .catch(() => {
        setPartners([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const lead = products[0] ?? null;
  const rest = products.slice(1);

  return (
    <section className="pt-32 pb-24 md:py-[96px]">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        <div className="mb-10 fade-up">
          <h1 className="text-[30px] sm:text-4xl md:text-[56px] mb-3">SHOP YEYPEE</h1>
          <p className="text-body text-lg italic">Available Now!</p>
        </div>

        {/* Lead product: the first active product from the admin, falling back
            to generic copy while the catalogue is empty. */}
        <div className="grid md:grid-cols-2 gap-10 items-center mb-16 fade-up">
          <div className="rounded-card overflow-hidden border border-borderc bg-bg-soft aspect-square flex items-center justify-center">
            {lead?.image ? (
              <img src={lead.image} alt={lead.name} className="w-full h-full object-contain p-6" />
            ) : (
              <FigurePlaceholder color="#FF5FA2" size={260} />
            )}
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl mb-4">{lead?.name?.toUpperCase() || "BLIND BOX DISPLAY"}</h2>
            {lead?.priceCents != null && (
              <div className="text-2xl font-extrabold mb-4">${(lead.priceCents / 100).toFixed(2)}</div>
            )}
            <p className="text-body mb-8 leading-relaxed">
              {lead?.description ||
                `Grab a blind box display case with ${Math.max(products.length, 6)} to collect plus 1 secret rare. Every box is a sweet surprise!`}
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setModal("locator")} className="btn-pill btn-primary">FIND IN STORE</button>
              <button onClick={() => setModal("online")} className="btn-pill btn-secondary">SHOP ONLINE</button>
            </div>
            <div className="flex flex-wrap items-center gap-8 mt-10">
              {partners.length ? (
                partners.map((p) => (
                  <div key={p.id} className="grayscale hover:grayscale-0 transition-all">
                    {p.logoUrl ? (
                      <img src={p.logoUrl} alt={p.name} className="h-9 object-contain" />
                    ) : (
                      <div className="font-extrabold text-xl text-body/70">{p.name}</div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-body text-sm">Retail partners appear here once added.</p>
              )}
            </div>
          </div>
        </div>

        {/* Products if checkout enabled / active products exist */}
        {!loading && rest.length > 0 && (
          <div className="fade-up">
            <h2 className="text-3xl mb-8">MORE PRODUCTS</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {rest.map((p: any) => (
                <div key={p.id} className="rounded-card border border-borderc bg-white p-6">
                  <div className="h-40 flex items-center justify-center mb-4 bg-bg-soft rounded-smcard">
                    {p.image ? <img src={p.image} alt={p.name} className="h-full object-contain" /> : <FigurePlaceholder size={100} />}
                  </div>
                  <div className="font-extrabold uppercase text-sm">{p.name}</div>
                  <div className="text-body text-sm mt-1">${(p.priceCents / 100).toFixed(2)}</div>
                  <div className="mt-3">
                    <button onClick={() => setModal("online")} className="btn-pill btn-secondary w-full text-[10px] py-3">BUY NOW</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!loading && products.length === 0 && (
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <EmptyState
            title="No products published yet"
            text="Products appear here once they are created in the admin panel with status Active."
          />
        </div>
      )}

      {modal === "locator" && <StoreLocatorModal partners={partners} onClose={() => setModal(null)} />}
      {modal === "online" && <ShopOnlineModal partners={partners} onClose={() => setModal(null)} />}
    </section>
  );
}
