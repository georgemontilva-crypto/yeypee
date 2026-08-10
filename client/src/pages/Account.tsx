import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Account() {
  const { user, logout } = useAuth();
  if (!user) return null;

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
