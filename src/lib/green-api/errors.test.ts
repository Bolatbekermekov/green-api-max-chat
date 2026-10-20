import { describe, expect, it } from "vitest"

import {
  describeError,
  GreenApiError,
  isFatalPollingError,
  type GreenApiErrorCode,
} from "@/lib/green-api/errors"

const GENERIC = "Что-то пошло не так. Попробуйте ещё раз"

const ALL_CODES: GreenApiErrorCode[] = [
  "network",
  "bad-request",
  "webhook-url-set",
  "not-authorized",
  "instance-starting",
  "unauthorized",
  "forbidden",
  "not-found",
  "rate-limited",
  "quota-exceeded",
  "check-limited",
  "server",
  "invalid-response",
  "unsupported-instance",
]

describe("describeError", () => {
  it.each(ALL_CODES)("has a specific Russian message for %s", (code) => {
    const message = describeError(new GreenApiError(code))
    expect(message).not.toBe(GENERIC)
    expect(message).toMatch(/[а-яё]/i)
  })

  it.each(ALL_CODES.filter((code) => code !== "unsupported-instance"))(
    "does not name a messenger in %s, shared by MAX and WhatsApp",
    (code) => {
      expect(describeError(new GreenApiError(code))).not.toMatch(
        /MAX|WhatsApp/,
      )
    },
  )

  it("explains a wrong token", () => {
    expect(
      describeError(new GreenApiError("unauthorized", { status: 401 })),
    ).toBe("Неверный apiTokenInstance")
  })

  it("adds the server's reason to rejected requests", () => {
    const error = new GreenApiError("bad-request", {
      status: 400,
      detail: "Instance is deleted",
    })
    expect(describeError(error)).toBe(
      "GREEN-API отклонил запрос: Instance is deleted",
    )
  })

  it("describes unknown errors generically", () => {
    expect(describeError(new Error("boom"))).toBe(GENERIC)
    expect(describeError("boom")).toBe(GENERIC)
  })
})

describe("isFatalPollingError", () => {
  it.each<GreenApiErrorCode>([
    "unauthorized",
    "forbidden",
    "not-found",
    "webhook-url-set",
  ])("stops polling on %s", (code) => {
    expect(isFatalPollingError(new GreenApiError(code))).toBe(true)
  })

  it.each<GreenApiErrorCode>([
    "network",
    "server",
    "rate-limited",
    "not-authorized",
    "instance-starting",
    "invalid-response",
  ])("keeps polling on %s", (code) => {
    expect(isFatalPollingError(new GreenApiError(code))).toBe(false)
  })

  it("keeps polling on errors that are not from GREEN-API", () => {
    expect(isFatalPollingError(new Error("boom"))).toBe(false)
  })
})
