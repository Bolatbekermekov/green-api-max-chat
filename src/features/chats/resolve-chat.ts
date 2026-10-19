import type { GreenApiClient } from "@/lib/green-api/client"
import { describeError } from "@/lib/green-api/errors"
import { formatPhone } from "@/lib/phone"

export type ResolveChatResult =
  | { ok: true; chatId: string; fromCache: boolean }
  | { ok: false; error: string }

/**
 * MAX addresses chats by numeric chatId, so a phone number has to be looked
 * up with CheckAccount first. Known numbers come from the local index —
 * the free plan allows only 100 checks a month.
 */
export async function resolveChatByPhone(
  client: Pick<GreenApiClient, "checkAccount">,
  phoneDigits: string,
  phoneIndex: Record<string, string>,
  signal?: AbortSignal,
): Promise<ResolveChatResult> {
  const cached = phoneIndex[phoneDigits]
  if (cached) return { ok: true, chatId: cached, fromCache: true }

  try {
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
