import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { contentApi } from "../lib/api";

interface CollectionProgress {
  id: number;
  name: string;
  slug: string;
  total: number;
  collected: number;
}

export default function Account() {
  const { user, logout } = useAuth();
  const [rows, setRows] = useState<CollectionProgress[] | null>(null);

  useEffect(() => {
    if (!user) return;
    // Cross the character list with what this user has ticked off.
    Promise.all([contentApi.characters(), contentApi.collections(), contentApi.progress()])
      .then(([ch, co, pr]: any[]) => {
        const collected = new Set<number>(
          (pr.progress || []).filter((p: any) => p.collected).map((p: any) => p.characterId)
        );
        const characters = ch.characters || [];
        const out: CollectionProgress[] = (co.collections || []).map((c: any) => {
          const mine = characters.filter((x: any) => x.collectionId === c.id);
          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            total: mine.length,
            collected: mine.filter((x: any) => collected.has(x.id)).length,
          };
        });
        setRows(out.filter((r) => r.total > 0));
      })
      .catch(() => setRows([]));
  }, [user]);

  if (!user) return null;

  const totalOwned = rows?.reduce((n, r) => n + r.collected, 0) ?? 0;
  const totalAll = rows?.reduce((n, r) => n + r.total, 0) ?? 0;

  return (
    <section className="pt-32 pb-24 min-h-screen">
      <div className="max-w-md mx-auto px-6">
        <h1 className="text-4xl mb-2 text-center">MY ACCOUNT</h1>
        <p className="text-body text-center mb-10">Welcome, {user.displayName}!</p>
        <div className="rounded-card border border-borderc bg-white divide-y divide-borderc overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="kicker text-body">EMAIL</div>
              <div className="font-bold">{user.email}</div>
            </div>
            {user.emailVerified ? (
              <span className="badge-pink" style={{ background: "#E6F7EE", color: "#2E7D4F" }}>VERIFIED</span>
            ) : (
              <span className="badge-pink">UNVERIFIED</span>
            )}
          </div>
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="kicker text-body">ROLE</div>
              <div className="font-bold uppercase">{user.role}</div>
            </div>
          </div>
        </div>
        {/* Collection progress */}
        <div className="mt-8 rounded-card border border-borderc bg-white p-5">
          <div className="flex items-baseline justify-between mb-1">
            <div className="kicker text-body">MY YEYPEE</div>
            <Link to="/my-collection" className="text-[11px] font-bold text-candy-pink underline">
              UPDATE
            </Link>
          </div>

          {rows === null ? (
            <p className="text-sm text-body mt-2">Loading your progress...</p>
          ) : totalAll === 0 ? (
            <p className="text-sm text-body mt-2">No characters to collect yet.</p>
          ) : (
            <>
              <div className="text-3xl font-extrabold">
                {totalOwned}
                <span className="text-body text-lg font-bold"> / {totalAll} collected</span>
              </div>
              <div className="h-2.5 rounded-full bg-bg-soft overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-candy-pink transition-all duration-500"
                  style={{ width: `${totalAll ? Math.round((totalOwned / totalAll) * 100) : 0}%` }}
                />
              </div>

              <div className="mt-5 space-y-3">
                {rows.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="font-bold uppercase tracking-wide">{r.name}</span>
                      <span className="text-body">
                        {r.collected}/{r.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-soft overflow-hidden">
                      <div
                        className="h-full rounded-full bg-candy-pink/70"
                        style={{ width: `${Math.round((r.collected / r.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <Link to="/my-collection" className="btn-pill btn-secondary w-full">MY COLLECTION</Link>
          {user.role === "admin" && (
            <Link to="/admin" className="btn-pill btn-primary w-full">ADMIN PANEL</Link>
          )}
          <button onClick={() => logout()} className="btn-pill w-full text-body hover:text-ink">LOG OUT</button>
        </div>
      </div>
    </section>
  );
}
