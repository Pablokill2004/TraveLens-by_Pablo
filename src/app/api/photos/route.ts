import { NextRequest, NextResponse } from "next/server"
import { searchDestinations, ServiceError } from "@/services/unsplash"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()
  const pageRaw = Number(searchParams.get("page") ?? "1")
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1

  if (!q) {
    return NextResponse.json(
      { error: { message: "El parámetro 'q' es requerido", status: 400 } },
      { status: 400 }
    )
  }
  if (q.length > 100) {
    return NextResponse.json(
      { error: { message: "La búsqueda es demasiado larga", status: 400 } },
      { status: 400 }
    )
  }

  try {
    const data = await searchDestinations(q, page)
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } }
    )
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500
    const message = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json({ error: { message, status } }, { status })
  }
}
