"use client";

import { useState, useTransition } from "react";
import { disconnectPlatform, triggerManualSync } from "@/actions/platforms";
import type { PlatformConnectionModel, PlatformModel } from "@/generated/prisma/models";

type Props = {
  connection: PlatformConnectionModel & { platform: PlatformModel };
  exportBaseUrl: string;
};

const STATUS_CONFIG = {
  ok: { label: "OK", color: "text-green-600 bg-green-50 border-green-200" },
  conflict: { label: "Conflit", color: "text-amber-600 bg-amber-50 border-amber-200" },
  error: { label: "Erreur", color: "text-red-600 bg-red-50 border-red-200" },
  null: { label: "Jamais sync.", color: "text-gray-500 bg-gray-50 border-gray-200" },
};

export function PlatformConnectionCard({ connection, exportBaseUrl }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const statusKey = (connection.lastSyncStatus as keyof typeof STATUS_CONFIG) ?? "null";
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG["null"];

  const exportUrl = `${exportBaseUrl}/api/ical/${connection.icalExportToken}`;

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    const result = await triggerManualSync(connection.id);
    setSyncing(false);
    if ("error" in result) {
      setSyncResult(`Erreur : ${result.error}`);
    } else if ("result" in result && result.result) {
      const r = result.result as { created: number; skipped: number; conflicts: number };
      setSyncResult(`✓ ${r.created} importées, ${r.skipped} ignorées${r.conflicts > 0 ? `, ${r.conflicts} conflits` : ""}`);
    }
  }

  function handleDisconnect() {
    if (!confirm(`Déconnecter ${connection.platform.name} ?`)) return;
    startTransition(() => { disconnectPlatform(connection.id); });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-medium text-gray-900">{connection.platform.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${status.color}`}>
              {status.label}
            </span>
            {connection.lastSyncAt && (
              <span className="text-xs text-gray-400">
                {new Date(connection.lastSyncAt).toLocaleString("fr-FR", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {connection.icalImportUrl && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              {syncing ? "Sync…" : "↻ Sync"}
            </button>
          )}
          <button
            onClick={handleDisconnect}
            disabled={pending}
            className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Déconnecter
          </button>
        </div>
      </div>

      {syncResult && (
        <p className="mb-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{syncResult}</p>
      )}

      {/* Import URL */}
      <div className="space-y-3">
        {connection.icalImportUrl && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">URL d'import (depuis {connection.platform.name})</p>
            <code className="block text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 truncate text-gray-600">
              {connection.icalImportUrl}
            </code>
          </div>
        )}

        {/* Export URL */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">URL d'export (à coller dans {connection.platform.name})</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1.5 truncate text-blue-700">
              {exportUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(exportUrl)}
              className="shrink-0 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Copier
            </button>
          </div>
        </div>
      </div>

      {/* Sync logs preview */}
    </div>
  );
}
