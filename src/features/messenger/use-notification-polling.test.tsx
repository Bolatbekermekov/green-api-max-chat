import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GreenApiProvider } from "@/components/green-api-provider"
import { useNotificationPolling } from "@/features/messenger/use-notification-polling"
import type { GreenApiClient } from "@/lib/green-api/client"
import { GreenApiError } from "@/lib/green-api/errors"
import { incomingTextBody, stateBody } from "@/lib/green-api/fixtures"
import { initialChatState, useChatStore } from "@/store/chat-store"
import { initialSessionState, useSessionStore } from "@/store/session-store"
import { fakeGreenApiClient } from "@/test/fake-green-api-client"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const credentials = {
  idInstance: "3100000001",
  apiTokenInstance: "tok",
  apiUrl: "https://3100.api.green-api.com",
}

/** Serves the script, then long-polls until the hook aborts the request. */
function scriptedClient(steps: Array<object | Error>) {
  const queue = [...steps]
  let receiptId = 0
  const signals: AbortSignal[] = []
  const receiveNotification = vi.fn(
    (_timeout: number, signal?: AbortSignal) => {
      if (signal) signals.push(signal)
      const step = queue.shift()
      if (step instanceof Error) return Promise.reject(step)
      if (step) return Promise.resolve({ receiptId: ++receiptId, body: step })
      return new Promise<never>((_, reject) =>
        signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      )
    },
  ) as GreenApiClient["receiveNotification"]
  const client = fakeGreenApiClient({
    receiveNotification,
    deleteNotification: vi.fn(async () => {}),
  })
  return { client, signals }
}

function renderPolling(client: GreenApiClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <GreenApiProvider client={client}>{children}</GreenApiProvider>
  )
  return renderHook(() => useNotificationPolling(), { wrapper })
}

beforeEach(() => {
  vi.mocked(toast.error).mockClear()
  useChatStore.setState(initialChatState)
  useSessionStore.setState({
    ...initialSessionState,
    credentials,
    instanceState: "authorized",
  })
})

describe("useNotificationPolling", () => {
  it("applies incoming messages to the chat store", async () => {
    const { client } = scriptedClient([
      incomingTextBody({
        chatId: "10000000",
        idMessage: "A1",
        text: "Ответ из MAX",
      }),
    ])

    const { unmount } = renderPolling(client)

    await waitFor(() =>
      expect(useChatStore.getState().messages["10000000"]?.[0]).toMatchObject({
        text: "Ответ из MAX",
        direction: "in",
      }),
    )
    expect(client.deleteNotification).toHaveBeenCalledWith(
      1,
      expect.any(AbortSignal),
    )
    unmount()
  })

  it("updates instance state from state events", async () => {
    const { client } = scriptedClient([stateBody("notAuthorized")])

    const { unmount } = renderPolling(client)

    await waitFor(() =>
      expect(useSessionStore.getState().instanceState).toBe("notAuthorized"),
    )
    unmount()
  })

  it("logs out on unauthorized", async () => {
    const { client } = scriptedClient([
      new GreenApiError("unauthorized", { status: 401 }),
    ])

    renderPolling(client)

    await waitFor(() =>
      expect(useSessionStore.getState().credentials).toBeNull(),
    )
    expect(toast.error).toHaveBeenCalledWith("Неверный apiTokenInstance", {
      id: "session-ended",
    })
  })

  it("reports a set webhookUrl as a settings problem and keeps the session", async () => {
    const { client } = scriptedClient([new GreenApiError("webhook-url-set")])

    renderPolling(client)

    await waitFor(() =>
      expect(
        useSessionStore.getState().settingsIssues.map((issue) => issue.key),
      ).toEqual(["webhookUrl"]),
    )
    expect(useSessionStore.getState().credentials).toEqual(credentials)
  })

  it("stops polling when unmounted", async () => {
    const { client, signals } = scriptedClient([])

    const { unmount } = renderPolling(client)
    await waitFor(() => expect(signals).toHaveLength(1))
    unmount()

    expect(signals[0].aborted).toBe(true)
  })
})
