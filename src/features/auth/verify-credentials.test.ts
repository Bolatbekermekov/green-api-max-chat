import { describe, expect, it, vi } from "vitest"

import { verifyCredentials } from "@/features/auth/verify-credentials"
import { createGreenApiClient } from "@/lib/green-api/client"

const creds = {
  idInstance: "3100000001",
  apiTokenInstance: "tok",
  apiUrl: "https://3100.api.green-api.com",
}

const settings = {
  webhookUrl: "",
  incomingWebhook: "yes",
  outgoingWebhook: "yes",
  outgoingMessageWebhook: "yes",
  outgoingAPIMessageWebhook: "yes",
  stateWebhook: "yes",
  typeInstance: "v3",
}

function clientWith(...responses: Response[]) {
  const fetchImpl = vi.fn<typeof fetch>()
  for (const response of responses) fetchImpl.mockResolvedValueOnce(response)
  return { client: createGreenApiClient(creds, fetchImpl), fetchImpl }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

describe("verifyCredentials", () => {
  it("returns state and settings issues", async () => {
    const { client, fetchImpl } = clientWith(
      json({ stateInstance: "authorized" }),
      json({ ...settings, incomingWebhook: "no" }),
    )

    await expect(verifyCredentials(client)).resolves.toEqual({
      state: "authorized",
      messenger: "max",
      issues: [
        {
          key: "incomingWebhook",
          severity: "error",
          message: "Выключены уведомления о входящих сообщениях",
        },
      ],
    })
    const methods = fetchImpl.mock.calls.map(([url]) =>
      String(url).split("/").at(-2),
    )
    expect(methods).toEqual(["getStateInstance", "getSettings"])
  })

  it("still reports issues when the instance is not authorized", async () => {
    const { client } = clientWith(
      json({ stateInstance: "notAuthorized" }),
      json({ ...settings, webhookUrl: "https://example.com/hook" }),
    )

    const result = await verifyCredentials(client)
    expect(result.state).toBe("notAuthorized")
    expect(result.issues.map((issue) => issue.key)).toEqual(["webhookUrl"])
  })

  it("recognises a WhatsApp instance", async () => {
    const { client } = clientWith(
      json({ stateInstance: "authorized" }),
      json({ ...settings, typeInstance: "whatsapp" }),
    )

    await expect(verifyCredentials(client)).resolves.toMatchObject({
      messenger: "whatsapp",
      issues: [],
    })
  })

  it("rejects an instance of another messenger", async () => {
    const { client } = clientWith(
      json({ stateInstance: "authorized" }),
      json({ ...settings, typeInstance: "telegram" }),
    )

    await expect(verifyCredentials(client)).rejects.toMatchObject({
      code: "unsupported-instance",
      detail: "telegram",
    })
  })

  it("rejects with unauthorized on a wrong token", async () => {
    const { client } = clientWith(new Response("", { status: 401 }))

    await expect(verifyCredentials(client)).rejects.toMatchObject({
      code: "unauthorized",
    })
  })
})
