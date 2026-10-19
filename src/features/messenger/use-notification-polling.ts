"use client"

import { useEffect } from "react"
import { toast } from "sonner"

import { useGreenApi } from "@/components/green-api-provider"
import { describeError } from "@/lib/green-api/errors"
import { runNotificationLoop } from "@/lib/green-api/poll-loop"
import { WEBHOOK_URL_ISSUE } from "@/lib/green-api/settings"
import { withPollingLock } from "@/lib/polling-lock"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"

/**
 * Receives messages through GREEN-API's HTTP API for as long as the
 * messenger is open. Restarts when the client changes or after settings are
 * fixed (pollingEpoch); the cleanup aborts the pending request, which also
 * keeps React's development double-mount to a single loop.
 */
export function useNotificationPolling() {
  const client = useGreenApi()
  const idInstance = useSessionStore((state) => state.credentials?.idInstance)
  const pollingEpoch = useSessionStore((state) => state.pollingEpoch)

  useEffect(() => {
    if (!idInstance) return
    const controller = new AbortController()

    const poll = () =>
      runNotificationLoop({
        client,
        signal: controller.signal,
        onEvent(event) {
          if (event.type === "state") {
            useSessionStore.getState().setInstanceState(event.state)
          } else {
            useChatStore.getState().applyEvent(event)
          }
        },
        onConnectionChange(online) {
          useSessionStore
            .getState()
            .setConnection(online ? "online" : "reconnecting")
        },
        onFatalError(error) {
          const session = useSessionStore.getState()
          if (error.code === "webhook-url-set") {
            if (
              !session.settingsIssues.some(
                (issue) => issue.key === "webhookUrl",
              )
            ) {
              session.setSettingsIssues([
                ...session.settingsIssues,
                WEBHOOK_URL_ISSUE,
              ])
            }
            return
          }
          // One toast even when polling and the instance check both fail.
          toast.error(describeError(error), { id: "session-ended" })
          session.logout()
        },
        onError(error) {
          console.warn("[max-chat] notification polling:", error)
        },
      })

    withPollingLock(
      `max-chat:poll:${idInstance}`,
      controller.signal,
      poll,
    ).catch((error: unknown) =>
      console.error("[max-chat] polling stopped:", error),
    )
    return () => controller.abort()
  }, [client, idInstance, pollingEpoch])
}
