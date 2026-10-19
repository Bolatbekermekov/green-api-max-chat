import { normalizeApiUrl } from "@/lib/green-api/api-url"
import { errorFromResponse, GreenApiError } from "@/lib/green-api/errors"
import type {
  CheckAccountResult,
  Credentials,
  InstanceSettings,
  InstanceState,
  QueuedNotification,
  SendMessageResult,
} from "@/lib/green-api/types"

export type GreenApiClient = {
  getStateInstance(signal?: AbortSignal): Promise<InstanceState>
  getSettings(signal?: AbortSignal): Promise<InstanceSettings>
  setSettings(
    patch: Partial<InstanceSettings>,
    signal?: AbortSignal,
  ): Promise<void>
  checkAccount(
    phoneDigits: string,
    signal?: AbortSignal,
  ): Promise<CheckAccountResult>
  sendMessage(
    chatId: string,
    message: string,
    signal?: AbortSignal,
  ): Promise<SendMessageResult>
  receiveNotification(
    receiveTimeoutSec: number,
    signal?: AbortSignal,
  ): Promise<QueuedNotification | null>
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<void>
}

type RequestOptions = {
  body?: unknown
  query?: Record<string, string>
  pathSuffix?: string
  signal?: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function invalidResponse(): GreenApiError {
  return new GreenApiError("invalid-response")
}

/**
 * Talks to GREEN-API straight from the browser (the API allows any origin).
 * `fetchImpl` is injectable for tests; the default wrapper keeps `fetch`
 * bound to the global object.
 */
export function createGreenApiClient(
  credentials: Credentials,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): GreenApiClient {
  const instanceUrl = `${normalizeApiUrl(credentials.apiUrl)}/waInstance${credentials.idInstance}`
  const token = encodeURIComponent(credentials.apiTokenInstance)

  async function request(
    httpMethod: "GET" | "POST" | "DELETE",
    apiMethod: string,
    { body, query, pathSuffix = "", signal }: RequestOptions = {},
  ): Promise<unknown> {
    let url = `${instanceUrl}/${apiMethod}/${token}${pathSuffix}`
    if (query) url += `?${new URLSearchParams(query)}`

    let response: Response
    let text: string
    try {
      response = await fetchImpl(url, {
        method: httpMethod,
        headers:
          body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })
      text = await response.text()
    } catch (error) {
      if (signal?.aborted) throw error
      throw new GreenApiError("network", {
        detail: error instanceof Error ? error.message : undefined,
      })
    }

    if (!response.ok) throw errorFromResponse(response.status, text)

    const trimmed = text.trim()
    if (trimmed === "" || trimmed === "null") return null

    let data: unknown
    try {
      data = JSON.parse(trimmed)
    } catch {
      throw invalidResponse()
    }
    // Some methods report failures as {"status": false, "reason": "..."}.
    if (
      isRecord(data) &&
      data.status === false &&
      typeof data.reason === "string"
    ) {
      throw errorFromResponse(response.status, data.reason)
    }
    return data
  }

  return {
    async getStateInstance(signal) {
      const data = await request("GET", "getStateInstance", { signal })
      if (!isRecord(data) || typeof data.stateInstance !== "string") {
        throw invalidResponse()
      }
      return data.stateInstance
    },

    async getSettings(signal) {
      const data = await request("GET", "getSettings", { signal })
      if (!isRecord(data)) throw invalidResponse()
      return data as InstanceSettings
    },

    async setSettings(patch, signal) {
      await request("POST", "setSettings", { body: patch, signal })
    },

    async checkAccount(phoneDigits, signal) {
      const data = await request("POST", "checkAccount", {
        body: { phoneNumber: Number(phoneDigits) },
        signal,
      })
      if (
        !isRecord(data) ||
        typeof data.exist !== "boolean" ||
        typeof data.chatId !== "string"
      ) {
        throw invalidResponse()
      }
      return { exist: data.exist, chatId: data.chatId }
    },

    async sendMessage(chatId, message, signal) {
      const data = await request("POST", "sendMessage", {
        body: { chatId, message },
        signal,
      })
      if (!isRecord(data) || typeof data.idMessage !== "string") {
        throw invalidResponse()
      }
      return { idMessage: data.idMessage }
    },

    async receiveNotification(receiveTimeoutSec, signal) {
      const data = await request("GET", "receiveNotification", {
        query: { receiveTimeout: String(receiveTimeoutSec) },
        signal,
      })
      if (data === null) return null
      if (!isRecord(data) || typeof data.receiptId !== "number") {
        throw invalidResponse()
      }
      return { receiptId: data.receiptId, body: data.body }
    },

    async deleteNotification(receiptId, signal) {
      // {"result": false} only means it was already deleted — nothing to do.
      await request("DELETE", "deleteNotification", {
        pathSuffix: `/${receiptId}`,
        signal,
      })
    },
  }
}
