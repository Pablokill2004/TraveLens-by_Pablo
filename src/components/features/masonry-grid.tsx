"use client"

import { useRef, useState, type KeyboardEvent } from "react"
import { PhotoCard } from "./photo-card"
import type { UnsplashPhoto } from "@/lib/types"

interface Props {
  photos: UnsplashPhoto[]
  favorites: Set<string>
  onOpen: (photo: UnsplashPhoto) => void
  onToggleFavorite: (id: string) => void
}

export function MasonryGrid({ photos, favorites, onOpen, onToggleFavorite }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const effectiveActive = photos.length
    ? Math.min(activeIndex, photos.length - 1)
    : 0

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(photos.length - 1, index))
    setActiveIndex(clamped)
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-card-index="${clamped}"]`
    )
    el?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!photos.length) return
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault()
        focusIndex(effectiveActive + 1)
        break
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault()
        focusIndex(effectiveActive - 1)
        break
      case "Home":
        event.preventDefault()
        focusIndex(0)
        break
      case "End":
        event.preventDefault()
        focusIndex(photos.length - 1)
        break
    }
  }

  if (!photos.length) return null

  return (
    <div
      ref={listRef}
      role="list"
      aria-label="Resultados de fotografías"
      onKeyDown={onKeyDown}
      className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [column-fill:_balance]"
    >
      {photos.map((photo, i) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={i}
          isActive={i === effectiveActive}
          isFavorite={favorites.has(photo.id)}
          onActivate={setActiveIndex}
          onOpen={() => onOpen(photo)}
          onToggleFavorite={() => onToggleFavorite(photo.id)}
        />
      ))}
    </div>
  )
}
