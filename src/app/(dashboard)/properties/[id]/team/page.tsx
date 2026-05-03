import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPropertyRole, getPropertyTeam } from "@/lib/access";
import { TeamMemberList } from "@/components/features/team/TeamMemberList";
import { InviteForm } from "@/components/features/team/InviteForm";

export default async function PropertyTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const [property, role] = await Promise.all([
    prisma.property.findFirst({
      where: { id },
      select: { id: true, name: true, ownerId: true },
    }),
    getPropertyRole(session.user.id, id),
  ]);

  if (!property || !role) notFound();

  const isOwner = role === "OWNER";
  const { owner, members, invitations } = await getPropertyTeam(id);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/properties" className="hover:text-gray-700">Biens</Link>
        <span>/</span>
        <Link href={`/properties/${id}`} className="hover:text-gray-700 truncate max-w-[140px]">
          {property.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Équipe</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Équipe</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {members.length + 1} membre{members.length > 0 ? "s" : ""}
          {invitations.length > 0 && ` · ${invitations.length} invitation${invitations.length > 1 ? "s" : ""} en attente`}
        </p>
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className={sectionTitle}>Membres</h2>
        <div className="mt-3">
          <TeamMemberList
            propertyId={id}
            owner={owner}
            members={members}
            invitations={invitations}
            isOwner={isOwner}
          />
        </div>
      </div>

      {/* Invite form — only for owner */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className={sectionTitle}>Inviter un collaborateur</h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-4">
            L'invitation génère un lien unique à partager. Aucun email n'est envoyé automatiquement.
          </p>
          <InviteForm propertyId={id} />
        </div>
      )}
    </div>
  );
}

const sectionTitle = "text-xs font-semibold text-gray-500 uppercase tracking-wide";
