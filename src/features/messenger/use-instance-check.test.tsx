import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GreenApiProvider } from "@/components/green-api-provider"
import { useInstanceCheck } from "@/features/messenger/use-instance-check"
import type { GreenApiClient } from "@/lib/green-api/client"
import { initialSessionState, useSessionStore } from "@/store/session-store"
import { fakeGreenApiClient } from "@/test/fake-green-api-client"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const credentials = {
  idInstance: "3100000001",
  apiTokenInstance: "tok",
  apiUrl: "https://3100.api.green-api.com",
}

function renderCheck(client: GreenApiClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <GreenApiProvider client={client}>{children}</GreenApiProvider>
  )
  return renderHook(() => useInstanceCheck(), { wrapper })
}

beforeEach(() => {
  useSessionStore.setState({ ...initialSessionState, credentials })
})

describe("useInstanceCheck", () => {
  it("refreshes instance state and settings after a page reload", async () => {
    const client = fakeGreenApiClient({
      getStateInstance: vi.fn(async () => "authorized"),
      getSettings: vi.fn(async () => ({
        webhookUrl: "",
        incomingWebhook: "no" as const,
        outgoingWebhook: "yes" as const,
        outgoingMessageWebhook: "yes" as const,
        outgoingAPIMessageWebhook: "yes" as const,
        stateWebhook: "yes" as const,
      })),
    })

    renderCheck(client)

    await waitFor(() =>
      expect(useSessionStore.getState().instanceState).toBe("authorized"),
    )
    expect(
      useSessionStore.getState().settingsIssues.map((issue) => issue.key),
    ).toEqual(["incomingWebhook"])
  })

  it("updates the messenger after a page reload", async () => {
    useSessionStore.setState({ messenger: null })
    const client = fakeGreenApiClient({
      getStateInstance: vi.fn(async () => "authorized"),
      getSettings: vi.fn(async () => ({
        webhookUrl: "",
        incomingWebhook: "yes" as const,
        outgoingWebhook: "yes" as const,
        outgoingMessageWebhook: "yes" as const,
        outgoingAPIMessageWebhook: "yes" as const,
        stateWebhook: "yes" as const,
        typeInstance: "whatsapp",
      })),
    })

    renderCheck(client)

    await waitFor(() =>
      expect(useSessionStore.getState().messenger).toBe("whatsapp"),
    )
  })

  it("skips the check right after login", () => {
    useSessionStore.setState({ instanceState: "authorized" })
    const client = fakeGreenApiClient()

    renderCheck(client)

    expect(client.getStateInstance).not.toHaveBeenCalled()
  })
})
