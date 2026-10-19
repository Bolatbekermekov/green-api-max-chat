"use client"

import { useEffect, useMemo, useState } from "react"

import { AppLogo } from "@/components/app-logo"
import { GreenApiProvider } from "@/components/green-api-provider"
import { LoginScreen } from "@/features/auth/login-screen"
import { Messenger } from "@/features/messenger/messenger"
import { createGreenApiClient } from "@/lib/green-api/client"
import { useChatStore } from "@/store/chat-store"
import { useSessionStore } from "@/store/session-store"

/**
 * Client-only root: the session and chats live in localStorage, so nothing
 * user-specific is rendered until both stores are read back.
 */
export function ChatApp() {
  const [hydrated, setHydrated] = useState(false)
  const credentials = useSessionStore((state) => state.credentials)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      useSessionStore.persist.rehydrate(),
      useChatStore.persist.rehydrate(),
    ]).then(() => {
      if (cancelled) return
      const restored = useSessionStore.getState().credentials
      if (restored) useChatStore.getState().bindInstance(restored.idInstance)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const client = useMemo(
    () => (credentials ? createGreenApiClient(credentials) : null),
    [credentials],
  )

  if (!hydrated) return <Splash />
  if (!client) return <LoginScreen />
  return (
    <GreenApiProvider client={client}>
      <Messenger />
    </GreenApiProvider>
  )
}

function Splash() {
  return (
    <div
      role="status"
      className="flex h-dvh items-center justify-center bg-surface"
    >
      <AppLogo className="size-16 motion-safe:animate-pulse" />
      <span className="sr-only">Загрузка…</span>
    </div>
  )
}
