"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import type { UnsplashPhoto } from "@/lib/types"

interface Props {
  photoId: string
  tags: string[]
  location: string | null
  fallbackCity: string | null
}

// REVIEWER_NOTE: Bento mosaic span pattern. The 8 thumbnails map to CSS Grid spans that create a
// varied mosaic: two small squares, one large 2x2 hero tile, one tall 1x2, then small squares.
// With `grid-cols-2 auto-rows-[88px]`, the layout fills ~352px without scrolling. The pattern is
// intentionally asymmetric to feel hand-curated rather than a uniform grid.
const SPAN_CLASSES = [
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
]

export function SimilarGrid({ photoId, tags, location, fallbackCity }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch("/api/photos/related", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location, tags, excludedId: photoId, fallbackCity }),
        })
        const json = await res.json()
        if (cancelled) return
        if (res.ok) {
          setPhotos((json.data as UnsplashPhoto[]) ?? [])
        }
      } catch {
        // silently fail — similar is non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [photoId, tags, location, fallbackCity])

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Destinos Similares
      </h3>
      {loading ? (
        <div className="grid grid-cols-2 auto-rows-[88px] gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 auto-rows-[88px] gap-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`/destination/${p.id}`)}
              aria-label="Ver destino similar"
              className={`group relative overflow-hidden rounded-lg ring-1 ring-foreground/5 transition-shadow hover:ring-2 hover:ring-primary/30 ${SPAN_CLASSES[i] ?? "col-span-1 row-span-1"}`}
            >
              <Image
                src={p.urls.thumb}
                alt=""
                fill
                sizes="140px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          ))}
          {photos.length === 0 && (
            <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">
              No se encontraron destinos similares.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
