"use client"

import { useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ExternalLink, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/hooks/use-favorites"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SimilarGrid } from "./similar-grid"
import { TravelPlanPanel } from "./travel-plan-panel"
import type { UnsplashPhoto } from "@/lib/types"

interface Props {
  photo: UnsplashPhoto
}

export function DestinationView({ photo }: Props) {
  const favorites = useFavorites()
  const isFavorite = favorites.ids.includes(photo.id)

  const openExternal = useCallback(() => {
    window.open(photo.links.html, "_blank", "noopener,noreferrer")
  }, [photo.links.html])

  const locationString =
    [photo.location?.city, photo.location?.country].filter(Boolean).join(", ") ||
    photo.location?.name ||
    null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_280px]">
          {/* Left — Hero */}
          <div className="relative overflow-hidden rounded-2xl">
            <Image
              src={photo.urls.regular}
              alt={photo.altDescription ?? "Fotografía de viaje"}
              width={photo.width}
              height={photo.height}
              priority
              className="h-[60vh] w-full object-cover"
              sizes="(min-width:1024px) 33vw, 100vw"
            />
            <div className="scrim absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6">
              <h1 className="font-heading text-2xl font-semibold text-background drop-shadow-lg">
                {photo.displayTitle}
              </h1>
              {photo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {photo.tags.slice(0, 5).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="pointer-events-none bg-background/20 text-xs text-background backdrop-blur-sm"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <span className="absolute right-4 top-4">
              <Button
                size="icon-sm"
                variant={isFavorite ? "default" : "secondary"}
                aria-pressed={isFavorite}
                aria-label={
                  isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"
                }
                className="shadow-md backdrop-blur"
                onClick={() => favorites.toggle(photo.id)}
              >
                <Heart
                  className={cn(
                    "size-4",
                    isFavorite && "fill-rose-500 text-rose-500"
                  )}
                />
              </Button>
            </span>
          </div>

          {/* Right — Plan */}
          <TravelPlanPanel
            destination={photo.displayTitle}
            context={{
              description: photo.altDescription,
              tags: photo.tags,
              photographer: photo.user.name,
              cityName: photo.cityName,
            }}
          />

          {/* Far-right — Similar */}
          <SimilarGrid
            photoId={photo.id}
            tags={photo.tags}
            location={locationString}
            fallbackCity={photo.cityName ?? photo.tags[0] ?? null}
          />
        </div>
        <div className="mt-6">
          <Button variant="outline" onClick={openExternal}>
            <ExternalLink className="size-4" /> Ver en Unsplash
          </Button>
        </div>
      </div>
    </div>
  )
}
