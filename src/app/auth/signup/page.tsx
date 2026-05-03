"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setError(data.error || "Erreur lors de la création du compte.");
    else router.push("/auth/signin");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #f0f0fa 0%, #f5f3ff 40%, #faf5ff 100%)",
      }}
    >
      <div
        className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", transform: "translate(40%, -40%)" }}
      />
      <div
        className="fixed bottom-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", transform: "translate(-40%, 40%)" }}
      />

      <div className="auth-card relative animate-scale-in">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "var(--brand)", boxShadow: "0 4px 12px rgb(99 102 241 / 0.3)" }}
          >
            P
          </div>
          <div>
            <p className="font-bold text-sm leading-none" style={{ color: "var(--text-primary)" }}>PMS Pro</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Property Management</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-1 tracking-tight" style={{ color: "var(--text-primary)" }}>
          Créer un compte
        </h1>
        <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>
          Gérez vos biens locatifs en un seul endroit.
        </p>

        {error && (
          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
            style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid #fecaca" }}
          >
            <span className="shrink-0">⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name">Nom complet</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Jean Dupont"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="8 caractères minimum"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg w-full mt-2"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Création…
              </span>
            ) : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
          Déjà un compte ?{" "}
          <Link href="/auth/signin" className="font-medium hover:underline" style={{ color: "var(--brand)" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
