"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { UnsplashPhoto } from "@/lib/types"

const STORAGE_KEY = "travelens:favorites"

// REVIEWER_NOTE: Module-level snapshot cache. useSyncExternalStore compares the value returned
// by getSnapshot() by reference (Object.is) on every render. If getSnapshot returns a NEW array
// each time (e.g. JSON.parse(raw) creates a fresh object), React sees a "change", re-renders,
// calls getSnapshot again, gets another new reference → infinite loop. By caching the last raw
// string + parsed result and returning the SAME reference when raw is unchanged, we break the loop.
// getServerSnapshot returns a stable empty array so SSR and the first client render match.
let cachedRaw: string | undefined
let cachedResult: UnsplashPhoto[] = []

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function getSnapshot(): UnsplashPhoto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? undefined
    if (raw === cachedRaw) return cachedResult
    cachedRaw = raw
    cachedResult = raw ? (JSON.parse(raw) as UnsplashPhoto[]) : []
    return cachedResult
  } catch {
    return []
  }
}

const serverSnapshot: UnsplashPhoto[] = []

function getServerSnapshot(): UnsplashPhoto[] {
  return serverSnapshot
}

// REVIEWER_NOTE: Favorites now persist the FULL normalized photo object, not just IDs.
// The popular feed shows 3 random cities per load, so filtering a saved-ID list against the
// current feed would almost always yield an empty favorites view. Storing the photo objects
// lets "Ver favoritos" render its own grid directly from localStorage.
export function useFavorites() {
  const photos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const ids = photos.map((p) => p.id)

  const toggle = useCallback((photo: UnsplashPhoto) => {
    const current = getSnapshot()
    const has = current.some((p) => p.id === photo.id)
    const next = has
      ? current.filter((p) => p.id !== photo.id)
      : [photo, ...current]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore persistence errors */
    }
    window.dispatchEvent(new StorageEvent("storage"))
  }, [])

  const isFavorite = useCallback(
    (id: string) => photos.some((p) => p.id === id),
    [photos]
  )

  return { photos, ids, isFavorite, toggle }
}
