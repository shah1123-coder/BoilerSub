import { NextResponse } from "next/server";

type Suggestion = {
  id: string;
  text: string;
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
};

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function dedupe(items: Suggestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchGoogleSuggestions(query: string): Promise<Suggestion[]> {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ["us"],
      languageCode: "en",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GoogleAutocompleteResponse;
  return dedupe(
    (payload.suggestions ?? [])
      .map((item) => {
        const text = normalize(item.placePrediction?.text?.text ?? "");
        const placeId = normalize(item.placePrediction?.placeId ?? "");
        return {
          id: placeId || text,
          text,
        };
      })
      .filter((item) => Boolean(item.id) && Boolean(item.text)),
  ).slice(0, 8);
}

async function fetchNominatimSuggestions(query: string): Promise<Suggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "us");

  const response = await fetch(url.toString(), {
    headers: {
      // Required by Nominatim usage policy.
      "User-Agent": "BoilerSub/1.0 (address autocomplete)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as Array<{ place_id?: number | string; display_name?: string }>;
  return dedupe(
    payload
      .map((item) => {
        const text = normalize(item.display_name ?? "");
        const id = normalize(String(item.place_id ?? ""));
        return { id: id || text, text };
      })
      .filter((item) => Boolean(item.id) && Boolean(item.text)),
  ).slice(0, 8);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalize(url.searchParams.get("q") ?? "");
  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] as Suggestion[] });
  }

  try {
    const google = await fetchGoogleSuggestions(query);
    if (google.length > 0) {
      return NextResponse.json({ suggestions: google, source: "google" });
    }
  } catch {
    // Fall through to open fallback provider.
  }

  try {
    const fallback = await fetchNominatimSuggestions(query);
    return NextResponse.json({ suggestions: fallback, source: "nominatim" });
  } catch {
    return NextResponse.json({ suggestions: [] as Suggestion[] });
  }
}
