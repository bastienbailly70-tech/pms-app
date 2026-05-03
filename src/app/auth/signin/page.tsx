"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) setError("Email ou mot de passe incorrect.");
    else router.push(callbackUrl);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #f0f0fa 0%, #f5f3ff 40%, #faf5ff 100%)",
      }}
    >
      {/* Background decorations */}
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
          Bon retour !
        </h1>
        <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>
          Connectez-vous à votre espace gestionnaire.
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
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
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
                Connexion…
              </span>
            ) : "Se connecter"}
          </button>
        </form>

        <div className="divider my-5">ou</div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="btn btn-secondary w-full"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
          Pas encore de compte ?{" "}
          <Link href="/auth/signup" className="font-medium hover:underline" style={{ color: "var(--brand)" }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
