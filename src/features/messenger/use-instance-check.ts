"use client"

import { useEffect } from "react"
import { toast } from "sonner"

import { useGreenApi } from "@/components/green-api-provider"
import { verifyCredentials } from "@/features/auth/verify-credentials"
import { describeError, GreenApiError } from "@/lib/green-api/errors"
import { useSessionStore } from "@/store/session-store"

const CREDENTIAL_ERRORS = new Set(["unauthorized", "forbidden", "not-found"])

/**
 * Only credentials survive a page reload, so a restored session re-checks
 * the instance state and settings once. Right after login they are fresh.
 */
export function useInstanceCheck() {
  const client = useGreenApi()

  useEffect(() => {
    if (useSessionStore.getState().instanceState !== null) return
    const controller = new AbortController()

    verifyCredentials(client, controller.signal)
      .then(({ state, issues }) => {
        if (controller.signal.aborted) return
        const session = useSessionStore.getState()
        session.setInstanceState(state)
        session.setSettingsIssues(issues)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (
          error instanceof GreenApiError &&
          CREDENTIAL_ERRORS.has(error.code)
        ) {
          // One toast even when polling and the instance check both fail.
          toast.error(describeError(error), { id: "session-ended" })
          useSessionStore.getState().logout()
        }
        // Anything else (network, server) shows up through polling instead.
      })

    return () => controller.abort()
  }, [client])
}
