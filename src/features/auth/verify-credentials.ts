import type { GreenApiClient } from "@/lib/green-api/client"
import { GreenApiError } from "@/lib/green-api/errors"
import {
  detectMessenger,
  type MessengerType,
} from "@/lib/green-api/messenger"
import {
  findSettingsIssues,
  type SettingsIssue,
} from "@/lib/green-api/settings"
import type { InstanceState } from "@/lib/green-api/types"

export type VerifyResult = {
  state: InstanceState
  issues: SettingsIssue[]
  messenger: MessengerType
}

/**
 * Checks entered credentials: a wrong id or token fails here with a
 * GreenApiError. A valid but unauthorized or misconfigured instance still
 * logs in — the chat explains what to fix. The settings also tell MAX from
 * WhatsApp; an instance of another messenger is rejected.
 */
export async function verifyCredentials(
  client: Pick<GreenApiClient, "getStateInstance" | "getSettings">,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  // Sequential: a wrong id or token fails on the first call.
  const state = await client.getStateInstance(signal)
  const settings = await client.getSettings(signal)
  const messenger = detectMessenger(settings.typeInstance)
  if (!messenger) {
    throw new GreenApiError("unsupported-instance", {
      detail: settings.typeInstance,
    })
  }
  return { state, issues: findSettingsIssues(settings), messenger }
}
