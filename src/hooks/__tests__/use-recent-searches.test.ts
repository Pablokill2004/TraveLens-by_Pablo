import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useRecentSearches } from "../use-recent-searches"

const STORAGE_KEY = "travelens:recent-searches"

describe("useRecentSearches", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts empty", () => {
    const { result } = renderHook(() => useRecentSearches())
    expect(result.current.terms).toEqual([])
  })

  it("adds a term and persists it", () => {
    const { result } = renderHook(() => useRecentSearches())

    act(() => {
      result.current.add("Kioto")
    })

    expect(result.current.terms).toEqual(["Kioto"])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([
      "Kioto",
    ])
  })

  it("dedupes and moves repeated terms to the front", () => {
    const { result } = renderHook(() => useRecentSearches())

    act(() => {
      result.current.add("París")
      result.current.add("Roma")
      result.current.add("París")
    })

    expect(result.current.terms).toEqual(["París", "Roma"])
  })

  it("caps history at 8 entries (oldest dropped)", () => {
    const { result } = renderHook(() => useRecentSearches())

    act(() => {
      for (let i = 1; i <= 10; i++) {
        result.current.add(`ciudad-${i}`)
      }
    })

    expect(result.current.terms).toHaveLength(8)
    expect(result.current.terms[0]).toBe("ciudad-10")
    expect(result.current.terms).not.toContain("ciudad-1")
    expect(result.current.terms).not.toContain("ciudad-2")
  })

  it("ignores empty/whitespace terms", () => {
    const { result } = renderHook(() => useRecentSearches())

    act(() => {
      result.current.add("   ")
      result.current.add("")
    })

    expect(result.current.terms).toEqual([])
  })

  it("clear() empties state and removes the localStorage key", () => {
    const { result } = renderHook(() => useRecentSearches())

    act(() => result.current.add("Bali"))
    act(() => result.current.clear())

    expect(result.current.terms).toEqual([])
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("syncs across hook instances via storage events", () => {
    const a = renderHook(() => useRecentSearches())
    const b = renderHook(() => useRecentSearches())

    act(() => {
      a.result.current.add("Lisboa")
    })

    expect(b.result.current.terms).toContain("Lisboa")
  })
})
