"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";
import {
  IconDashboard, IconBuilding, IconCalendar,
  IconBarChart, IconSettings, IconLogOut,
} from "@/components/ui/icons";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "Tableau de bord", icon: IconDashboard },
  { href: "/properties",  label: "Biens",            icon: IconBuilding  },
  { href: "/bookings",    label: "Réservations",     icon: IconCalendar  },
  { href: "/analytics",   label: "Analytiques",      icon: IconBarChart  },
  { href: "/settings",    label: "Paramètres",       icon: IconSettings  },
];

export function Sidebar({ user, conflictCount = 0 }: { user: User; conflictCount?: number }) {
  const pathname = usePathname();

  const initials = (user.name ?? user.email ?? "U")
    .split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 244,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{
              background: "var(--brand)",
              boxShadow: "0 0 0 4px rgba(99,102,241,0.2)",
            }}
          >
            P
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">PMS Pro</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--sidebar-text)" }}>
              Property Manager
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 overflow-y-auto">
        <p
          className="px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#334155" }}
        >
          Menu
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item${active ? " active" : ""}`}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {href === "/bookings" && conflictCount > 0 && (
                <span
                  className="text-white rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "#ef4444",
                    minWidth: 18, height: 18, padding: "0 5px",
                    fontSize: 10, fontWeight: 700,
                  }}
                >
                  {conflictCount > 9 ? "9+" : conflictCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-2.5 pb-4 pt-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "var(--brand)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {user.name ?? "Utilisateur"}
            </p>
            <p className="text-xs truncate leading-tight" style={{ color: "var(--sidebar-text)" }}>
              {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="nav-item w-full mt-0.5"
        >
          <IconLogOut size={15} />
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
}
