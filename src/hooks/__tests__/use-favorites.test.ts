import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useFavorites } from "../use-favorites"
import type { UnsplashPhoto } from "@/lib/types"

const STORAGE_KEY = "travelens:favorites"

function makePhoto(id: string): UnsplashPhoto {
  return {
    id,
    slug: id,
    width: 100,
    height: 80,
    altDescription: `Foto ${id}`,
    color: null,
    urls: {
      thumb: `https://images.unsplash.com/${id}?w=200`,
      small: `https://images.unsplash.com/${id}?w=400`,
      regular: `https://images.unsplash.com/${id}?w=640`,
    },
    links: { html: `https://unsplash.com/photos/${id}`, download: "" },
    user: { name: "Test", username: "test", links: { html: "" } },
    location: null,
    tags: ["test"],
    likes: 1,
    cityName: null,
    displayTitle: `Título ${id}`,
    displaySubtitle: `Sub ${id}`,
  }
}

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts empty", () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.photos).toEqual([])
    expect(result.current.ids).toEqual([])
  })

  it("adds a photo and persists it to localStorage", () => {
    const { result } = renderHook(() => useFavorites())
    const photo = makePhoto("abc123")

    act(() => {
      result.current.toggle(photo)
    })

    expect(result.current.ids).toContain("abc123")
    expect(result.current.isFavorite("abc123")).toBe(true)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe("abc123")
    // Full objects are persisted (not bare IDs) so "Ver favoritos" can render offline.
    expect(stored[0].urls.small).toBe(photo.urls.small)
  })

  it("removes a photo when toggled again (unsave)", () => {
    const { result } = renderHook(() => useFavorites())
    const photo = makePhoto("xyz789")

    act(() => result.current.toggle(photo))
    act(() => result.current.toggle(photo))

    expect(result.current.ids).toEqual([])
    expect(result.current.isFavorite("xyz789")).toBe(false)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual([])
  })

  it("keeps favorites newest-first", () => {
    const { result } = renderHook(() => useFavorites())

    act(() => result.current.toggle(makePhoto("first")))
    act(() => result.current.toggle(makePhoto("second")))

    expect(result.current.photos[0].id).toBe("second")
    expect(result.current.photos[1].id).toBe("first")
  })

  it("ignores legacy/corrupted localStorage entries instead of crashing", () => {
    // Old format (ID strings) and garbage must be filtered by structural validation.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["legacy-id-1", null, 42, makePhoto("valid-01")])
    )

    const { result } = renderHook(() => useFavorites())

    expect(result.current.photos).toHaveLength(1)
    expect(result.current.ids).toEqual(["valid-01"])
  })

  it("survives malformed JSON in localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json[")
    const { result } = renderHook(() => useFavorites())
    expect(result.current.photos).toEqual([])
  })

  it("syncs across hooks instances via storage events", () => {
    const a = renderHook(() => useFavorites())
    const b = renderHook(() => useFavorites())

    act(() => {
      a.result.current.toggle(makePhoto("shared-01"))
    })

    expect(b.result.current.ids).toContain("shared-01")
  })
})
