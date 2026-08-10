import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    if (user.role === "admin") navigate("/admin", { replace: true });
    else window.location.href = "/";
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await authApi.login({ email, password });
      await refresh();
      if (user?.role === "admin") navigate("/admin");
      else {
        setError("This account is not an administrator.");
        await authApi.logout();
      }
    } catch (err: any) {
      setError(err?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-bg-soft px-6">
      <div className="w-full max-w-md bg-white rounded-card shadow-soft p-10">
        <div className="logo-mark text-3xl text-center mb-8">YEYPEE <span className="kicker text-candy-pink ml-2">ADMIN</span></div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            className="w-full rounded-xl border border-borderc px-5 py-4 outline-none focus:border-ink transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-borderc px-5 py-4 outline-none focus:border-ink transition-colors"
          />
          {error && <p className="text-candy-pink text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-pill btn-primary w-full">
            {loading ? "LOGGING IN..." : "LOG IN"}
          </button>
        </form>
        <a href="/" className="block text-center mt-6 text-body text-sm underline">Back to site</a>
      </div>
    </section>
  );
}
