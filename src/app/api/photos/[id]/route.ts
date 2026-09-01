import { NextRequest, NextResponse } from "next/server"
import { getPhoto, ServiceError } from "@/services/unsplash"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json(
      { error: { message: "Identificador de foto inválido", status: 400 } },
      { status: 400 }
    )
  }

  try {
    const photo = await getPhoto(id)
    if (!photo) {
      return NextResponse.json(
        { error: { message: "Foto no encontrada", status: 404 } },
        { status: 404 }
      )
    }
    return NextResponse.json({ data: photo })
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500
    const message = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json({ error: { message, status } }, { status })
  }
}
