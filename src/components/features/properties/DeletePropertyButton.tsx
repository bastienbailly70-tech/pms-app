"use client";

import { deleteProperty } from "@/actions/property";
import { useTransition } from "react";

export function DeletePropertyButton({
  propertyId,
  propertyName,
}: {
  propertyId: string;
  propertyName: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `Supprimer "${propertyName}" ? Cette action est irréversible et supprimera toutes les données associées.`
      )
    )
      return;

    startTransition(() => {
      deleteProperty(propertyId);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {pending ? "Suppression..." : "Supprimer"}
    </button>
  );
}
