function defaultLocks(): LockManager | null {
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks
    : null
}

/**
 * Runs `task` while holding a Web Lock, so only one browser tab consumes the
 * instance's notification queue: two consumers would each delete what the
 * other never showed. Other tabs wait for the lock (and take over if the
 * polling tab closes). Without Web Locks the task just runs.
 */
export async function withPollingLock(
  name: string,
  signal: AbortSignal,
  task: () => Promise<void>,
  locks: LockManager | null = defaultLocks(),
): Promise<void> {
  if (!locks) return task()
  try {
    await locks.request(name, { signal }, () => task())
  } catch (error) {
    if (signal.aborted) return
    throw error
  }
}
