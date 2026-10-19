import { describe, expect, it, vi } from "vitest"

import { resolveChatByPhone } from "@/features/chats/resolve-chat"
import { GreenApiError } from "@/lib/green-api/errors"

describe("resolveChatByPhone", () => {
  it("returns a cached chatId without calling the API", async () => {
    const checkAccount = vi.fn()

    await expect(
      resolveChatByPhone({ checkAccount }, "79991234567", {
        "79991234567": "10000000",
      }),
    ).resolves.toEqual({ ok: true, chatId: "10000000", fromCache: true })
    expect(checkAccount).not.toHaveBeenCalled()
  })

  it("returns the chatId from CheckAccount", async () => {
    const checkAccount = vi.fn(async () => ({
      exist: true,
      chatId: "10000000",
    }))

    await expect(
      resolveChatByPhone({ checkAccount }, "79991234567", {}),
    ).resolves.toEqual({ ok: true, chatId: "10000000", fromCache: false })
    expect(checkAccount).toHaveBeenCalledWith("79991234567", undefined)
  })

  it("explains when the number has no MAX account", async () => {
    const checkAccount = vi.fn(async () => ({ exist: false, chatId: "" }))

    await expect(
      resolveChatByPhone({ checkAccount }, "79991234567", {}),
    ).resolves.toEqual({
      ok: false,
      error: "У номера +7 999 123-45-67 нет аккаунта MAX",
    })
  })

  it("describes API errors", async () => {
    const checkAccount = vi.fn(async () => {
      throw new GreenApiError("quota-exceeded", { status: 466 })
    })

    await expect(
      resolveChatByPhone({ checkAccount }, "79991234567", {}),
    ).resolves.toEqual({
      ok: false,
      error: "Превышен лимит бесплатного тарифа GREEN-API (не больше 3 чатов)",
    })
  })

  it("lets an abort through instead of reporting it", async () => {
    const controller = new AbortController()
    const abortError = new DOMException("Aborted", "AbortError")
    const checkAccount = vi.fn(async () => {
      controller.abort()
      throw abortError
    })

    await expect(
      resolveChatByPhone(
        { checkAccount },
        "79991234567",
        {},
        controller.signal,
      ),
    ).rejects.toBe(abortError)
  })
})
