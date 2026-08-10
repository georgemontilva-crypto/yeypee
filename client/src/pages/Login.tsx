import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.login({ email, password });
      await refresh();
      navigate("/account");
    } catch (err: any) {
      setError(err?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-32 pb-24 min-h-screen">
      <div className="max-w-md mx-auto px-6">
        <h1 className="text-4xl mb-2 text-center">WELCOME BACK</h1>
        <p className="text-body text-center mb-10">Log in to your YEYPEE account.</p>
        <form onSubmit={submit} className="space-y-4">
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
        <div className="text-center mt-8 text-body text-sm space-y-2">
          <div>
            Don't have an account?{" "}
            <Link to="/register" className="text-ink font-bold underline">SIGN UP</Link>
          </div>
          <div>
            <Link to="/reset-password" className="underline">Forgot password?</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
