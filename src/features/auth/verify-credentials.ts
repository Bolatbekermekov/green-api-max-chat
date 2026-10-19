import type { GreenApiClient } from "@/lib/green-api/client"
import {
  findSettingsIssues,
  type SettingsIssue,
} from "@/lib/green-api/settings"
import type { InstanceState } from "@/lib/green-api/types"

export type VerifyResult = { state: InstanceState; issues: SettingsIssue[] }

/**
 * Checks entered credentials: a wrong id or token fails here with a
 * GreenApiError. A valid but unauthorized or misconfigured instance still
 * logs in — the chat explains what to fix.
 */
export async function verifyCredentials(
  client: Pick<GreenApiClient, "getStateInstance" | "getSettings">,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  // Sequential: a wrong id or token fails on the first call.
  const state = await client.getStateInstance(signal)
  const settings = await client.getSettings(signal)
  return { state, issues: findSettingsIssues(settings) }
}
