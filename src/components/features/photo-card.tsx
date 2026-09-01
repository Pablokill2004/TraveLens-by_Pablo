"use client"

import Image from "next/image"
import type { CSSProperties } from "react"
import { Heart } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { UnsplashPhoto } from "@/lib/types"

interface Props {
  photo: UnsplashPhoto
  index: number
  isActive: boolean
  isFavorite: boolean
  onActivate: (index: number) => void
  onOpen: () => void
  onToggleFavorite: () => void
}

const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2
  const distance = 16
  return {
    tx: `${Math.cos(angle) * distance}px`,
    ty: `${Math.sin(angle) * distance}px`,
  }
})

export function PhotoCard({
  photo,
  index,
  isActive,
  isFavorite,
  onActivate,
  onOpen,
  onToggleFavorite,
}: Props) {
  const [burst, setBurst] = useState(false)

  function handleFavorite() {
    const willFavorite = !isFavorite
    onToggleFavorite()
    if (willFavorite) setBurst(true)
  }

  return (
    <article
      role="listitem"
      className="mb-4 break-inside-avoid animate-stagger"
      style={{ "--stagger-index": index } as CSSProperties}
    >
      <div className="group relative overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
        <button
          type="button"
          data-card-index={index}
          tabIndex={isActive ? 0 : -1}
          onFocus={() => onActivate(index)}
          onClick={onOpen}
          aria-label={`Ver detalle de ${photo.displayTitle}`}
          className="block w-full cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <Image
            src={photo.urls.small}
            alt={photo.altDescription ?? "Fotografía de viaje"}
            width={photo.width}
            height={photo.height}
            sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className="h-auto w-full"
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
          />

          <div className="scrim absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="font-heading text-sm font-medium text-background drop-shadow">
              {photo.displayTitle}
            </span>
            {photo.displaySubtitle && (
              <span className="text-xs text-background/85 drop-shadow">
                {photo.displaySubtitle}
              </span>
            )}
          </div>
        </button>

        <span className="absolute right-2 top-2">
          <Button
            size="icon-sm"
            variant={isFavorite ? "default" : "secondary"}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"
            }
            className="shadow-md backdrop-blur"
            onClick={(e) => {
              e.stopPropagation()
              handleFavorite()
            }}
          >
            <Heart
              className={cn(
                "size-4 transition-transform",
                isFavorite && "fill-rose-500 text-rose-500",
                burst && "heart-pop"
              )}
            />
          </Button>
          {burst && (
            <span
              className="pointer-events-none absolute inset-0"
              onAnimationEnd={() => setBurst(false)}
            >
              {PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className="heart-particle"
                  style={
                    {
                      "--tx": p.tx,
                      "--ty": p.ty,
                    } as CSSProperties
                  }
                />
              ))}
            </span>
          )}
        </span>
      </div>
    </article>
  )
}
