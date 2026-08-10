import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Register() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ email, password, displayName: name || undefined });
      await refresh();
      navigate("/account");
    } catch (err: any) {
      setError(err?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-32 pb-24 min-h-screen">
      <div className="max-w-md mx-auto px-6">
        <h1 className="text-4xl mb-2 text-center">JOIN YEYPEE</h1>
        <p className="text-body text-center mb-10">Create your collector account.</p>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-xl border border-borderc px-5 py-4 outline-none focus:border-ink transition-colors"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-borderc px-5 py-4 outline-none focus:border-ink transition-colors"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 characters)"
            className="w-full rounded-xl border border-borderc px-5 py-4 outline-none focus:border-ink transition-colors"
          />
          {error && <p className="text-candy-pink text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-pill btn-primary w-full">
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
        </form>
        <div className="text-center mt-8 text-body text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-ink font-bold underline">LOG IN</Link>
        </div>
      </div>
    </section>
  );
}
