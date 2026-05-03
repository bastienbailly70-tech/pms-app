import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { acceptInvitation } from "@/actions/team";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await auth();
  const { token } = await params;

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/invitations/${token}`);
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      property: { select: { name: true, city: true } },
      invitedBy: { select: { name: true } },
    },
  });

  if (!invitation) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation introuvable</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ce lien d'invitation n'existe pas ou a expiré.
        </p>
        <Link href="/dashboard" className={btnSecondary}>Retour au tableau de bord</Link>
      </PageShell>
    );
  }

  if (invitation.acceptedAt) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation déjà utilisée</h1>
        <p className="text-sm text-gray-500 mb-6">Cette invitation a déjà été acceptée.</p>
        <Link href={`/properties/${invitation.propertyId}/team`} className={btnPrimary}>
          Voir l'équipe
        </Link>
      </PageShell>
    );
  }

  if (invitation.expiresAt < new Date()) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation expirée</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ce lien d'invitation a expiré. Demandez un nouveau lien au propriétaire du bien.
        </p>
        <Link href="/dashboard" className={btnSecondary}>Retour au tableau de bord</Link>
      </PageShell>
    );
  }

  if (invitation.email !== session.user.email) {
    return (
      <PageShell>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation non destinée à ce compte</h1>
        <p className="text-sm text-gray-500 mb-6">
          Cette invitation est destinée à <strong>{invitation.email}</strong>.
          Vous êtes connecté avec <strong>{session.user.email}</strong>.
        </p>
        <Link href="/dashboard" className={btnSecondary}>Retour au tableau de bord</Link>
      </PageShell>
    );
  }

  const roleLabel = invitation.role === "MANAGER" ? "Manager" : "Lecteur";
  const propertyLabel = invitation.property.city
    ? `${invitation.property.name} · ${invitation.property.city}`
    : invitation.property.name;

  async function handleAccept() {
    "use server";
    const result = await acceptInvitation(token);
    if ("propertyId" in result && result.propertyId) {
      redirect(`/properties/${result.propertyId}`);
    }
    redirect("/dashboard");
  }

  return (
    <PageShell>
      <div className="text-4xl mb-4">🏠</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation à rejoindre</h1>
      <p className="text-lg font-medium text-gray-800 mb-1">{propertyLabel}</p>
      <p className="text-sm text-gray-500 mb-1">
        Invité par <strong>{invitation.invitedBy.name ?? "un propriétaire"}</strong>
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Rôle : <span className="font-medium text-gray-700">{roleLabel}</span>
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <form action={handleAccept}>
          <button type="submit" className={btnPrimary}>
            Accepter l'invitation
          </button>
        </form>
        <Link href="/dashboard" className={btnSecondary}>
          Refuser
        </Link>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        {children}
      </div>
    </div>
  );
}

const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors";
const btnSecondary =
  "inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors";
