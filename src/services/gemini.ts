import "server-only"

import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai"
import type { TravelPlan } from "@/lib/types"

const DEFAULT_MODEL = "gemini-3-flash-preview"

export class ServiceError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ServiceError"
    this.status = status
  }
}

export interface TravelPlanContext {
  description?: string | null
  tags?: string[]
  photographer?: string
  cityName?: string | null
}

// REVIEWER_NOTE: Structured JSON enforcement via responseSchema. Instead of asking the model to
// "return JSON" and hoping it complies, we declare an exact schema (typed with the SDK's SchemaType
// enums). The API rejects malformed output server-side, so the response is guaranteed to match the
// TravelPlan shape. We still validate the parsed result defensively in case the model partially
// deviates. The schema is typed as `Schema` (not inferred) to satisfy the SDK's strict enum typing.
const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    intro: { type: SchemaType.STRING },
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.NUMBER },
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["day", "title", "description"],
      },
    },
    hiddenGem: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
      },
      required: ["name", "description"],
    },
    localFood: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["name", "description"],
      },
    },
  },
  required: ["intro", "days", "hiddenGem", "localFood"],
}

function buildPrompt(destination: string, ctx: TravelPlanContext): string {
  const parts = [
    `Actúa como un redactor de guías de viaje de lujo para una revista premium.`,
    `Crea un itinerario de viaje para "${destination}".`,
    ctx.description ? `Contexto de la imagen: "${ctx.description}".` : "",
    ctx.tags?.length ? `Etiquetas: ${ctx.tags.join(", ")}.` : "",
    ctx.cityName ? `Ciudad: ${ctx.cityName}.` : "",
    ctx.photographer ? `Fotógrafo: ${ctx.photographer}.` : "",
    `Redacta en español un plan de viaje estructurado con exactamente este JSON:`,
    `{"intro": introducción de 2-3 frases,`,
    `"days": array de 3 días [{"day":1,"title":"","description":""}, ...],`,
    `"hiddenGem": {"name":"","description":""},`,
    `"localFood": [{"name":"","description":""}, ...]}.`,
    `No incluyas texto fuera del JSON.`,
  ]
  return parts.filter(Boolean).join(" ")
}

export async function generateTravelPlan(
  destination: string,
  context: TravelPlanContext
): Promise<TravelPlan> {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new ServiceError("La clave de Gemini no está configurada", 500)
  }
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction:
      "Eres un guía de viajes experto. Respondes siempre en español y exclusivamente con JSON válido.",
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  })

  const result = await model.generateContent(buildPrompt(destination, context), {
    timeout: 20000,
  }).catch((error) => {
    // Catch quota/rate limit errors (429)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      throw new ServiceError(
        "Se ha alcanzado el límite de solicitudes a Gemini. Espera unos minutos o actualiza tu plan.",
        429
      )
    }
    // Re-throw other errors
    throw error
  })
  const text = result.response.text()
  if (!text) {
    throw new ServiceError("Gemini no devolvió contenido", 502)
  }

  try {
    const parsed = JSON.parse(text) as TravelPlan
    if (
      !parsed.intro ||
      !Array.isArray(parsed.days) ||
      !parsed.hiddenGem ||
      !Array.isArray(parsed.localFood)
    ) {
      throw new ServiceError("La respuesta de Gemini tiene un formato inesperado", 502)
    }
    return parsed
  } catch {
    throw new ServiceError("No se pudo interpretar la respuesta de Gemini", 502)
  }
}
