import { afterEach, describe, expect, it, vi } from "vitest"

import { GreenApiError } from "@/lib/green-api/errors"
import { incomingTextBody } from "@/lib/green-api/fixtures"
import type { ChatEvent } from "@/lib/green-api/notifications"
import {
  abortableSleep,
  runNotificationLoop,
  type PollLoopOptions,
} from "@/lib/green-api/poll-loop"
import type { QueuedNotification } from "@/lib/green-api/types"

type Step = QueuedNotification | null | Error

function notification(
  receiptId: number,
  idMessage: string,
): QueuedNotification {
  return {
    receiptId,
    body: incomingTextBody({ chatId: "10000000", idMessage, text: idMessage }),
  }
}

/**
 * A client that answers receiveNotification from a script. When the script
 * runs out it aborts, the way logging out aborts a pending request.
 */
function setup(steps: Step[], deleteFailures: Error[] = []) {
  const controller = new AbortController()
  const log: string[] = []
  const queue = [...steps]
  const failures = [...deleteFailures]

  const client: PollLoopOptions["client"] = {
    receiveNotification: vi.fn(async () => {
      log.push("receive")
      const step = queue.shift()
      if (step === undefined) {
        controller.abort()
        throw new DOMException("Aborted", "AbortError")
      }
      if (step instanceof Error) throw step
      return step
    }),
    deleteNotification: vi.fn(async (receiptId: number) => {
      log.push(`delete:${receiptId}`)
      const failure = failures.shift()
      if (failure) throw failure
    }),
  }
  const options = {
    client,
    signal: controller.signal,
    onEvent: vi.fn((event: ChatEvent) => {
      if (event.type === "message") log.push(`event:${event.idMessage}`)
    }),
    onFatalError: vi.fn(),
    onConnectionChange: vi.fn(),
    onError: vi.fn(),
    sleep: vi.fn(async () => {}),
  }
  return { options, client, log, controller }
}

describe("runNotificationLoop", () => {
  it("processes notifications in order and deletes each after handling it", async () => {
    const { options, log } = setup([
      notification(1, "A1"),
      notification(2, "A2"),
    ])

    await runNotificationLoop(options)

    expect(log).toEqual([
      "receive",
      "event:A1",
      "delete:1",
      "receive",
      "event:A2",
      "delete:2",
      "receive",
    ])
    expect(options.client.receiveNotification).toHaveBeenCalledWith(
      20,
      options.signal,
    )
  })

  it("keeps polling after an empty response", async () => {
    const { options, log } = setup([null, notification(1, "A1")])

    await runNotificationLoop(options)

    expect(log).toEqual([
      "receive",
      "receive",
      "event:A1",
      "delete:1",
      "receive",
    ])
  })

  it("deletes a notification even when the handler throws", async () => {
    const { options, log } = setup([
      notification(1, "A1"),
      notification(2, "A2"),
    ])
    const boom = new Error("handler bug")
    options.onEvent.mockImplementationOnce(() => {
      throw boom
    })

    await runNotificationLoop(options)

    expect(options.onError).toHaveBeenCalledWith(boom)
    expect(log).toEqual([
      "receive",
      "delete:1",
      "receive",
      "event:A2",
      "delete:2",
      "receive",
    ])
  })

  it("deletes notifications that are not chat events", async () => {
    const { options, log } = setup([
      { receiptId: 7, body: { typeWebhook: "quotaExceeded" } },
    ])

    await runNotificationLoop(options)

    expect(options.onEvent).not.toHaveBeenCalled()
    expect(log).toEqual(["receive", "delete:7", "receive"])
  })

  it("backs off after a network error and recovers", async () => {
    const { options } = setup([
      new GreenApiError("network"),
      notification(1, "A1"),
    ])

    await runNotificationLoop(options)

    expect(options.sleep).toHaveBeenCalledExactlyOnceWith(1000, options.signal)
    expect(options.onConnectionChange.mock.calls).toEqual([[false], [true]])
    expect(options.onEvent).toHaveBeenCalledOnce()
  })

  it("doubles the delay for consecutive errors and resets it after a success", async () => {
    const { options } = setup([
      new GreenApiError("server"),
      new GreenApiError("server"),
      null,
      new GreenApiError("network"),
    ])

    await runNotificationLoop(options)

    expect(options.sleep.mock.calls.map(([ms]) => ms)).toEqual([
      1000, 2000, 1000,
    ])
  })

  it("retries when delete fails, handling the redelivered notification again", async () => {
    const { options, log } = setup(
      [notification(1, "A1"), notification(1, "A1")],
      [new GreenApiError("network")],
    )

    await runNotificationLoop(options)

    expect(log).toEqual([
      "receive",
      "event:A1",
      "delete:1",
      "receive",
      "event:A1",
      "delete:1",
      "receive",
    ])
    expect(options.sleep).toHaveBeenCalledOnce()
  })

  it.each(["unauthorized", "webhook-url-set"] as const)(
    "stops on %s",
    async (code) => {
      const error = new GreenApiError(code)
      const { options } = setup([error, notification(1, "A1")])

      await runNotificationLoop(options)

      expect(options.onFatalError).toHaveBeenCalledExactlyOnceWith(error)
      expect(options.client.receiveNotification).toHaveBeenCalledOnce()
      expect(options.sleep).not.toHaveBeenCalled()
    },
  )

  it("returns quietly when aborted during receive", async () => {
    const { options } = setup([])

    await expect(runNotificationLoop(options)).resolves.toBeUndefined()

    expect(options.onFatalError).not.toHaveBeenCalled()
    expect(options.onError).not.toHaveBeenCalled()
    expect(options.onConnectionChange).not.toHaveBeenCalled()
  })
})

describe("abortableSleep", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("waits for the delay", async () => {
    vi.useFakeTimers()
    const resolved = vi.fn()
    abortableSleep(1000, new AbortController().signal).then(resolved)

    await vi.advanceTimersByTimeAsync(999)
    expect(resolved).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(resolved).toHaveBeenCalled()
  })

  it("resolves early when aborted", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const resolved = vi.fn()
    abortableSleep(30_000, controller.signal).then(resolved)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect(resolved).toHaveBeenCalled()
  })
})
