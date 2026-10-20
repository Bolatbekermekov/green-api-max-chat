import type { Page, Route } from "@playwright/test"

import type { MessengerType } from "../src/lib/green-api/messenger"

export const TEST_CREDENTIALS = {
  idInstance: "3100000001",
  apiTokenInstance: "test-token",
}

export const WHATSAPP_CREDENTIALS = {
  idInstance: "1101000001",
  apiTokenInstance: "test-token",
}

const DEFAULT_SETTINGS = {
  webhookUrl: "",
  incomingWebhook: "yes",
  outgoingWebhook: "yes",
  outgoingMessageWebhook: "yes",
  outgoingAPIMessageWebhook: "yes",
  stateWebhook: "yes",
  typeInstance: "v3",
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
}

type MockOptions = {
  /** The instance type getSettings reports; MAX by default. */
  messenger?: MessengerType
  state?: string
  settings?: Partial<typeof DEFAULT_SETTINGS>
  /** MAX: phone digits → chatId that CheckAccount should find. */
  accounts?: Record<string, string>
  /** WhatsApp: phone digits that CheckWhatsapp should find. */
  whatsappNumbers?: string[]
  validToken?: string
}

/**
 * An in-memory GREEN-API for the browser: answers every *.green-api.com
 * request (so tests never reach the real service) and keeps a notification
 * queue with the real semantics — the head stays until it is deleted.
 */
export async function mockGreenApi(page: Page, options: MockOptions = {}) {
  const queue: Array<{ receiptId: number; body: object }> = []
  const sent: Array<{ chatId: string; message: string }> = []
  const settingsUpdates: object[] = []
  let lastReceiptId = 0
  let lastMessageId = 0
  const validToken = options.validToken ?? TEST_CREDENTIALS.apiTokenInstance

  // The page may close while a long-poll is pending; ignore that.
  const reply = (route: Route, status: number, body?: unknown) =>
    route
      .fulfill({
        status,
        headers: { ...CORS, "content-type": "application/json" },
        body: body === undefined ? "" : JSON.stringify(body),
      })
      .catch(() => {})

  await page.route("https://*.green-api.com/**", async (route) => {
    const request = route.request()
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS }).catch(() => {})
    }

    const [, instance, method, token, extra] = new URL(
      request.url(),
    ).pathname.split("/")
    if (!instance?.startsWith("waInstance")) return reply(route, 404)
    if (token !== validToken) return reply(route, 401)

    switch (method) {
      case "getStateInstance":
        return reply(route, 200, {
          stateInstance: options.state ?? "authorized",
        })
      case "getSettings":
        return reply(route, 200, {
          ...DEFAULT_SETTINGS,
          typeInstance: options.messenger === "whatsapp" ? "whatsapp" : "v3",
          ...options.settings,
        })
      case "setSettings":
        settingsUpdates.push(request.postDataJSON())
        return reply(route, 200, { saveSettings: true })
      case "checkAccount": {
        const phone = String(request.postDataJSON().phoneNumber)
        const chatId = options.accounts?.[phone]
        return reply(route, 200, {
          exist: Boolean(chatId),
          chatId: chatId ?? "",
          fromCache: false,
        })
      }
      case "checkWhatsapp": {
        const phone = String(request.postDataJSON().chatId).replace(
          /@c\.us$/,
          "",
        )
        const exists = Boolean(options.whatsappNumbers?.includes(phone))
        return reply(route, 200, {
          existsWhatsapp: exists,
          chatId: exists ? "123456789012345@lid" : "",
          username: "",
          phoneNumber: exists ? `${phone}@c.us` : "",
          fromCache: false,
        })
      }
      case "sendMessage":
        sent.push(request.postDataJSON())
        return reply(route, 200, { idMessage: `MSG-${++lastMessageId}` })
      case "receiveNotification":
        if (queue.length === 0) await new Promise((r) => setTimeout(r, 300))
        return reply(route, 200, queue[0] ?? null)
      case "deleteNotification": {
        const index = queue.findIndex((n) => n.receiptId === Number(extra))
        if (index >= 0) queue.splice(index, 1)
        return reply(route, 200, { result: index >= 0 })
      }
      default:
        return reply(route, 404)
    }
  })

  return {
    push(body: object) {
      queue.push({ receiptId: ++lastReceiptId, body })
    },
    sent,
    settingsUpdates,
  }
}
