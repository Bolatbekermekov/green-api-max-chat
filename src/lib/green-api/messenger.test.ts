import { describe, expect, it } from "vitest"

import { detectMessenger } from "@/lib/green-api/messenger"

describe("detectMessenger", () => {
  it("recognises MAX by typeInstance v3", () => {
    expect(detectMessenger("v3")).toBe("max")
  })

  it("recognises WhatsApp", () => {
    expect(detectMessenger("whatsapp")).toBe("whatsapp")
  })

  it.each([undefined, ""])(
    "treats typeInstance %j as WhatsApp, whose older API does not report it",
    (typeInstance) => {
      expect(detectMessenger(typeInstance)).toBe("whatsapp")
    },
  )

  it("rejects other messengers", () => {
    expect(detectMessenger("telegram")).toBeNull()
  })
})
