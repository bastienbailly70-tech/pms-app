export type ImportedProperty = {
  name?: string;
  type?: "APARTMENT" | "HOUSE" | "VILLA" | "ROOM" | "OTHER";
  address?: string;
  city?: string;
  country?: string;
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  areaSqm?: number;
  descriptionFr?: string;
  descriptionEn?: string;
  photoUrls?: string[];
  sourceUrl?: string;
  sourcePlatform?: string;
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function detectPlatform(url: string): string {
  if (/airbnb\.(fr|com|co\.uk|de|es|it)/i.test(url)) return "airbnb";
  if (/booking\.com/i.test(url)) return "booking";
  if (/abritel\.fr|vrbo\.com/i.test(url)) return "vrbo";
  if (/leboncoin\.fr/i.test(url)) return "leboncoin";
  return "generic";
}

function guessType(raw: string): ImportedProperty["type"] {
  const s = raw.toLowerCase();
  if (s.includes("villa")) return "VILLA";
  if (s.includes("appartement") || s.includes("apartment") || s.includes("flat") || s.includes("studio")) return "APARTMENT";
  if (s.includes("maison") || s.includes("house") || s.includes("chalet") || s.includes("cottage")) return "HOUSE";
  if (s.includes("chambre") || s.includes("room") || s.includes("bedroom")) return "ROOM";
  return "OTHER";
}

// ─── Airbnb ──────────────────────────────────────────────────────────────────
function parseAirbnb(html: string, url: string): ImportedProperty {
  const result: ImportedProperty = { sourceUrl: url, sourcePlatform: "Airbnb" };

  // __NEXT_DATA__ contains the full listing JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);

      // Navigate the nested structure (Airbnb changes this frequently)
      const pdp =
        nextData?.props?.pageProps?.listing ||
        nextData?.props?.pageProps?.listingData?.listing ||
        findDeepKey(nextData, "pdpListingDetail") ||
        findDeepKey(nextData, "listing");

      if (pdp) {
        result.name = pdp.name || pdp.localizedName || pdp.publicAddress;
        if (pdp.roomType || pdp.roomTypeCategory) {
          result.type = guessType(pdp.roomType || pdp.roomTypeCategory || "");
        }
        result.city  = pdp.city || pdp.publicAddress;
        result.country = pdp.countryCode || pdp.country;

        const details = pdp.personCapacity || pdp.guestControls;
        if (typeof pdp.personCapacity === "number") result.maxGuests = pdp.personCapacity;

        const sleeping = pdp.bedrooms || pdp.bedroomLabel;
        if (typeof pdp.bedrooms === "number") result.bedrooms = pdp.bedrooms;
        if (typeof pdp.beds === "number") result.beds = pdp.beds;
        if (typeof pdp.bathrooms === "number") result.bathrooms = Math.floor(pdp.bathrooms);

        result.descriptionEn = pdp.description || pdp.descriptionItems?.map((d: { content?: string }) => d.content).join("\n\n");

        // Photos
        const photos: string[] = [];
        const photoSources = pdp.photos || pdp.contextualPictures || pdp.listingPhotos || [];
        for (const p of photoSources.slice(0, 10)) {
          const url = p.large || p.url || p.picture;
          if (url) photos.push(url);
        }
        if (photos.length) result.photoUrls = photos;
      }
    } catch {
      // Ignore parse errors, fall through to generic
    }
  }

  // Fallback to generic if name not found
  if (!result.name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) result.name = titleMatch[1].replace(/ - Airbnb$/, "").trim();
  }

  return result;
}

function findDeepKey(obj: unknown, key: string, depth = 0): unknown {
  if (depth > 6 || !obj || typeof obj !== "object") return undefined;
  if (key in (obj as Record<string, unknown>)) return (obj as Record<string, unknown>)[key];
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const found = findDeepKey(v, key, depth + 1);
    if (found) return found;
  }
  return undefined;
}

// ─── Booking.com ─────────────────────────────────────────────────────────────
function parseBooking(html: string, url: string): ImportedProperty {
  const result: ImportedProperty = { sourceUrl: url, sourcePlatform: "Booking.com" };

  // JSON-LD
  const jsonLd = extractJsonLd(html);
  for (const item of jsonLd) {
    const t = item["@type"] as string;
    if (t === "LodgingBusiness" || t === "Hotel" || t === "Apartment") {
      const addr = item.address as Record<string, string> | undefined;
      result.name       = item.name as string | undefined;
      result.address    = addr?.streetAddress;
      result.city       = addr?.addressLocality;
      result.country    = addr?.addressCountry;
      result.descriptionEn = item.description as string | undefined;
      if (item.numberOfRooms) result.bedrooms = Number(item.numberOfRooms);
      const photos = ((item.image as unknown[]) || []).slice(0, 8);
      if (photos.length) result.photoUrls = photos.map((p) => typeof p === "string" ? p : (p as Record<string,string>).url ?? "").filter(Boolean);
    }
  }

  // meta fallback
  if (!result.name) result.name = extractMeta(html, "og:title")?.replace(/ - Booking\.com$/, "");
  if (!result.descriptionEn) result.descriptionEn = extractMeta(html, "og:description");
  if (!result.photoUrls?.length) {
    const img = extractMeta(html, "og:image");
    if (img) result.photoUrls = [img];
  }

  // Type from h1 / title
  const title = result.name || extractTitle(html);
  if (title) result.type = guessType(title);

  // Capacity from page text
  const guestsM = html.match(/(\d+)\s*(?:guests?|voyageurs?|personnes?)/i);
  if (guestsM) result.maxGuests = Number(guestsM[1]);
  const bedsM = html.match(/(\d+)\s*(?:beds?|lits?)/i);
  if (bedsM) result.beds = Number(bedsM[1]);

  return result;
}

// ─── Generic ─────────────────────────────────────────────────────────────────
function parseGeneric(html: string, url: string): ImportedProperty {
  const result: ImportedProperty = { sourceUrl: url, sourcePlatform: "Import" };

  // JSON-LD first
  const jsonLd = extractJsonLd(html);
  const knownTypes = ["LodgingBusiness","Hotel","Apartment","House","Accommodation","Product","RentalCar","Place"];
  for (const item of jsonLd) {
    if (knownTypes.includes(item["@type"] as string)) {
      const addr = item.address as Record<string, string> | undefined;
      result.name       = result.name || (item.name as string);
      result.address    = result.address || addr?.streetAddress;
      result.city       = result.city || addr?.addressLocality;
      result.country    = result.country || addr?.addressCountry;
      result.descriptionEn = result.descriptionEn || (item.description as string);
    }
  }

  // Open Graph
  result.name             = result.name || extractMeta(html, "og:title") || extractTitle(html);
  result.descriptionEn    = result.descriptionEn || extractMeta(html, "og:description");
  const img = extractMeta(html, "og:image");
  if (img && !result.photoUrls?.length) result.photoUrls = [img];

  // type from name
  if (result.name) result.type = guessType(result.name);

  // Capacity patterns (works on many platforms)
  const guestsM = html.match(/(\d+)\s*(?:guests?|voyageurs?|personnes?)/i);
  if (guestsM) result.maxGuests = Number(guestsM[1]);
  const bedroomsM = html.match(/(\d+)\s*(?:bedroom|chambre|pièce)/i);
  if (bedroomsM) result.bedrooms = Number(bedroomsM[1]);
  const bedsM = html.match(/(\d+)\s*(?:bed(?!room)|lit)/i);
  if (bedsM) result.beds = Number(bedsM[1]);
  const bathsM = html.match(/(\d+)\s*(?:bathroom|salle de bain|douche)/i);
  if (bathsM) result.bathrooms = Number(bathsM[1]);

  return result;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch { /* ignore */ }
  }
  return results;
}

function extractMeta(html: string, property: string): string | undefined {
  const match = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")
  ) || html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i")
  );
  return match?.[1];
}

function extractTitle(html: string): string | undefined {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function importFromUrl(rawUrl: string): Promise<ImportedProperty> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL invalide.");
  }

  const platform = detectPlatform(url.toString());

  const res = await fetch(url.toString(), {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    // 15s timeout via AbortSignal
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger la page (HTTP ${res.status}).`);
  }

  const html = await res.text();

  let result: ImportedProperty;
  if (platform === "airbnb") result = parseAirbnb(html, url.toString());
  else if (platform === "booking") result = parseBooking(html, url.toString());
  else result = parseGeneric(html, url.toString());

  // Clean up strings
  if (result.name) result.name = result.name.replace(/\s+/g, " ").trim().slice(0, 150);
  if (result.descriptionEn) result.descriptionEn = result.descriptionEn.replace(/\s+/g, " ").trim().slice(0, 3000);
  if (result.city) result.city = result.city.trim();
  if (result.country) result.country = result.country.trim();

  return result;
}
