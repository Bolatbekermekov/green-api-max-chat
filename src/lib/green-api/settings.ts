import type { InstanceSettings } from "@/lib/green-api/types"

export type SettingsIssue = {
  key:
    | "webhookUrl"
    | "incomingWebhook"
    | "outgoingWebhook"
    | "outgoingMessageWebhook"
    | "typeInstance"
  severity: "error" | "warning"
  message: string
}

/**
 * What the chat needs from an instance: notifications go to the HTTP API
 * queue (no webhook URL) and cover incoming messages, delivery statuses,
 * messages sent from the phone or the API, and instance state changes.
 * A new instance has all of them switched off.
 */
export const RECOMMENDED_SETTINGS: Partial<InstanceSettings> = {
  webhookUrl: "",
  incomingWebhook: "yes",
  outgoingWebhook: "yes",
  outgoingMessageWebhook: "yes",
  outgoingAPIMessageWebhook: "yes",
  stateWebhook: "yes",
}

export function findSettingsIssues(
  settings: InstanceSettings,
): SettingsIssue[] {
  const issues: SettingsIssue[] = []

  if (settings.webhookUrl) {
    issues.push({
      key: "webhookUrl",
      severity: "error",
      message:
        "Указан webhookUrl — пока он задан, сообщения через HTTP API не приходят",
    })
  }
  if (settings.incomingWebhook !== "yes") {
    issues.push({
      key: "incomingWebhook",
      severity: "error",
      message: "Выключены уведомления о входящих сообщениях",
    })
  }
  if (settings.outgoingWebhook !== "yes") {
    issues.push({
      key: "outgoingWebhook",
      severity: "warning",
      message: "Выключены статусы доставки и прочтения",
    })
  }
  if (settings.outgoingMessageWebhook !== "yes") {
    issues.push({
      key: "outgoingMessageWebhook",
      severity: "warning",
      message: "Не будут видны сообщения, отправленные с телефона",
    })
  }
  if (settings.typeInstance && settings.typeInstance !== "v3") {
    issues.push({
      key: "typeInstance",
      severity: "warning",
      message: `Это не MAX-инстанс (typeInstance: ${settings.typeInstance})`,
    })
  }
  return issues
}
