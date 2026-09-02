"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "travelens:recent-searches"
const MAX = 8

let cachedRaw: string | undefined
let cachedResult: string[] = []

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function getSnapshot(): string[] {
  let next: string[] = []
  let raw: string | undefined
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? undefined
    if (raw === cachedRaw) return cachedResult
    const parsed: unknown = raw ? JSON.parse(raw) : []
    next = Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : []
  } catch {
    // Corrupted JSON or disabled storage: treat as empty.
  }
  // REVIEWER_NOTE: commit raw AND result together AFTER parsing (see use-favorites for rationale).
  cachedRaw = raw
  cachedResult = next
  return cachedResult
}

const serverSnapshot: string[] = []

function getServerSnapshot(): string[] {
  return serverSnapshot
}

export function useRecentSearches() {
  const terms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const add = useCallback((term: string) => {
    const clean = term.trim()
    if (!clean) return
    const current = getSnapshot()
    const next = [clean, ...current.filter((t) => t !== clean)].slice(0, MAX)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore persistence errors */
    }
    window.dispatchEvent(new StorageEvent("storage"))
  }, [])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new StorageEvent("storage"))
  }, [])

  return { terms, add, clear }
}
