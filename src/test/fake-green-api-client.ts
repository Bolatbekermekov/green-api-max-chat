import { vi } from "vitest"

import type { GreenApiClient } from "@/lib/green-api/client"

/**
 * A GreenApiClient for component tests: every method fails loudly unless the
 * test provides it, so an unexpected API call cannot pass silently.
 */
export function fakeGreenApiClient(
  overrides: Partial<GreenApiClient> = {},
): GreenApiClient {
  const unexpected = (name: string) =>
    vi.fn(async () => {
      throw new Error(`Unexpected GREEN-API call: ${name}`)
    })

  return {
    getStateInstance: unexpected("getStateInstance"),
    getSettings: unexpected("getSettings"),
    setSettings: unexpected("setSettings"),
    checkAccount: unexpected("checkAccount"),
    checkWhatsapp: unexpected("checkWhatsapp"),
    sendMessage: unexpected("sendMessage"),
    receiveNotification: unexpected("receiveNotification"),
    deleteNotification: unexpected("deleteNotification"),
    ...overrides,
  }
}
