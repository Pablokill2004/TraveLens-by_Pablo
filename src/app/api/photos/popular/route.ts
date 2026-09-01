import { NextRequest, NextResponse } from "next/server"
import { fetchPopular, ServiceError } from "@/services/unsplash"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pageRaw = Number(searchParams.get("page") ?? "1")
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1

  try {
    const data = await fetchPopular(page)
    return NextResponse.json({ data })
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500
    const message = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json({ error: { message, status } }, { status })
  }
}
