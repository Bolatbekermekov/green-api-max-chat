import { describe, expect, it } from "vitest"

import { formatPhone, normalizePhone } from "@/lib/phone"

describe("normalizePhone", () => {
  it.each([
    ["+7 (999) 123-45-67", "79991234567"],
    ["8 999 123 45 67", "79991234567"],
    ["9991234567", "79991234567"],
    ["+375 29 123-45-67", "375291234567"],
  ])("normalizes %s", (input, digits) => {
    expect(normalizePhone(input)).toEqual({ ok: true, digits })
  })

  it("rejects empty input", () => {
    expect(normalizePhone("  ")).toEqual({
      ok: false,
      error: "Введите номер телефона",
    })
  })

  it.each(["12345", "+1 202 555 0100", "+998 90 123 45 67"])(
    "rejects %s",
    (input) => {
      expect(normalizePhone(input)).toEqual({
        ok: false,
        error: "Номер должен начинаться с +7 или +375",
      })
    },
  )
})

describe("formatPhone", () => {
  it("formats RU and BY numbers", () => {
    expect(formatPhone("79991234567")).toBe("+7 999 123-45-67")
    expect(formatPhone("375291234567")).toBe("+375 29 123-45-67")
  })

  it("falls back to a plus sign for other digits", () => {
    expect(formatPhone("123")).toBe("+123")
  })
})
