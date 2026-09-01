import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-heading text-6xl font-bold text-muted-foreground">
        404
      </p>
      <h1 className="font-heading text-2xl font-semibold">Destino no encontrado</h1>
      <p className="max-w-md text-muted-foreground">
        No pudimos encontrar el destino que buscas. Puede que haya sido
        eliminado o que la dirección sea incorrecta.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        ← Volver al inicio
      </Link>
    </main>
  )
}
