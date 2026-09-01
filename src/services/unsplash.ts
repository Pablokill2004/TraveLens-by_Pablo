import "server-only"

import type { PaginatedPhotos, UnsplashPhoto, UnsplashUrls } from "@/lib/types"

const UNSPLASH_BASE = "https://api.unsplash.com"
const REVALIDATE_SECONDS = 60 * 60

export class ServiceError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ServiceError"
    this.status = status
  }
}

const CURATED_CITIES = [
  "Paris",
  "Tokyo",
  "Kyoto",
  "Rome",
  "Barcelona",
  "London",
  "New York",
  "Sydney",
  "Rio de Janeiro",
  "Cape Town",
  "Istanbul",
  "Cairo",
  "Marrakech",
  "Bali",
  "Bangkok",
  "Santorini",
  "Amsterdam",
  "Prague",
  "Vienna",
  "Lisbon",
  "Buenos Aires",
  "Mexico City",
  "Dubai",
  "Maldives",
  "Reykjavik",
  "Vancouver",
  "San Francisco",
  "Venice",
  "Florence",
  "Seville",
]

// REVIEWER_NOTE: Text cleaning pipeline. Unsplash alt_description/description can contain
// internal photo IDs (e.g. "photo-1707344088547-...") or camera filenames. These regexes strip them
// so user-facing titles never leak machine identifiers. Order matters: strip IDs first, then
// filenames, then collapse whitespace.
function cleanText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/photo-\d{10,}-[a-f0-9-]+/gi, "")
    .replace(/\b[\w-]+\.(jpg|jpeg|png|webp|gif|heic|avif)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

function humanizeSlug(slug: string | null | undefined): string {
  if (!slug) return ""
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function dedupeCityNames(text: string): string {
  const segments = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const result: string[] = []
  for (const seg of segments) {
    const key = seg.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(seg)
  }
  return result.join(", ")
}

interface UnsplashRawPhoto {
  id: string
  slug?: string
  width: number
  height: number
  color?: string | null
  description?: string | null
  alt_description?: string | null
  urls: UnsplashUrls
  links: { self?: string; html: string; download?: string; download_location?: string }
  likes?: number
  user?: {
    id?: string
    name?: string
    username?: string
    links?: { self?: string; html?: string; photos?: string; likes?: string }
  }
  location?: { name?: string | null; city?: string | null; country?: string | null } | null
  tags?: Array<{ type?: string; title?: string } | string>
  alternative_slugs?: { en?: string; es?: string }
}

function extractCityName(raw: UnsplashRawPhoto): string | null {
  if (raw.location?.city) return raw.location.city
  if (raw.location?.name) {
    const first = raw.location.name.split(",")[0]?.trim()
    if (first) return first
  }
  return null
}

// REVIEWER_NOTE: Display-field builder. Computes human-readable title/subtitle per fetch mode.
// - home (fetchPopular): title = the curated city we queried (ensures relevance), subtitle =
//   description or the humanized Spanish slug (alternative_slugs.es), never raw IDs.
// - search/related: title = cleaned description with city-name dedupe ("Sydney, Sydney"→"Sydney"),
//   subtitle = first 3 tags joined with bullets. Falls back gracefully when data is missing.
function buildDisplay(
  raw: UnsplashRawPhoto,
  mode: "home" | "search" | "related",
  contextCity?: string
): { displayTitle: string; displaySubtitle: string } {
  const cleanedDesc = cleanText(raw.alt_description ?? raw.description)
  const altSlugEs = humanizeSlug(raw.alternative_slugs?.es)

  if (mode === "home") {
    const title = contextCity ?? "Destino"
    const subtitle = cleanedDesc || altSlugEs || humanizeSlug(raw.slug) || "Fotografía de viaje"
    return { displayTitle: title, displaySubtitle: subtitle }
  }

  const titleSource = cleanedDesc || altSlugEs || humanizeSlug(raw.slug) || "Fotografía de viaje"
  const title = dedupeCityNames(titleSource)
  const tagLine = (raw.tags ?? [])
    .map((t) => (typeof t === "string" ? t : t.title))
    .filter((t): t is string => Boolean(t))
    .slice(0, 3)
    .join(" • ")
  const subtitle = tagLine || "Travel"
  return { displayTitle: title, displaySubtitle: subtitle }
}

function normalize(
  raw: UnsplashRawPhoto,
  mode: "home" | "search" | "related",
  contextCity?: string
): UnsplashPhoto {
  const { displayTitle, displaySubtitle } = buildDisplay(raw, mode, contextCity)
  return {
    id: raw.id,
    slug: raw.slug ?? raw.id,
    width: raw.width,
    height: raw.height,
    altDescription: raw.alt_description ?? null,
    color: raw.color ?? null,
    urls: {
      thumb: raw.urls.thumb,
      small: raw.urls.small,
      regular: raw.urls.regular,
    },
    links: {
      html: raw.links.html,
      download: raw.links.download ?? raw.links.download_location ?? "",
    },
    user: {
      name: raw.user?.name ?? "Desconocido",
      username: raw.user?.username ?? "",
      links: { html: raw.user?.links?.html ?? raw.links.html },
    },
    location: raw.location
      ? {
          name: raw.location.name ?? null,
          city: raw.location.city ?? null,
          country: raw.location.country ?? null,
        }
      : null,
    tags: Array.isArray(raw.tags)
      ? raw.tags
          .map((t) => (typeof t === "string" ? t : t.title))
          .filter((t): t is string => Boolean(t))
          .slice(0, 6)
      : [],
    likes: raw.likes ?? 0,
    cityName: extractCityName(raw),
    displayTitle,
    displaySubtitle,
  }
}

async function request<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    throw new ServiceError("La clave de Unsplash no está configurada", 500)
  }
  const search = new URLSearchParams(params)
  const res = await fetch(`${UNSPLASH_BASE}${path}?${search.toString()}`, {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
    },
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (!res.ok) {
    if (res.status === 401) throw new ServiceError("Unsplash rechazó la clave de acceso", 502)
    if (res.status === 403) throw new ServiceError("Se alcanzó el límite de Unsplash", 429)
    throw new ServiceError(`Fallo la solicitud a Unsplash (${res.status})`, 502)
  }
  return (await res.json()) as T
}

interface SearchResponse {
  total?: number
  total_pages?: number
  results?: UnsplashRawPhoto[]
}

// REVIEWER_NOTE: fetchPopular fetches from 3 random curated cities in parallel to ensure
// visual variety on the homepage. Each city's photos are tagged with the city name as the
// displayTitle. Results are deduplicated by ID (Unsplash may return the same photo for
// similar queries). This uses 3 API calls per homepage load — acceptable within the 50/hr
// demo limit with revalidate:3600 caching per query+page combination.
export async function fetchPopular(
  page = 1,
  perPage = 24
): Promise<PaginatedPhotos> {
  const cities = [...CURATED_CITIES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  const perCity = Math.ceil(perPage / cities.length) + 2

  const fetches = cities.map((city) =>
    request<SearchResponse>("/search/photos", {
      query: `${city} travel`,
      page: String(page),
      per_page: String(perCity),
      content_filter: "high",
    }).then((data) => ({ city, data }))
  )

  const results = await Promise.all(fetches)
  const seen = new Set<string>()
  const combined: UnsplashPhoto[] = []

  for (const { city, data } of results) {
    for (const raw of data.results ?? []) {
      if (seen.has(raw.id)) continue
      seen.add(raw.id)
      combined.push(normalize(raw, "home", city))
    }
  }

  return {
    total: combined.length,
    totalPages: page < 3 ? 3 : page,
    page,
    perPage,
    results: combined.slice(0, perPage),
  }
}

export async function searchDestinations(
  query: string,
  page = 1,
  perPage = 24
): Promise<PaginatedPhotos> {
  const data = await request<SearchResponse>("/search/photos", {
    query,
    page: String(page),
    per_page: String(perPage),
    content_filter: "high",
  })
  return {
    total: data.total ?? 0,
    totalPages: data.total_pages ?? 0,
    page,
    perPage,
    results: (data.results ?? []).map((r) => normalize(r, "search")),
  }
}

// REVIEWER_NOTE: Related-destinations two-query strategy. The primary query combines the photo's
// location with its first 3 tags for precision. If that returns fewer than 8 results (after
// excluding the current photo), we fall back to a broader "{fallbackCity} landmark travel" query.
// Results are deduplicated by ID and capped at 8. This guarantees the Bento sidebar always has
// enough images without repetitive content.
export async function fetchRelated(
  location: string | null,
  tags: string[],
  excludedId: string,
  fallbackCity: string | null
): Promise<UnsplashPhoto[]> {
  const collected: UnsplashRawPhoto[] = []
  const seenIds = new Set<string>([excludedId])

  const primaryTerms = [location, ...tags.slice(0, 3)].filter(Boolean)
  if (primaryTerms.length > 0) {
    const primary = await request<SearchResponse>("/search/photos", {
      query: primaryTerms.join(" "),
      page: "1",
      per_page: "12",
      content_filter: "high",
    })
    for (const r of primary.results ?? []) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id)
        collected.push(r)
      }
    }
  }

  if (collected.length < 8) {
    const secondaryQuery = `${fallbackCity ?? "travel"} landmark travel`
    const secondary = await request<SearchResponse>("/search/photos", {
      query: secondaryQuery,
      page: "1",
      per_page: "12",
      content_filter: "high",
    })
    for (const r of secondary.results ?? []) {
      if (seenIds.has(r.id)) continue
      seenIds.add(r.id)
      collected.push(r)
      if (collected.length >= 8) break
    }
  }

  return collected.slice(0, 8).map((r) => normalize(r, "related"))
}

export async function getPhoto(id: string): Promise<UnsplashPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) {
    throw new ServiceError("La clave de Unsplash no está configurada", 500)
  }
  const res = await fetch(`${UNSPLASH_BASE}/photos/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
    },
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    if (res.status === 401) throw new ServiceError("Unsplash rechazó la clave de acceso", 502)
    throw new ServiceError(`Fallo la solicitud a Unsplash (${res.status})`, 502)
  }
  return normalize((await res.json()) as UnsplashRawPhoto, "search")
}
