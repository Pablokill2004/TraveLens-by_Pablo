import { NextRequest, NextResponse } from "next/server"
import { fetchRelated, ServiceError } from "@/services/unsplash"

export const dynamic = "force-dynamic"

interface RelatedRequestBody {
  location?: string | null
  tags?: string[]
  excludedId?: string
  fallbackCity?: string | null
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as RelatedRequestBody | null

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { message: "Cuerpo de la solicitud inválido", status: 400 } },
      { status: 400 }
    )
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 8)
    : []
  const location = body.location ? String(body.location).slice(0, 100) : null
  const fallbackCity = body.fallbackCity ? String(body.fallbackCity).slice(0, 100) : null
  const excludedId = body.excludedId ? String(body.excludedId).slice(0, 64) : ""

  if (!/^[A-Za-z0-9_-]{0,64}$/.test(excludedId)) {
    return NextResponse.json(
      { error: { message: "Identificador excluido inválido", status: 400 } },
      { status: 400 }
    )
  }

  try {
    const data = await fetchRelated(location, tags, excludedId, fallbackCity)
    return NextResponse.json({ data })
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500
    const message = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json({ error: { message, status } }, { status })
  }
}
