import { describe, expect, it, vi } from "vitest"

import { createGreenApiClient } from "@/lib/green-api/client"
import { GreenApiError } from "@/lib/green-api/errors"
import type { Credentials } from "@/lib/green-api/types"

const creds: Credentials = {
  idInstance: "3100000001",
  apiTokenInstance: "tok",
  apiUrl: "https://3100.api.green-api.com",
}
const BASE = "https://3100.api.green-api.com/waInstance3100000001"

function fakeFetch(...results: Array<Response | Error>) {
  const fetchImpl = vi.fn<typeof fetch>()
  for (const result of results) {
    if (result instanceof Error) fetchImpl.mockRejectedValueOnce(result)
    else fetchImpl.mockResolvedValueOnce(result)
  }
  return fetchImpl
}

const text = (body: string, status = 200) => new Response(body, { status })
const json = (body: unknown, status = 200) => text(JSON.stringify(body), status)

function lastCall(fetchImpl: ReturnType<typeof fakeFetch>) {
  const [url, init] = fetchImpl.mock.calls.at(-1)!
  return { url: String(url), init: init ?? {} }
}

describe("createGreenApiClient", () => {
  it("builds method URLs without a double slash", async () => {
    const fetchImpl = fakeFetch(json({ stateInstance: "authorized" }))
    const client = createGreenApiClient(
      { ...creds, apiUrl: `${creds.apiUrl}/` },
      fetchImpl,
    )

    await expect(client.getStateInstance()).resolves.toBe("authorized")
    expect(lastCall(fetchImpl).url).toBe(`${BASE}/getStateInstance/tok`)
    expect(lastCall(fetchImpl).init.method).toBe("GET")
  })

  it("sendMessage posts JSON and returns idMessage", async () => {
    const fetchImpl = fakeFetch(json({ idMessage: "1763115112345" }))
    const client = createGreenApiClient(creds, fetchImpl)

    await expect(client.sendMessage("10000000", "Привет")).resolves.toEqual({
      idMessage: "1763115112345",
    })
    const { url, init } = lastCall(fetchImpl)
    expect(url).toBe(`${BASE}/sendMessage/tok`)
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    )
    expect(init.body).toBe('{"chatId":"10000000","message":"Привет"}')
  })

  it("checkAccount sends phoneNumber as a number", async () => {
    const fetchImpl = fakeFetch(
      json({ exist: true, chatId: "10000000", fromCache: false }),
    )
    const client = createGreenApiClient(creds, fetchImpl)

    await expect(client.checkAccount("79991234567")).resolves.toEqual({
      exist: true,
      chatId: "10000000",
    })
    expect(lastCall(fetchImpl).url).toBe(`${BASE}/checkAccount/tok`)
    expect(lastCall(fetchImpl).init.body).toBe('{"phoneNumber":79991234567}')
  })

  it("treats a {status:false} body as an error even with HTTP 200", async () => {
    const fetchImpl = fakeFetch(
      json({ status: false, reason: "instance is starting or not authorized" }),
    )
    const client = createGreenApiClient(creds, fetchImpl)

    await expect(client.checkAccount("79991234567")).rejects.toMatchObject({
      code: "not-authorized",
    })
  })

  it("getSettings and setSettings use the settings methods", async () => {
    const settings = {
      webhookUrl: "",
      incomingWebhook: "yes",
      outgoingWebhook: "yes",
      outgoingMessageWebhook: "no",
      outgoingAPIMessageWebhook: "yes",
      stateWebhook: "yes",
      typeInstance: "v3",
    }
    const fetchImpl = fakeFetch(json(settings), json({ saveSettings: true }))
    const client = createGreenApiClient(creds, fetchImpl)

    await expect(client.getSettings()).resolves.toEqual(settings)
    expect(lastCall(fetchImpl).url).toBe(`${BASE}/getSettings/tok`)

    await client.setSettings({ incomingWebhook: "yes", webhookUrl: "" })
    expect(lastCall(fetchImpl).url).toBe(`${BASE}/setSettings/tok`)
    expect(lastCall(fetchImpl).init.method).toBe("POST")
    expect(lastCall(fetchImpl).init.body).toBe(
      '{"incomingWebhook":"yes","webhookUrl":""}',
    )
  })

  it("receiveNotification passes receiveTimeout and the abort signal", async () => {
    const body = { typeWebhook: "incomingMessageReceived" }
    const fetchImpl = fakeFetch(json({ receiptId: 1234567, body }))
    const client = createGreenApiClient(creds, fetchImpl)
    const controller = new AbortController()

    await expect(
      client.receiveNotification(20, controller.signal),
    ).resolves.toEqual({ receiptId: 1234567, body })
    expect(lastCall(fetchImpl).url).toBe(
      `${BASE}/receiveNotification/tok?receiveTimeout=20`,
    )
    expect(lastCall(fetchImpl).init.signal).toBe(controller.signal)
  })

  it.each(["", "null", "  null\n"])(
    "receiveNotification returns null for an empty queue body %j",
    async (body) => {
      const client = createGreenApiClient(creds, fakeFetch(text(body)))
      await expect(client.receiveNotification(20)).resolves.toBeNull()
    },
  )

  it("deleteNotification uses DELETE with the receiptId", async () => {
    const fetchImpl = fakeFetch(json({ result: true }))
    const client = createGreenApiClient(creds, fetchImpl)

    await client.deleteNotification(1234567)
    expect(lastCall(fetchImpl).url).toBe(
      `${BASE}/deleteNotification/tok/1234567`,
    )
    expect(lastCall(fetchImpl).init.method).toBe("DELETE")
  })

  it("does not fail when the notification was already deleted", async () => {
    const client = createGreenApiClient(
      creds,
      fakeFetch(json({ result: false, reason: "" })),
    )
    await expect(client.deleteNotification(1)).resolves.toBeUndefined()
  })

  it.each([
    [401, "", "unauthorized"],
    [403, "", "forbidden"],
    [404, "", "not-found"],
    [429, "", "rate-limited"],
    [466, '{"invokeStatus":{"status":"QUOTE_EXCEEDED"}}', "quota-exceeded"],
    [469, "", "check-limited"],
    [502, "", "server"],
    [
      400,
      "Message cannot be received because custom webhook url is set. Go to cabinet, clear webhook url for instance: 3100000001 and wait for about 1 minute for another attempt",
      "webhook-url-set",
    ],
    [
      400,
      '{"message":"instance is starting or not authorized"}',
      "not-authorized",
    ],
    [400, "instance in starting process try later", "instance-starting"],
    [400, '{"message":"Validation failed"}', "bad-request"],
  ])("maps HTTP %i %j to %s", async (status, body, code) => {
    const client = createGreenApiClient(creds, fakeFetch(text(body, status)))

    const error = await client.getStateInstance().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GreenApiError)
    expect(error).toMatchObject({ code, status })
  })

  it("keeps the server's reason for rejected requests", async () => {
    const client = createGreenApiClient(
      creds,
      fakeFetch(text('{"message":"Validation failed"}', 400)),
    )
    await expect(client.sendMessage("10000000", "x")).rejects.toMatchObject({
      code: "bad-request",
      detail: "Validation failed",
    })
  })

  it("maps a failed fetch to network", async () => {
    const client = createGreenApiClient(
      creds,
      fakeFetch(new TypeError("Failed to fetch")),
    )
    await expect(client.getStateInstance()).rejects.toMatchObject({
      code: "network",
    })
  })

  it("rethrows AbortError untouched when the signal is aborted", async () => {
    const controller = new AbortController()
    const abortError = new DOMException("Aborted", "AbortError")
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      controller.abort()
      throw abortError
    })
    const client = createGreenApiClient(creds, fetchImpl)

    await expect(
      client.receiveNotification(20, controller.signal),
    ).rejects.toBe(abortError)
  })

  it.each([
    ["unparseable JSON", text("<html>oops</html>")],
    ["an unexpected shape", json({ unexpected: true })],
  ])("maps %s to invalid-response", async (_, response) => {
    const client = createGreenApiClient(creds, fakeFetch(response))
    await expect(client.getStateInstance()).rejects.toMatchObject({
      code: "invalid-response",
    })
  })
})
