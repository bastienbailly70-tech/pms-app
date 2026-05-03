export type ICalEvent = {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  status: "confirmed" | "cancelled" | "tentative";
  description?: string;
};

/**
 * Minimal iCal parser for rental OTA exports.
 * Handles: UTC timestamps, VALUE=DATE, TZID parameters, line unfolding.
 */
export function parseICalFeed(raw: string): ICalEvent[] {
  const lines = unfold(raw);
  const events: ICalEvent[] = [];

  let inEvent = false;
  let current: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      inEvent = false;
      const event = buildEvent(current);
      if (event) events.push(event);
      continue;
    }
    if (!inEvent) continue;

    // Property: NAME;PARAM=value:content  or  NAME:content
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const propFull = trimmed.slice(0, colonIdx).toUpperCase();
    const value = trimmed.slice(colonIdx + 1);

    // Strip parameters — keep the base name, but preserve TZID for date parsing
    const semicolonIdx = propFull.indexOf(";");
    const propName = semicolonIdx === -1 ? propFull : propFull.slice(0, semicolonIdx);
    const params = semicolonIdx === -1 ? "" : propFull.slice(semicolonIdx + 1);

    // For DTSTART / DTEND, store params too so we can parse correctly
    if (propName === "DTSTART" || propName === "DTEND") {
      current[propName] = value;
      current[`${propName}_PARAMS`] = params;
    } else {
      current[propName] = value;
    }
  }

  return events;
}

function buildEvent(raw: Record<string, string>): ICalEvent | null {
  const uid = raw["UID"];
  if (!uid) return null;

  const dtstart = parseDateTime(raw["DTSTART"] ?? "", raw["DTSTART_PARAMS"] ?? "");
  const dtend = parseDateTime(raw["DTEND"] ?? "", raw["DTEND_PARAMS"] ?? "");
  if (!dtstart || !dtend) return null;

  const statusRaw = (raw["STATUS"] ?? "CONFIRMED").toUpperCase();
  const status: ICalEvent["status"] =
    statusRaw === "CANCELLED" ? "cancelled" : statusRaw === "TENTATIVE" ? "tentative" : "confirmed";

  return {
    uid,
    summary: unescapeIcal(raw["SUMMARY"] ?? ""),
    dtstart,
    dtend,
    status,
    description: raw["DESCRIPTION"] ? unescapeIcal(raw["DESCRIPTION"]) : undefined,
  };
}

export function parseDateTime(value: string, params: string): Date | null {
  if (!value) return null;

  const isDateOnly =
    params.includes("VALUE=DATE") || /^\d{8}$/.test(value);

  if (isDateOnly) {
    // YYYYMMDD — interpret as midnight UTC
    const y = parseInt(value.slice(0, 4));
    const m = parseInt(value.slice(4, 6)) - 1;
    const d = parseInt(value.slice(6, 8));
    if (isNaN(y + m + d)) return null;
    return new Date(Date.UTC(y, m, d));
  }

  // YYYYMMDDTHHMMSSZ (UTC) or YYYYMMDDTHHMMSS (floating / with TZID)
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/
  );
  if (!match) return null;

  const [, Y, M, D, h, min, s, utc] = match;
  const year = parseInt(Y!), month = parseInt(M!) - 1, day = parseInt(D!);
  const hour = parseInt(h!), minute = parseInt(min!), second = parseInt(s!);

  if (utc === "Z") {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // TZID present — for our purposes, treat as UTC (OTA feeds use UTC or local near-UTC)
  // A full TZID implementation would use a tz database; this is acceptable for MVP.
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function unfold(raw: string): string[] {
  // RFC 5545 §3.1: fold = CRLF + (SPACE or HTAB)
  return raw
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter(Boolean);
}

function unescapeIcal(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}
