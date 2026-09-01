import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPhoto, ServiceError } from "@/services/unsplash"
import { DestinationView } from "@/components/features/destination-view"

// REVIEWER_NOTE: In Next.js 16, dynamic route params are a Promise (not a plain object). We
// `await params` before use. This page is a server component, so it can call the server-only
// getPhoto() service directly — the API key never reaches the client. notFound() triggers the
// custom not-found.tsx boundary when the photo doesn't exist.
interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const photo = await getPhoto(id)
    if (!photo) return { title: "Destino — TraveLens" }
    return {
      title: `${photo.altDescription ?? photo.slug} — TraveLens`,
      description: `Explora ${photo.altDescription ?? "este destino"} y descubre una guía de viaje generada por inteligencia artificial.`,
    }
  } catch {
    return { title: "Destino — TraveLens" }
  }
}

export default async function DestinationPage({ params }: PageProps) {
  const { id } = await params

  let photo = null
  try {
    photo = await getPhoto(id)
  } catch (error) {
    if (error instanceof ServiceError && error.status === 502) {
      notFound()
    }
  }

  if (!photo) notFound()

  return <DestinationView photo={photo!} />
}
