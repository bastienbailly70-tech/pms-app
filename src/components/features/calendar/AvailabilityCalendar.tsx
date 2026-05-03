"use client";

import { useState, useCallback, useEffect } from "react";
import { createBlock, deleteBlock } from "@/actions/availability";

export type SerializedBlock = {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  isManual: boolean;
  createdAt: string;
};

export type SerializedBooking = {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  source: string | null;
};

type Props = {
  propertyId: string;
  blocks: SerializedBlock[];
  bookings: SerializedBooking[];
};

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type SelectionState =
  | { step: "idle" }
  | { step: "selecting"; start: string }
  | { step: "confirm"; start: string; end: string };

export function AvailabilityCalendar({ propertyId, blocks: initialBlocks, bookings }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [blocks, setBlocks] = useState<SerializedBlock[]>(initialBlocks);
  const [selection, setSelection] = useState<SelectionState>({ step: "idle" });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prevMonth();
      if (e.key === "ArrowRight") nextMonth();
      if (e.key === "Escape") setSelection({ step: "idle" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid (Mon-Sun)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first: getDay() returns 0=Sun, map to 0=Mon
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = startOffset + lastDay.getDate();
  const weeks = Math.ceil(totalCells / 7);

  function dateStr(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  function cellDate(cell: number): Date | null {
    const day = cell - startOffset + 1;
    if (day < 1 || day > lastDay.getDate()) return null;
    return new Date(year, month, day);
  }

  function getBlockForDate(ds: string): SerializedBlock | undefined {
    return blocks.find(b => {
      const start = dateStr(new Date(b.startDate));
      const end = dateStr(new Date(b.endDate));
      return ds >= start && ds <= end;
    });
  }

  function getBookingForDate(ds: string): SerializedBooking | undefined {
    return bookings.find(b => {
      const checkIn = dateStr(new Date(b.checkIn));
      const checkOut = dateStr(new Date(b.checkOut));
      return ds >= checkIn && ds < checkOut;
    });
  }

  function isInSelection(ds: string): boolean {
    if (selection.step === "selecting") {
      const [a, b] = [selection.start, ds].sort();
      return ds >= a && ds <= b;
    }
    if (selection.step === "confirm") {
      const [a, b] = [selection.start, selection.end].sort();
      return ds >= a && ds <= b;
    }
    return false;
  }

  const handleDayClick = useCallback((ds: string) => {
    const block = getBlockForDate(ds);
    if (block && selection.step === "idle") {
      if (confirm(`Supprimer ce blocage${block.reason ? ` (${block.reason})` : ""} ?`)) {
        setSaving(true);
        deleteBlock(block.id).then(result => {
          setSaving(false);
          if ("error" in result) setError(result.error);
          else setBlocks(prev => prev.filter(b => b.id !== block.id));
        });
      }
      return;
    }

    if (getBookingForDate(ds)) return; // can't block booked date

    if (selection.step === "idle") {
      setSelection({ step: "selecting", start: ds });
    } else if (selection.step === "selecting") {
      const [start, end] = [selection.start, ds].sort();
      setSelection({ step: "confirm", start, end });
      setReason("");
    } else {
      setSelection({ step: "idle" });
    }
  }, [blocks, selection]);

  async function handleConfirmBlock() {
    if (selection.step !== "confirm") return;
    setSaving(true);
    setError(null);

    const result = await createBlock({
      propertyId,
      startDate: selection.start,
      endDate: selection.end,
      reason: reason || undefined,
    });

    setSaving(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setBlocks(prev => [...prev, {
        id: Math.random().toString(),
        propertyId,
        startDate: selection.start,
        endDate: selection.end,
        reason: reason || null,
        isManual: true,
        createdAt: new Date().toISOString(),
      } as SerializedBlock]);
      setSelection({ step: "idle" });
      setReason("");
    }
  }

  const cells = Array.from({ length: weeks * 7 }, (_, i) => cellDate(i));

  return (
    <div>
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Mois précédent (←)"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Mois suivant (→)"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {cells.map((date, i) => {
          if (!date) {
            return <div key={i} className="bg-gray-50 aspect-square" />;
          }

          const ds = dateStr(date);
          const block = getBlockForDate(ds);
          const booking = getBookingForDate(ds);
          const inSel = isInSelection(ds);
          const isToday = ds === dateStr(today);
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          let bg = "bg-white hover:bg-blue-50";
          let textColor = isPast ? "text-gray-300" : "text-gray-900";
          let cursor = "cursor-pointer";

          if (block) {
            bg = "bg-orange-50 hover:bg-orange-100";
            textColor = "text-orange-700";
          } else if (booking) {
            bg = "bg-blue-50";
            textColor = "text-blue-700";
            cursor = "cursor-default";
          } else if (isPast) {
            bg = "bg-gray-50";
            cursor = "cursor-default";
          }

          if (inSel) {
            bg = "bg-blue-200";
            textColor = "text-blue-900";
          }

          return (
            <div
              key={ds}
              className={`${bg} ${cursor} aspect-square flex flex-col items-center justify-center relative transition-colors`}
              onClick={() => !isPast && handleDayClick(ds)}
            >
              <span
                className={`text-xs font-medium leading-none ${textColor} ${
                  isToday
                    ? "w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white"
                    : ""
                }`}
              >
                {date.getDate()}
              </span>
              {booking && (
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
              {block && !booking && (
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white border border-gray-200" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" /> Réservé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-200" /> Bloqué
        </span>
        <span className="flex items-center gap-1.5 ml-auto text-gray-400">
          ← → pour changer de mois · Clic pour bloquer
        </span>
      </div>

      {/* Selection panel */}
      {(selection.step === "selecting" || selection.step === "confirm") && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          {selection.step === "selecting" ? (
            <p className="text-sm text-blue-700">
              Début sélectionné : <strong>{formatDate(selection.start)}</strong>. Cliquez sur une date de fin.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-blue-900">
                Bloquer du <strong>{formatDate(selection.start)}</strong> au{" "}
                <strong>{formatDate(selection.end)}</strong>
              </p>
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  Motif (optionnel)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Maintenance, usage personnel..."
                  className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  maxLength={200}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmBlock}
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "..." : "Bloquer ces dates"}
                </button>
                <button
                  onClick={() => setSelection({ step: "idle" })}
                  className="px-4 py-1.5 text-sm text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active blocks list */}
      {blocks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Blocages actifs</h3>
          <div className="space-y-1.5">
            {[...blocks]
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .map(block => (
                <div
                  key={block.id}
                  className="flex items-center justify-between px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-sm"
                >
                  <span className="text-orange-800">
                    {formatDate(dateStr(new Date(block.startDate)))}
                    {" → "}
                    {formatDate(dateStr(new Date(block.endDate)))}
                    {block.reason && (
                      <span className="ml-2 text-orange-600">— {block.reason}</span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm("Supprimer ce blocage ?")) {
                        deleteBlock(block.id).then(r => {
                          if ("success" in r)
                            setBlocks(prev => prev.filter(b => b.id !== block.id));
                        });
                      }
                    }}
                    className="text-orange-400 hover:text-red-600 transition-colors ml-3"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  return `${d} ${["jan", "fév", "mar", "avr", "mai", "jui", "jul", "aoû", "sep", "oct", "nov", "déc"][m - 1]} ${y}`;
}
