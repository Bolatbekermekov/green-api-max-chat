import { describe, expect, it } from "vitest"

import { deriveApiUrl, normalizeApiUrl } from "@/lib/green-api/api-url"

describe("deriveApiUrl", () => {
  it("uses the first four digits of idInstance as the host prefix", () => {
    expect(deriveApiUrl("3100000001")).toBe("https://3100.api.green-api.com")
    expect(deriveApiUrl("7103123456")).toBe("https://7103.api.green-api.com")
  })
})

describe("normalizeApiUrl", () => {
  it("trims spaces and trailing slashes", () => {
    expect(normalizeApiUrl("  https://3100.api.green-api.com/ ")).toBe(
      "https://3100.api.green-api.com",
    )
    expect(normalizeApiUrl("https://api.green-api.com/v3///")).toBe(
      "https://api.green-api.com/v3",
    )
  })
})
