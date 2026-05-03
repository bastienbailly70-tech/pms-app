import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IconSettings, IconUsers, IconBuilding, IconBell, IconSync,
} from "@/components/ui/icons";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = session.user;
  const initials = (user.name ?? user.email ?? "U")
    .split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="px-8 py-7 max-w-3xl mx-auto animate-fade-in">

      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Paramètres
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Gérez votre compte et vos préférences
        </p>
      </div>

      {/* Profile card */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ background: "var(--brand)", boxShadow: "0 4px 14px rgb(99 102 241 / 0.28)" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
              {user.name ?? "Utilisateur"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {user.email}
            </p>
          </div>
          <div className="ml-auto">
            <span className="pill pill-purple">Propriétaire</span>
          </div>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5"
          style={{ borderTop: "1px solid var(--border-light)" }}
        >
          <div>
            <label>Nom complet</label>
            <input
              className="input"
              defaultValue={user.name ?? ""}
              placeholder="Votre nom"
              disabled
            />
          </div>
          <div>
            <label>Email</label>
            <input
              className="input"
              defaultValue={user.email ?? ""}
              type="email"
              disabled
            />
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--text-tertiary)" }}>
          La modification du profil sera disponible prochainement.
        </p>
      </div>

      {/* Setting sections */}
      <div className="space-y-3">
        {[
          {
            icon: <IconBuilding size={18} />,
            iconBg: "#eef2ff", iconColor: "#6366f1",
            title: "Biens",
            desc: "Gérez vos propriétés, photos et disponibilités.",
            href: "/properties",
            cta: "Voir les biens",
          },
          {
            icon: <IconUsers size={18} />,
            iconBg: "#f0fdf4", iconColor: "#059669",
            title: "Équipe",
            desc: "Invitez des collaborateurs et gérez les accès.",
            href: "/properties",
            cta: "Gérer l'équipe",
          },
          {
            icon: <IconSync size={18} />,
            iconBg: "#eff6ff", iconColor: "#2563eb",
            title: "Plateformes OTA",
            desc: "Connectez Airbnb, Booking.com, Agoda et plus.",
            href: "/properties",
            cta: "Configurer",
          },
          {
            icon: <IconBell size={18} />,
            iconBg: "#fdf4ff", iconColor: "#9333ea",
            title: "Notifications",
            desc: "Alertes conflits, check-ins et synchronisations.",
            href: "#",
            cta: "Bientôt disponible",
            disabled: true,
          },
        ].map(item => (
          <div key={item.title} className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: item.iconBg, color: item.iconColor }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
              {item.disabled ? (
                <span className="pill pill-gray shrink-0">{item.cta}</span>
              ) : (
                <Link
                  href={item.href}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  {item.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div
        className="card mt-5 p-5"
        style={{ borderColor: "#fecaca", background: "#fff7f7" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <IconSettings size={16} style={{ color: "var(--danger)" } as React.CSSProperties} />
          <p className="font-semibold text-sm" style={{ color: "var(--danger)" }}>Zone de danger</p>
        </div>
        <p className="text-xs mb-3" style={{ color: "#b91c1c" }}>
          Ces actions sont irréversibles. Procédez avec précaution.
        </p>
        <button className="btn btn-danger btn-sm" disabled>
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}
