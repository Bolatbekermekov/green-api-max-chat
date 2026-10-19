import { describe, expect, it, vi } from "vitest"

import { withPollingLock } from "@/lib/polling-lock"

describe("withPollingLock", () => {
  it("runs the task under a named lock", async () => {
    const request = vi.fn(
      async (_name: string, _options: LockOptions, callback: () => unknown) =>
        callback(),
    )
    const locks = { request } as unknown as LockManager
    const task = vi.fn(async () => {})
    const { signal } = new AbortController()

    await withPollingLock("max-chat:poll:1", signal, task, locks)

    expect(request).toHaveBeenCalledWith(
      "max-chat:poll:1",
      { signal },
      expect.any(Function),
    )
    expect(task).toHaveBeenCalledOnce()
  })

  it("runs the task directly without the Web Locks API", async () => {
    const task = vi.fn(async () => {})

    await withPollingLock(
      "max-chat:poll:1",
      new AbortController().signal,
      task,
      null,
    )

    expect(task).toHaveBeenCalledOnce()
  })

  it("resolves quietly when aborted while waiting for the lock", async () => {
    const locks = {
      request: (_name: string, options: LockOptions) =>
        new Promise((_, reject) => {
          options.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          )
        }),
    } as unknown as LockManager
    const task = vi.fn(async () => {})
    const controller = new AbortController()

    const waiting = withPollingLock(
      "max-chat:poll:1",
      controller.signal,
      task,
      locks,
    )
    controller.abort()

    await expect(waiting).resolves.toBeUndefined()
    expect(task).not.toHaveBeenCalled()
  })
})
