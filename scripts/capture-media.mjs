import { chromium } from "playwright"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, "..")
const ASSETS_DIR = join(PROJECT_ROOT, "assets")
const BASE_URL = "http://localhost:3000"
const TIMEOUT = 30000

const browser = await chromium.launch({ headless: true })

async function screenshotHome() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: TIMEOUT })

  // Wait for images to load (the masonry grid cards)
  await page.waitForTimeout(3000)

  await page.screenshot({
    path: join(ASSETS_DIR, "screenshot-home.png"),
    fullPage: true,
  })

  console.log("✓ screenshot-home.png saved")
  await context.close()
}

async function screenshotDestination() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: TIMEOUT })
  await page.waitForTimeout(2000)

  // Click on the first card in the masonry grid
  const firstCard = page.locator("button[data-card-index='0']").first()
  await firstCard.waitFor({ state: "visible", timeout: TIMEOUT })
  await firstCard.click()

  // Wait for destination page to load
  await page.waitForURL("**/destination/**", { timeout: TIMEOUT })
  await page.waitForTimeout(4000) // wait for images + plan skeleton to render

  await page.screenshot({
    path: join(ASSETS_DIR, "screenshot-destination.png"),
    fullPage: true,
  })

  console.log("✓ screenshot-destination.png saved")
  await context.close()
}

async function recordDemo() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: TIMEOUT })
  await page.waitForTimeout(3000)

  // Type "kyoto" in search with delays for realism
  const input = page.locator('input[aria-label="Buscar fotos de viaje"]')
  await input.waitFor({ state: "visible", timeout: TIMEOUT })
  await input.fill("")
  await input.pressSequentially("kyoto", { delay: 120 })
  await page.waitForTimeout(1500) // wait for debounce + fetch

  // Hover over first card to show overlay
  const firstCard = page.locator("button[data-card-index='0']").first()
  await firstCard.waitFor({ state: "visible", timeout: TIMEOUT })
  await firstCard.hover()
  await page.waitForTimeout(800)

  // Click to navigate to destination
  await firstCard.click()
  await page.waitForURL("**/destination/**", { timeout: TIMEOUT })
  await page.waitForTimeout(5000) // wait for hero image + plan to render

  // Final screenshot of destination with plan loaded
  await page.screenshot({
    path: join(ASSETS_DIR, "screenshot-destination.png"),
    fullPage: true,
  })

  console.log("✓ demo screenshots captured")
  await context.close()
}

try {
  await screenshotHome()
  await screenshotDestination()
  await recordDemo()
  console.log("All captures complete!")
} catch (err) {
  console.error("Capture failed:", err.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
