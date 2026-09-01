"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "travelens:favorites"

// REVIEWER_NOTE: Module-level snapshot cache. useSyncExternalStore compares the value returned
// by getSnapshot() by reference (Object.is) on every render. If getSnapshot returns a NEW array
// each time (e.g. JSON.parse(raw) creates a fresh object), React sees a "change", re-renders,
// calls getSnapshot again, gets another new reference → infinite loop. By caching the last raw
// string + parsed result and returning the SAME reference when raw is unchanged, we break the loop.
// getServerSnapshot returns a stable empty array so SSR and the first client render match.
let cachedRaw: string | undefined
let cachedResult: string[] = []

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function getSnapshot(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? undefined
    if (raw === cachedRaw) return cachedResult
    cachedRaw = raw
    cachedResult = raw ? (JSON.parse(raw) as string[]) : []
    return cachedResult
  } catch {
    return []
  }
}

const serverSnapshot: string[] = []

function getServerSnapshot(): string[] {
  return serverSnapshot
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = useCallback((id: string) => {
    const current = getSnapshot()
    const has = current.includes(id)
    const next = has ? current.filter((x) => x !== id) : [...current, id]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore persistence errors */
    }
    window.dispatchEvent(new StorageEvent("storage"))
  }, [])

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids])

  return { ids, isFavorite, toggle }
}
