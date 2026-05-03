"use client";

import { useActionState } from "react";
import { createProperty, updateProperty } from "@/actions/property";
import { useRouter } from "next/navigation";
import type { PropertyModel } from "@/generated/prisma/models";
import type { ImportedProperty } from "@/lib/property-importer";

type Props = {
  property?: PropertyModel;
  initialValues?: ImportedProperty;
};

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Appartement" },
  { value: "HOUSE", label: "Maison" },
  { value: "VILLA", label: "Villa" },
  { value: "ROOM", label: "Chambre" },
  { value: "OTHER", label: "Autre" },
];

const TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Bangkok",
  "Asia/Dubai",
  "UTC",
];

export function PropertyForm({ property, initialValues }: Props) {
  const router = useRouter();
  const isEdit = !!property;
  // Merge: DB property > imported values > empty
  const v = (key: keyof ImportedProperty) => (property as Record<string, unknown> | undefined)?.[key] ?? initialValues?.[key];

  async function action(prevState: unknown, formData: FormData) {
    const result = isEdit
      ? await updateProperty(property!.id, formData)
      : await createProperty(formData);

    if ("error" in result) return result;

    router.push(`/properties/${result.propertyId}`);
    return result;
  }

  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-8">
      {state && "error" in state && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Informations de base */}
      <Section title="Informations générales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom du bien *" required>
            <input
              name="name"
              type="text"
              required
              defaultValue={v("name") as string ?? ""}
              className={inputClass}
              placeholder="Ex: Appartement Montmartre"
            />
          </Field>

          <Field label="Type de bien">
            <select name="type" defaultValue={(v("type") as string) ?? "APARTMENT"} className={inputClass}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Statut">
            <select name="status" defaultValue={(property?.status) ?? "ACTIVE"} className={inputClass}>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </Field>

          <Field label="Fuseau horaire">
            <select name="timezone" defaultValue={(property?.timezone) ?? "Europe/Paris"} className={inputClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Localisation */}
      <Section title="Localisation">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Adresse">
              <input
                name="address"
                type="text"
                defaultValue={(v("address") as string) ?? ""}
                className={inputClass}
                placeholder="10 rue de la Paix"
              />
            </Field>
          </div>
          <Field label="Ville">
            <input
              name="city"
              type="text"
              defaultValue={(v("city") as string) ?? ""}
              className={inputClass}
              placeholder="Paris"
            />
          </Field>
          <Field label="Pays">
            <input
              name="country"
              type="text"
              defaultValue={(v("country") as string) ?? ""}
              className={inputClass}
              placeholder="France"
            />
          </Field>
        </div>
      </Section>

      {/* Capacité */}
      <Section title="Capacité">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Voyageurs max">
            <input
              name="maxGuests"
              type="number"
              min={1}
              max={50}
              defaultValue={(v("maxGuests") as number) ?? 2}
              className={inputClass}
            />
          </Field>
          <Field label="Chambres">
            <input
              name="bedrooms"
              type="number"
              min={0}
              max={50}
              defaultValue={(v("bedrooms") as number) ?? 1}
              className={inputClass}
            />
          </Field>
          <Field label="Lits">
            <input
              name="beds"
              type="number"
              min={1}
              max={100}
              defaultValue={(v("beds") as number) ?? 1}
              className={inputClass}
            />
          </Field>
          <Field label="Salles de bain">
            <input
              name="bathrooms"
              type="number"
              min={0}
              max={20}
              defaultValue={(v("bathrooms") as number) ?? 1}
              className={inputClass}
            />
          </Field>
          <Field label="Surface (m²)">
            <input
              name="areaSqm"
              type="number"
              min={1}
              step={0.5}
              defaultValue={(v("areaSqm") as number) ?? ""}
              className={inputClass}
              placeholder="45"
            />
          </Field>
        </div>
      </Section>

      {/* Descriptions */}
      <Section title="Description">
        <div className="space-y-4">
          <Field label="Description (français)">
            <textarea
              name="descriptionFr"
              rows={4}
              defaultValue={(v("descriptionFr") as string) ?? ""}
              className={inputClass}
              placeholder="Décrivez votre bien en français..."
            />
          </Field>
          <Field label="Description (anglais)">
            <textarea
              name="descriptionEn"
              rows={4}
              defaultValue={(v("descriptionEn") as string) ?? ""}
              className={inputClass}
              placeholder="Describe your property in English..."
            />
          </Field>
        </div>
      </Section>

      {/* Commission conciergerie */}
      <Section title="Commission conciergerie">
        <div className="rounded-xl p-4 mb-4" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <p className="text-xs" style={{ color: "#92400e" }}>
            <strong>Taux de commission</strong> — Ce pourcentage représente votre part sur chaque réservation.
            Le propriétaire reçoit le reste. Laissez vide pour utiliser le taux par défaut défini dans les paramètres.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Taux de commission (%)">
            <div className="relative">
              <input
                name="commissionRate"
                type="number"
                min={0}
                max={100}
                step={0.5}
                defaultValue={property?.commissionRate != null ? String(Number(property.commissionRate) * 100) : ""}
                className={inputClass + " pr-8"}
                placeholder="15 (défaut)"
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                style={{ color: "#9ca3af" }}
              >
                %
              </span>
            </div>
          </Field>
          <div className="flex flex-col justify-end">
            <p className="text-xs" style={{ color: "#6b7280" }}>
              Ex. : réservation 1 000 € avec 20% → <strong>200 € pour vous</strong>, 800 € pour le propriétaire.
            </p>
          </div>
        </div>
      </Section>

      {/* Règles maison */}
      <Section title="Règles de la maison">
        <div className="space-y-4">
          <Field label="Règles (français)">
            <textarea
              name="houseRulesFr"
              rows={3}
              defaultValue={property?.houseRulesFr ?? ""}
              className={inputClass}
              placeholder="Pas de fête, animaux acceptés..."
            />
          </Field>
          <Field label="Règles (anglais)">
            <textarea
              name="houseRulesEn"
              rows={3}
              defaultValue={property?.houseRulesEn ?? ""}
              className={inputClass}
              placeholder="No parties, pets welcome..."
            />
          </Field>
        </div>
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer le bien"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
