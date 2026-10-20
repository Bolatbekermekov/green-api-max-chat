import type { GreenApiClient } from "@/lib/green-api/client"
import { describeError } from "@/lib/green-api/errors"
import type { MessengerType } from "@/lib/green-api/messenger"
import { formatPhone } from "@/lib/phone"

export type ResolveChatResult =
  | { ok: true; chatId: string; fromCache: boolean }
  | { ok: false; error: string }

/**
 * MAX addresses chats by numeric chatId, so a phone number has to be looked
 * up with CheckAccount first. A WhatsApp chat is the number itself
 * ("79001234567@c.us"); CheckWhatsapp only confirms the account exists.
 * Known numbers come from the local index — the free plan limits checks.
 */
export async function resolveChatByPhone(
  client: Pick<GreenApiClient, "checkAccount" | "checkWhatsapp">,
  messenger: MessengerType,
  phoneDigits: string,
  phoneIndex: Record<string, string>,
  signal?: AbortSignal,
): Promise<ResolveChatResult> {
  const cached = phoneIndex[phoneDigits]
  if (cached) return { ok: true, chatId: cached, fromCache: true }

  try {
    if (messenger === "whatsapp") {
      const { exists } = await client.checkWhatsapp(phoneDigits, signal)
      if (!exists) {
        return {
          ok: false,
          error: `У номера ${formatPhone(phoneDigits)} нет WhatsApp`,
        }
      }
      return { ok: true, chatId: `${phoneDigits}@c.us`, fromCache: false }
    }

    const { exist, chatId } = await client.checkAccount(phoneDigits, signal)
    if (!exist || !chatId) {
      return {
        ok: false,
        error: `У номера ${formatPhone(phoneDigits)} нет аккаунта MAX`,
      }
    }
    return { ok: true, chatId, fromCache: false }
  } catch (error) {
    if (signal?.aborted) throw error
    return { ok: false, error: describeError(error) }
  }
}
