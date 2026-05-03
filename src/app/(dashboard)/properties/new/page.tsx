"use client";

import { useState } from "react";
import Link from "next/link";
import { PropertyForm } from "@/components/features/properties/PropertyForm";
import { ImportFromUrl } from "@/components/features/properties/ImportFromUrl";
import type { ImportedProperty } from "@/lib/property-importer";
import { IconChevronRight } from "@/components/ui/icons";

export default function NewPropertyPage() {
  const [imported, setImported] = useState<ImportedProperty | null>(null);

  return (
    <div className="px-8 py-7 max-w-3xl mx-auto animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-6">
        <Link
          href="/properties"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
        >
          Biens
        </Link>
        <IconChevronRight size={13} style={{ color: "var(--text-tertiary)" }} />
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Nouveau bien
        </span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-6" style={{ color: "var(--text-primary)" }}>
        Créer un bien
      </h1>

      {/* Import banner */}
      <ImportFromUrl onImport={data => setImported(data)} />

      {/* Form */}
      <div className="card p-6">
        <PropertyForm key={JSON.stringify(imported)} initialValues={imported ?? undefined} />
      </div>
    </div>
  );
}
