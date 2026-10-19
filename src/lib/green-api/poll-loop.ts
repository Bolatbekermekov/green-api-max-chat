import type { GreenApiClient } from "@/lib/green-api/client"
import { GreenApiError, isFatalPollingError } from "@/lib/green-api/errors"
import {
  parseNotification,
  type ChatEvent,
} from "@/lib/green-api/notifications"

/** How long one ReceiveNotification call waits for a notification (5–60 s). */
export const DEFAULT_RECEIVE_TIMEOUT_SEC = 20

const MAX_RETRY_DELAY_MS = 30_000

function defaultRetryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

export type PollLoopOptions = {
  client: Pick<GreenApiClient, "receiveNotification" | "deleteNotification">
  signal: AbortSignal
  onEvent: (event: ChatEvent) => void
  onFatalError: (error: GreenApiError) => void
  onConnectionChange?: (online: boolean) => void
  onError?: (error: unknown) => void
  receiveTimeoutSec?: number
  retryDelayMs?: (attempt: number) => number
  sleep?: typeof abortableSleep
}

export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener("abort", done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done, { once: true })
  })
}

/**
 * Consumes the instance's notification queue (GREEN-API "HTTP API"
 * technology) until `signal` aborts: one request at a time, every received
 * notification is handled and then deleted — deleting is what lets the queue
 * hand out the next one. Delivery is at-least-once (a failed delete brings the
 * same notification back), so `onEvent` must be idempotent.
 */
export async function runNotificationLoop({
  client,
  signal,
  onEvent,
  onFatalError,
  onConnectionChange,
  onError,
  receiveTimeoutSec = DEFAULT_RECEIVE_TIMEOUT_SEC,
  retryDelayMs = defaultRetryDelay,
  sleep = abortableSleep,
}: PollLoopOptions): Promise<void> {
  let failures = 0

  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification(
        receiveTimeoutSec,
        signal,
      )
      if (failures > 0) {
        failures = 0
        onConnectionChange?.(true)
      }
      if (!notification) continue

      try {
        const event = parseNotification(notification.body)
        if (event) onEvent(event)
      } catch (error) {
        onError?.(error)
      } finally {
        await client.deleteNotification(notification.receiptId, signal)
      }
    } catch (error) {
      if (signal.aborted) return
      if (error instanceof GreenApiError && isFatalPollingError(error)) {
        onFatalError(error)
        return
      }
      onError?.(error)
      if (failures === 0) onConnectionChange?.(false)
      await sleep(retryDelayMs(failures), signal)
      failures += 1
    }
  }
}
