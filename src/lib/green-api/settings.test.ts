import { describe, expect, it } from "vitest"

import { findSettingsIssues } from "@/lib/green-api/settings"
import type { InstanceSettings } from "@/lib/green-api/types"

const good: InstanceSettings = {
  webhookUrl: "",
  incomingWebhook: "yes",
  outgoingWebhook: "yes",
  outgoingMessageWebhook: "yes",
  outgoingAPIMessageWebhook: "yes",
  stateWebhook: "yes",
  typeInstance: "v3",
}

describe("findSettingsIssues", () => {
  it("returns no issues for recommended settings", () => {
    expect(findSettingsIssues(good)).toEqual([])
  })

  it("flags a non-empty webhookUrl as an error", () => {
    expect(
      findSettingsIssues({ ...good, webhookUrl: "https://example.com/hook" }),
    ).toEqual([
      {
        key: "webhookUrl",
        severity: "error",
        message:
          "Указан webhookUrl — пока он задан, сообщения через HTTP API не приходят",
      },
    ])
  })

  it("flags disabled incoming notifications as an error", () => {
    expect(findSettingsIssues({ ...good, incomingWebhook: "no" })).toEqual([
      {
        key: "incomingWebhook",
        severity: "error",
        message: "Выключены уведомления о входящих сообщениях",
      },
    ])
  })

  it("flags disabled statuses as a warning", () => {
    expect(findSettingsIssues({ ...good, outgoingWebhook: "no" })).toEqual([
      {
        key: "outgoingWebhook",
        severity: "warning",
        message: "Выключены статусы доставки и прочтения",
      },
    ])
  })

  it("flags disabled phone echoes as a warning", () => {
    expect(
      findSettingsIssues({ ...good, outgoingMessageWebhook: "no" }),
    ).toEqual([
      {
        key: "outgoingMessageWebhook",
        severity: "warning",
        message: "Не будут видны сообщения, отправленные с телефона",
      },
    ])
  })

  it("warns when the instance is not MAX", () => {
    expect(findSettingsIssues({ ...good, typeInstance: "whatsapp" })).toEqual([
      {
        key: "typeInstance",
        severity: "warning",
        message: "Это не MAX-инстанс (typeInstance: whatsapp)",
      },
    ])
  })

  it("treats missing switches as off", () => {
    const partial = { webhookUrl: "" } as InstanceSettings
    expect(findSettingsIssues(partial).map((issue) => issue.key)).toEqual([
      "incomingWebhook",
      "outgoingWebhook",
      "outgoingMessageWebhook",
    ])
  })
})
