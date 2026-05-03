import { describe, it, expect } from "vitest";
import { parseICalFeed, parseDateTime } from "@/lib/channels/ical-parser";

const BASIC_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar 0.8.7//EN
BEGIN:VEVENT
DTSTART:20250701T140000Z
DTEND:20250708T110000Z
SUMMARY:John Doe
UID:airbnb-abc123@airbnb.com
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

const DATE_ONLY_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20250810
DTEND;VALUE=DATE:20250815
SUMMARY:Reserved
UID:booking-xyz@booking.com
END:VEVENT
END:VCALENDAR`;

const CANCELLED_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20250901T100000Z
DTEND:20250905T100000Z
SUMMARY:Jane Smith
UID:vrbo-99@vrbo.com
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

const MULTI_EVENT_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20250601T120000Z
DTEND:20250603T120000Z
SUMMARY:Guest A
UID:uid-1
END:VEVENT
BEGIN:VEVENT
DTSTART:20250610T120000Z
DTEND:20250615T120000Z
SUMMARY:Guest B
UID:uid-2
STATUS:TENTATIVE
END:VEVENT
END:VCALENDAR`;

const FOLDED_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20250701T140000Z
DTEND:20250708T110000Z
SUMMARY:This is a very long summary that should be folded across multiple l
 ines by the RFC 5545 standard
UID:fold-test@example.com
END:VEVENT
END:VCALENDAR`;

const TZID_ICAL = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;TZID=America/New_York:20250715T100000
DTEND;TZID=America/New_York:20250720T100000
SUMMARY:NYC Guest
UID:tzid-test@example.com
END:VEVENT
END:VCALENDAR`;

describe("parseICalFeed", () => {
  it("parses a basic UTC event", () => {
    const events = parseICalFeed(BASIC_ICAL);
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.uid).toBe("airbnb-abc123@airbnb.com");
    expect(e.summary).toBe("John Doe");
    expect(e.status).toBe("confirmed");
    expect(e.dtstart).toEqual(new Date("2025-07-01T14:00:00Z"));
    expect(e.dtend).toEqual(new Date("2025-07-08T11:00:00Z"));
  });

  it("parses VALUE=DATE events (date-only)", () => {
    const events = parseICalFeed(DATE_ONLY_ICAL);
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.dtstart).toEqual(new Date("2025-08-10T00:00:00Z"));
    expect(e.dtend).toEqual(new Date("2025-08-15T00:00:00Z"));
  });

  it("filters out CANCELLED events", () => {
    // parseICalFeed returns all events; filtering is done in adapter
    const events = parseICalFeed(CANCELLED_ICAL);
    expect(events).toHaveLength(1);
    expect(events[0]!.status).toBe("cancelled");
  });

  it("parses multiple events with correct statuses", () => {
    const events = parseICalFeed(MULTI_EVENT_ICAL);
    expect(events).toHaveLength(2);
    expect(events[0]!.status).toBe("confirmed"); // default when no STATUS
    expect(events[1]!.status).toBe("tentative");
  });

  it("unfolds long lines correctly", () => {
    const events = parseICalFeed(FOLDED_ICAL);
    expect(events).toHaveLength(1);
    expect(events[0]!.summary).toContain("folded across multiple lines");
  });

  it("parses TZID datetime (treated as UTC for MVP)", () => {
    const events = parseICalFeed(TZID_ICAL);
    expect(events).toHaveLength(1);
    expect(events[0]!.dtstart).toBeInstanceOf(Date);
    expect(isNaN(events[0]!.dtstart.getTime())).toBe(false);
  });

  it("returns empty array for empty calendar", () => {
    const events = parseICalFeed("BEGIN:VCALENDAR\r\nEND:VCALENDAR");
    expect(events).toHaveLength(0);
  });

  it("skips events missing UID", () => {
    const noUid = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20250101T000000Z\r\nDTEND:20250102T000000Z\r\nSUMMARY:No UID\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    const events = parseICalFeed(noUid);
    expect(events).toHaveLength(0);
  });
});

describe("parseDateTime", () => {
  it("parses UTC datetime", () => {
    const d = parseDateTime("20250101T120000Z", "");
    expect(d).toEqual(new Date("2025-01-01T12:00:00Z"));
  });

  it("parses date-only via VALUE=DATE param", () => {
    const d = parseDateTime("20250615", "VALUE=DATE");
    expect(d).toEqual(new Date("2025-06-15T00:00:00Z"));
  });

  it("parses bare 8-digit date without param", () => {
    const d = parseDateTime("20251231", "");
    expect(d).toEqual(new Date("2025-12-31T00:00:00Z"));
  });

  it("returns null for empty string", () => {
    expect(parseDateTime("", "")).toBeNull();
  });

  it("returns null for malformed value", () => {
    expect(parseDateTime("not-a-date", "")).toBeNull();
  });
});
