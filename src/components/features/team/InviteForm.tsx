"use client";

import { useState, useTransition } from "react";
import { inviteTeamMember } from "@/actions/team";

type Props = {
  propertyId: string;
};

export function InviteForm({ propertyId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInviteLink(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await inviteTeamMember(propertyId, formData);
      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("token" in result && result.token) {
        const link = `${window.location.origin}/invitations/${result.token}`;
        setInviteLink(link);
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="email@exemple.com"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="role"
          defaultValue="VIEWER"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="MANAGER">Manager</option>
          <option value="VIEWER">Lecteur</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {pending ? "…" : "Inviter"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {inviteLink && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-800 mb-1">Invitation créée — partagez ce lien :</p>
            <p className="text-xs text-green-700 font-mono truncate">{inviteLink}</p>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs font-medium text-green-700 hover:text-green-900 shrink-0 px-2 py-1 border border-green-300 rounded"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
      )}

      <div className="text-xs text-gray-400 space-y-0.5">
        <p><strong>Manager</strong> : peut modifier les réservations, tarifs et disponibilités.</p>
        <p><strong>Lecteur</strong> : consultation uniquement.</p>
        <p>Le lien d'invitation est valide 7 jours.</p>
      </div>
    </div>
  );
}
