import { useState } from "react";
import { api } from "../lib/api";

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "done" | "error">("idle");
  const [loading, setLoading] = useState(false);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setStatus("sent");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const applyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return;
    setLoading(true);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-32 pb-24 min-h-screen">
      <div className="max-w-md mx-auto px-6">
        <h1 className="text-4xl mb-2 text-center">RESET PASSWORD</h1>
        <p className="text-body text-center mb-10">We'll help you get back in.</p>
        {token ? (
          status === "done" ? (
            <div className="text-center rounded-smcard bg-candy-pink-100 text-candy-pink font-bold px-6 py-5">
              Password updated! <a href="/login" className="underline">Log in</a>
            </div>
          ) : (
            <form onSubmit={applyReset} className="space-y-4">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="w-full rounded-xl border border-borderc px-5 py-4 outline-none focus:border-ink"
              />
              {status === "error" && <p className="text-candy-pink text-sm">This link is invalid or has expired.</p>}
              <button type="submit" disabled={loading} className="btn-pill btn-primary w-full">
                {loading ? "UPDATING..." : "SET NEW PASSWORD"}
              </button>
            </form>
          )
        ) : status === "sent" ? (
          <div className="text-center rounded-smcard bg-candy-pink-100 text-candy-pink font-bold px-6 py-5">
            If that email exists, a reset link is on its way. Check your inbox!
          </div>
        ) : (
          <form onSubmit={sendReset} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-borderc px-5 py-4 outline-none focus:border-ink"
            />
            {status === "error" && <p className="text-candy-pink text-sm">Something went wrong. Please try again.</p>}
            <button type="submit" disabled={loading} className="btn-pill btn-primary w-full">
              {loading ? "SENDING..." : "SEND RESET LINK"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
