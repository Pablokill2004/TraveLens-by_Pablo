import { NextRequest, NextResponse } from "next/server"
import { generateTravelPlan, ServiceError, type TravelPlanContext } from "@/services/gemini"

export const dynamic = "force-dynamic"

interface PlanRequestBody {
  destination?: string
  context?: TravelPlanContext
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as PlanRequestBody | null

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { message: "Cuerpo de la solicitud inválido", status: 400 } },
      { status: 400 }
    )
  }

  const destination = (body.destination ?? "").toString().slice(0, 200).trim()
  if (!destination) {
    return NextResponse.json(
      { error: { message: "Se requiere un destino", status: 400 } },
      { status: 400 }
    )
  }

  const ctx: TravelPlanContext = {
    description: body.context?.description
      ? body.context.description.toString().slice(0, 500)
      : null,
    tags: Array.isArray(body.context?.tags)
      ? body.context.tags.filter((t): t is string => typeof t === "string").slice(0, 8)
      : [],
    photographer: body.context?.photographer
      ? body.context.photographer.toString().slice(0, 120)
      : undefined,
    cityName: body.context?.cityName ? body.context.cityName.toString().slice(0, 100) : null,
  }

  try {
    const plan = await generateTravelPlan(destination, ctx)
    return NextResponse.json({ data: plan })
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500
    const message = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json({ error: { message, status } }, { status })
  }
}
