import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import App from "../App"

const FAVORITES_KEY = "travelens:favorites"
const RECENT_KEY = "travelens:recent-searches"

// The feed resolves from the fixture fallback (fetch rejects in jsdom) — several cards match,
// so we wait via findAllByRole and return the list.
async function renderLoadedApp() {
  render(<App />)
  const saveButtons = await screen.findAllByRole("button", {
    name: /Guardar en favoritos/i,
  })
  return saveButtons
}

function listItems() {
  return screen.getAllByRole("listitem")
}

describe("App — Challenge Definition of Done", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders the grid with photo cards and Save buttons (favorites UI)", async () => {
    const saveButtons = await renderLoadedApp()
    expect(saveButtons.length).toBeGreaterThan(0)
  })

  it("[1+2] Save persists to localStorage and fires heart + confetti effect", async () => {
    const saveButtons = await renderLoadedApp()
    const saveButton = saveButtons[0]

    fireEvent.click(saveButton)

    // Synchronous state update (no timers): pressed state + persistence.
    expect(saveButton).toHaveAttribute("aria-pressed", "true")
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]")
    expect(stored).toHaveLength(1)
    expect(stored[0]).toHaveProperty("urls")
    expect(stored[0].urls.small).toMatch(/^https:\/\/images\.unsplash\.com\//)

    // Confetti: burst particles render inside the saved card.
    const card = saveButton.closest("article") as HTMLElement
    expect(
      within(card).getByRole("button", { name: /Quitar de favoritos/i })
    ).toBeInTheDocument()
    expect(card.querySelectorAll(".heart-particle").length).toBe(8)
  })

  it("[1] 'Ver favoritos' shows saved photos with unsave buttons", async () => {
    const saveButtons = await renderLoadedApp()
    fireEvent.click(saveButtons[0])

    fireEvent.click(
      screen.getByRole("button", { name: /Ver favoritos/i })
    )

    // Favorites view renders exactly the 1 saved card, with a working Save control.
    await waitFor(() => expect(listItems()).toHaveLength(1))
    expect(listItems()[0]).toHaveTextContent(/París/)
    expect(
      within(listItems()[0]).getByRole("button", {
        name: /Quitar de favoritos/i,
      })
    ).toBeInTheDocument()
  })

  it("[3] grid cards carry staggered fade-in metadata (per-index reveal order)", async () => {
    await renderLoadedApp()

    const cards = listItems()
    expect(cards.length).toBeGreaterThan(3)
    expect(cards[0]).toHaveAttribute("data-stagger-index", "0")
    expect(cards[2]).toHaveAttribute("data-stagger-index", "2")
    // Reveal is transition-driven with an increasing per-index delay.
    expect(cards[0]).toHaveStyle({ transitionDelay: "0ms" })
  })

  it("[4] keyboard navigation moves focus across cards (Arrow/Home/End)", async () => {
    await renderLoadedApp()
    const cards = listItems()
    const openButtons = cards.map(
      (c) => c.querySelector("button[data-card-index]") as HTMLButtonElement
    )

    openButtons[0].focus()

    fireEvent.keyDown(openButtons[0], { key: "ArrowRight" })
    expect(document.activeElement).toBe(openButtons[1])

    fireEvent.keyDown(openButtons[1], { key: "ArrowDown" })
    expect(document.activeElement).toBe(openButtons[2])

    fireEvent.keyDown(openButtons[2], { key: "ArrowLeft" })
    expect(document.activeElement).toBe(openButtons[1])

    fireEvent.keyDown(openButtons[1], { key: "Home" })
    expect(document.activeElement).toBe(openButtons[0])

    fireEvent.keyDown(openButtons[0], { key: "End" })
    expect(document.activeElement).toBe(
      openButtons[openButtons.length - 1]
    )
  })

  it("[5] recent searches appear as clickable chips below the search bar", async () => {
    await renderLoadedApp()

    const input = screen.getByRole("textbox", {
      name: /Buscar fotos de viaje/i,
    })

    // Enter submits synchronously — chip appears without waiting for debounce timers.
    fireEvent.change(input, { target: { value: "tokio" } })
    fireEvent.keyDown(input, { key: "Enter" })

    const chip = await screen.findByRole("button", { name: "tokio" })
    expect(chip).toBeInTheDocument()

    // Clicking the chip re-runs that search and keeps it first in history.
    fireEvent.click(chip)
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")).toEqual([
        "tokio",
      ])
    })
  })

  it("search filters the visible grid (URL param in Next, local filter offline)", async () => {
    await renderLoadedApp()
    expect(listItems().length).toBeGreaterThan(1)

    const input = screen.getByRole("textbox", {
      name: /Buscar fotos de viaje/i,
    })
    fireEvent.change(input, { target: { value: "kioto" } })
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => expect(listItems()).toHaveLength(1))
    expect(listItems()[0]).toHaveTextContent(/Kioto/i)
  })

  it("clicking a card navigates to the destination route", async () => {
    await renderLoadedApp()
    const cards = listItems()
    const openButton = cards[0].querySelector(
      "button[data-card-index]"
    ) as HTMLButtonElement

    fireEvent.click(openButton)

    expect(window.location.pathname).toBe(
      "/destination/fx-paris-01"
    )
  })

  it("renders loading skeletons before the feed resolves", () => {
    render(<App />)
    expect(
      document.querySelectorAll('[data-slot="skeleton"]').length
    ).toBeGreaterThan(0)
  })
})
