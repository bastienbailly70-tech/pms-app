"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeAccess, updateMemberRole } from "@/actions/team";
import type { TeamMember, PendingInvitation } from "@/lib/access";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Manager",
  VIEWER: "Lecteur",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  VIEWER: "bg-gray-100 text-gray-600",
};

type Props = {
  propertyId: string;
  owner: TeamMember | null;
  members: TeamMember[];
  invitations: PendingInvitation[];
  isOwner: boolean;
};

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? ""} className="w-8 h-8 rounded-full object-cover" />;
  }
  const initials = (name ?? "?")
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
      {initials}
    </div>
  );
}

function MemberRow({
  member,
  propertyId,
  isOwner,
}: {
  member: TeamMember;
  propertyId: string;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isOwnerRole = member.role === "OWNER";

  function handleRevoke() {
    if (!confirm(`Révoquer l'accès de ${member.name ?? member.email} ?`)) return;
    startTransition(async () => {
      await revokeAccess(propertyId, member.id);
      router.refresh();
    });
  }

  function handleRoleChange(role: "MANAGER" | "VIEWER") {
    startTransition(async () => {
      await updateMemberRole(propertyId, member.id, role);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar name={member.name} image={member.image} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{member.name ?? "—"}</p>
        <p className="text-xs text-gray-500 truncate">{member.email}</p>
      </div>
      {isOwner && !isOwnerRole ? (
        <select
          value={member.role}
          onChange={e => handleRoleChange(e.target.value as "MANAGER" | "VIEWER")}
          disabled={pending}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="MANAGER">Manager</option>
          <option value="VIEWER">Lecteur</option>
        </select>
      ) : (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[member.role]}`}>
          {ROLE_LABELS[member.role]}
        </span>
      )}
      {isOwner && !isOwnerRole && (
        <button
          onClick={handleRevoke}
          disabled={pending}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
        >
          Révoquer
        </button>
      )}
    </div>
  );
}

function InvitationRow({
  invitation,
  propertyId,
  isOwner,
}: {
  invitation: PendingInvitation;
  propertyId: string;
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { cancelInvitation } = require("@/actions/team") as typeof import("@/actions/team");

  function handleCancel() {
    startTransition(async () => {
      await cancelInvitation(propertyId, invitation.id);
      router.refresh();
    });
  }

  const link = typeof window !== "undefined"
    ? `${window.location.origin}/invitations/${invitation.token}`
    : `/invitations/${invitation.token}`;

  return (
    <div className="flex items-center gap-3 py-3 opacity-70">
      <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
        ?
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{invitation.email}</p>
        <p className="text-xs text-gray-400">
          Invitation envoyée · expire {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[invitation.role]}`}>
        {ROLE_LABELS[invitation.role]}
      </span>
      {isOwner && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => navigator.clipboard.writeText(link)}
            className="text-xs text-blue-600 hover:underline"
          >
            Copier lien
          </button>
          <button
            onClick={handleCancel}
            disabled={pending}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

export function TeamMemberList({ propertyId, owner, members, invitations, isOwner }: Props) {
  const all = [
    ...(owner ? [owner] : []),
    ...members,
  ];

  return (
    <div className="divide-y divide-gray-100">
      {all.map(m => (
        <MemberRow key={m.id} member={m} propertyId={propertyId} isOwner={isOwner} />
      ))}
      {invitations.map(inv => (
        <InvitationRow key={inv.id} invitation={inv} propertyId={propertyId} isOwner={isOwner} />
      ))}
      {all.length === 0 && invitations.length === 0 && (
        <p className="py-4 text-sm text-gray-400 text-center">Aucun membre pour ce bien.</p>
      )}
    </div>
  );
}
