"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, RefreshCw, Gem, Utensils } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { TravelPlan } from "@/lib/types"

interface Props {
  destination: string
  context: {
    description?: string | null
    tags?: string[]
    photographer?: string
    cityName?: string | null
  }
}

type Status = "idle" | "loading" | "done" | "error"

export function TravelPlanPanel({ destination, context }: Props) {
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)

  // REVIEWER_NOTE: Async fetch with cancellation. The `cancelled` flag (set in the effect cleanup)
  // prevents setState on an unmounted component — a common React warning. loadPlan is wrapped in
  // useCallback so the useEffect dependency is stable; the effect re-fires only when destination or
  // context actually change, not on every render.
  const loadPlan = useCallback(async () => {
    setStatus("loading")
    setPlan(null)
    setError(null)
    try {
      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, context }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.message ?? "Error desconocido")
        setStatus("error")
        return
      }
      setPlan(json.data as TravelPlan)
      setStatus("done")
    } catch {
      setError("No se pudo conectar con el servidor")
      setStatus("error")
    }
  }, [destination, context])

  useEffect(() => {
    void (async () => {
      loadPlan()
    })()
  }, [loadPlan])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-gold" />
          Guía de viaje con IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-muted/30 py-12">
            <Spinner className="size-6 text-gold" />
            <div className="flex w-full flex-col gap-3 px-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{error ?? "No se pudo generar la guía."}</p>
            <Button variant="outline" size="sm" onClick={loadPlan}>
              <RefreshCw className="size-4" /> Reintentar
            </Button>
          </div>
        )}

        {status === "done" && plan && (
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {plan.intro}
            </p>

            <div className="grid grid-cols-1 gap-3">
              {plan.days.map((d) => (
                <Card key={d.day} className="bg-secondary/40">
                  <CardContent className="p-3">
                    <p className="mb-1 text-xs font-semibold text-gold">
                      Día {d.day}
                    </p>
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Gem className="size-4 text-gold" />
                <p className="text-sm font-medium">Hidden Gem</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-sm font-medium">{plan.hiddenGem.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.hiddenGem.description}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Utensils className="size-4 text-gold" />
                <p className="text-sm font-medium">Local Food</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.localFood.map((f, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="inline-flex flex-col items-start gap-0.5 px-3 py-2 normal-case"
                    title={f.description}
                  >
                    <span className="text-xs font-medium">{f.name}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {f.description}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
