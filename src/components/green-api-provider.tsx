"use client"

import { createContext, use, type ReactNode } from "react"

import type { GreenApiClient } from "@/lib/green-api/client"

const GreenApiContext = createContext<GreenApiClient | null>(null)

export function GreenApiProvider({
  client,
  children,
}: {
  client: GreenApiClient
  children: ReactNode
}) {
  return <GreenApiContext value={client}>{children}</GreenApiContext>
}

export function useGreenApi(): GreenApiClient {
  const client = use(GreenApiContext)
  if (!client) {
    throw new Error("useGreenApi must be used inside GreenApiProvider")
  }
  return client
}
