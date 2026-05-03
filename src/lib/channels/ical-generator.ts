export type ICalExportEvent = {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  description?: string;
};

export function generateICalFeed(
  calendarName: string,
  events: ICalExportEvent[]
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PMS//Property Manager//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcal(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTART:${formatUtc(event.dtstart)}`,
      `DTEND:${formatUtc(event.dtend)}`,
      `SUMMARY:${escapeIcal(event.summary)}`,
      `DTSTAMP:${formatUtc(new Date())}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcal(event.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Fold lines > 75 chars per RFC 5545
  return lines.map(fold).join("\r\n") + "\r\n";
}

function formatUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}
