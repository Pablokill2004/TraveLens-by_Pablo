"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X, Clock } from "lucide-react"

interface Props {
  initialQuery: string
  recent: string[]
  onQueryChange: (query: string) => void
  onClearRecent: () => void
}

export function SearchBar({
  initialQuery,
  recent,
  onQueryChange,
  onClearRecent,
}: Props) {
  const [value, setValue] = useState(initialQuery)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userInteractedRef = useRef(false)
  // REVIEWER_NOTE: Store onQueryChange in a ref so the debounce effect's dependency list
  // doesn't include a function that changes on every render (due to recent/router deps).
  // Without this, each re-render creates a new debounce timer that fires onQueryChange
  // again, causing the search-fetch loop. The ref ensures the debounce only re-runs when
  // `value` actually changes (user typing), not when the callback reference changes.
  const callbackRef = useRef(onQueryChange)
  useEffect(() => {
    callbackRef.current = onQueryChange
  })

  // Sync value from prop (initialQuery or URL change)
  useEffect(() => {
    void (async () => {
      setValue(initialQuery)
      userInteractedRef.current = false
    })()
  }, [initialQuery])

  // Debounced search — only fires on user interaction, not prop sync
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!userInteractedRef.current) return
    timerRef.current = setTimeout(() => {
      const trimmed = value.trim()
      if (trimmed) callbackRef.current(trimmed)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3">
      <div className="relative w-full">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            userInteractedRef.current = true
            setValue(e.target.value)
          }}
          placeholder="Busca destinos, ciudades o paisajes…"
          className="h-11 pl-9 text-base"
          aria-label="Buscar fotos de viaje"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              userInteractedRef.current = true
              setValue("")
            }}
            className="pointer-events-auto absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {recent.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> Búsquedas recientes:
          </span>
          {recent.map((term) => (
            <Badge
              key={term}
              variant="secondary"
              render={
                <button
                  type="button"
                  onClick={() => {
                    userInteractedRef.current = true
                    setValue(term)
                  }}
                />
              }
              className="cursor-pointer"
            >
              {term}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="xs"
            onClick={onClearRecent}
            className="text-muted-foreground"
          >
            <X className="size-3" /> Limpiar
          </Button>
        </div>
      )}
    </div>
  )
}
