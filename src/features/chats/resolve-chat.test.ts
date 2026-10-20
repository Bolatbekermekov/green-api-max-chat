import { describe, expect, it, vi } from "vitest"

import { resolveChatByPhone } from "@/features/chats/resolve-chat"
import type { GreenApiClient } from "@/lib/green-api/client"
import { GreenApiError } from "@/lib/green-api/errors"

type NumberChecks = Pick<GreenApiClient, "checkAccount" | "checkWhatsapp">

function client(overrides: Partial<NumberChecks> = {}) {
  return {
    checkAccount: vi.fn<NumberChecks["checkAccount"]>(),
    checkWhatsapp: vi.fn<NumberChecks["checkWhatsapp"]>(),
    ...overrides,
  }
}

describe("resolveChatByPhone", () => {
  it("returns a cached chatId without calling the API", async () => {
    const api = client()

    await expect(
      resolveChatByPhone(api, "max", "79991234567", {
        "79991234567": "10000000",
      }),
    ).resolves.toEqual({ ok: true, chatId: "10000000", fromCache: true })
    expect(api.checkAccount).not.toHaveBeenCalled()
  })

  it("returns the chatId from CheckAccount", async () => {
    const api = client({
      checkAccount: vi.fn(async () => ({ exist: true, chatId: "10000000" })),
    })

    await expect(
      resolveChatByPhone(api, "max", "79991234567", {}),
    ).resolves.toEqual({ ok: true, chatId: "10000000", fromCache: false })
    expect(api.checkAccount).toHaveBeenCalledWith("79991234567", undefined)
    expect(api.checkWhatsapp).not.toHaveBeenCalled()
  })

  it("explains when the number has no MAX account", async () => {
    const api = client({
      checkAccount: vi.fn(async () => ({ exist: false, chatId: "" })),
    })

    await expect(
      resolveChatByPhone(api, "max", "79991234567", {}),
    ).resolves.toEqual({
      ok: false,
      error: "У номера +7 999 123-45-67 нет аккаунта MAX",
    })
  })

  it("addresses a WhatsApp number by its personal chatId", async () => {
    const api = client({ checkWhatsapp: vi.fn(async () => ({ exists: true })) })

    await expect(
      resolveChatByPhone(api, "whatsapp", "77011234567", {}),
    ).resolves.toEqual({
      ok: true,
      chatId: "77011234567@c.us",
      fromCache: false,
    })
    expect(api.checkWhatsapp).toHaveBeenCalledWith("77011234567", undefined)
    expect(api.checkAccount).not.toHaveBeenCalled()
  })

  it("explains when the number has no WhatsApp", async () => {
    const api = client({
      checkWhatsapp: vi.fn(async () => ({ exists: false })),
    })

    await expect(
      resolveChatByPhone(api, "whatsapp", "77011234567", {}),
    ).resolves.toEqual({
      ok: false,
      error: "У номера +7 701 123-45-67 нет WhatsApp",
    })
  })

  it("describes API errors", async () => {
    const api = client({
      checkAccount: vi.fn(async () => {
        throw new GreenApiError("quota-exceeded", { status: 466 })
      }),
    })

    await expect(
      resolveChatByPhone(api, "max", "79991234567", {}),
    ).resolves.toEqual({
      ok: false,
      error: "Превышен лимит бесплатного тарифа GREEN-API (не больше 3 чатов)",
    })
  })

  it("lets an abort through instead of reporting it", async () => {
    const controller = new AbortController()
    const abortError = new DOMException("Aborted", "AbortError")
    const api = client({
      checkWhatsapp: vi.fn(async () => {
        controller.abort()
        throw abortError
      }),
    })

    await expect(
      resolveChatByPhone(
        api,
        "whatsapp",
        "77011234567",
        {},
        controller.signal,
      ),
    ).rejects.toBe(abortError)
  })
})
