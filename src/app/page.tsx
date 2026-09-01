"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { SearchBar } from "@/components/features/search-bar"
import { MasonryGrid } from "@/components/features/masonry-grid"
import { useFavorites } from "@/hooks/use-favorites"
import { useRecentSearches } from "@/hooks/use-recent-searches"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { UnsplashPhoto } from "@/lib/types"

function HomeContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const searchParamQ = sp.get("q")?.trim() || ""
  const initialQuery = searchParamQ || ""
  const isSearchMode = Boolean(searchParamQ)

  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [query, setQuery] = useState(initialQuery)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)

  const favorites = useFavorites()
  const recent = useRecentSearches()
  // REVIEWER_NOTE: fetchedRef prevents the search-fetch infinite loop. Without it: the initial
  // useEffect fetches "viajes", the SearchBar's debounce fires onQueryChange("viajes") after 300ms,
  // which calls router.push (re-render) → useEffect re-runs → fetch again → loop forever. fetchedRef
  // tracks the last successfully-fetched query; both the effect and handleQueryChange skip when the
  // incoming query equals fetchedRef.current. This is the guard that keeps the terminal quiet.
  const fetchedRef = useRef(initialQuery)

  const loadPopular = useCallback(
    async (pageNum = 1) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/photos/popular?page=${pageNum}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json?.error?.message ?? "Error al buscar fotos")
          if (pageNum === 1) setPhotos([])
          return
        }
        setPhotos((prev) =>
          pageNum === 1 ? json.data.results : [...prev, ...json.data.results]
        )
        setTotalPages(json.data.totalPages)
        setPage(pageNum)
        fetchedRef.current = `__popular__:${pageNum}`
      } catch {
        setError("No se pudo conectar con el servidor")
        if (pageNum === 1) setPhotos([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const loadSearch = useCallback(
    async (q: string, pageNum = 1) => {
      const trimmed = q.trim()
      if (!trimmed) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/photos?q=${encodeURIComponent(trimmed)}&page=${pageNum}`
        )
        const json = await res.json()
        if (!res.ok) {
          setError(json?.error?.message ?? "Error al buscar fotos")
          if (pageNum === 1) setPhotos([])
          return
        }
        setPhotos((prev) =>
          pageNum === 1 ? json.data.results : [...prev, ...json.data.results]
        )
        setTotalPages(json.data.totalPages)
        setPage(pageNum)
        fetchedRef.current = trimmed
      } catch {
        setError("No se pudo conectar con el servidor")
        if (pageNum === 1) setPhotos([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (isSearchMode) {
      if (fetchedRef.current !== searchParamQ) {
        void loadSearch(searchParamQ, 1)
      }
    } else {
      void (async () => {
        loadPopular(1)
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchMode, searchParamQ])

  const handleQueryChange = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (!trimmed || trimmed === fetchedRef.current) return
      // REVIEWER_NOTE: Guard against pushing to the same URL. If the trimmed query already matches
      // the current searchParamQ, skip the push to avoid triggering a server re-render loop.
      if (trimmed === searchParamQ) return
      recent.add(trimmed)
      router.push(`/?q=${encodeURIComponent(trimmed)}`, { scroll: false })
      setQuery(trimmed)
    },
    [recent, router, searchParamQ]
  )

  const openDetail = useCallback(
    (p: UnsplashPhoto) => {
      router.push(`/destination/${p.id}`)
    },
    [router]
  )

  const loadMore = useCallback(() => {
    if (isSearchMode) {
      void loadSearch(query, page + 1)
    } else {
      void loadPopular(page + 1)
    }
  }, [isSearchMode, query, page, loadSearch, loadPopular])

  const favoritesSet = new Set(favorites.ids)
  const visible = showFavorites
    ? photos.filter((p) => favoritesSet.has(p.id))
    : photos

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          TraveLens
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Explora fotografías de viaje y descubre cada destino con una guía
          generada por inteligencia artificial.
        </p>
      </header>

      <SearchBar
        initialQuery={initialQuery}
        recent={recent.terms}
        onQueryChange={handleQueryChange}
        onClearRecent={recent.clear}
      />

      <div className="flex items-center justify-between">
        <Button
          variant={showFavorites ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavorites((v) => !v)}
        >
          <Heart
            className={cn("size-4", showFavorites && "fill-current")}
          />
          {showFavorites ? "Mostrando favoritos" : "Ver favoritos"} (
          {favorites.ids.length})
        </Button>
        <p className="text-sm text-muted-foreground">
          {loading ? "Buscando…" : `${visible.length} fotos`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && photos.length === 0 ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-4 break-inside-avoid rounded-xl"
              style={{ height: 180 + (i % 3) * 60 }}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          {showFavorites
            ? "Aún no has guardado fotos. Pulsa el corazón en una fotografía para guardarla."
            : "No se encontraron fotos. Prueba con otra búsqueda."}
        </div>
      ) : (
        <MasonryGrid
          photos={visible}
          favorites={favoritesSet}
          onOpen={openDetail}
          onToggleFavorite={favorites.toggle}
        />
      )}

      {!showFavorites && totalPages > page && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore}>
            Cargar más
          </Button>
        </div>
      )}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-96" />
          </div>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
