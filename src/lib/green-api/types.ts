export type Credentials = {
  idInstance: string
  apiTokenInstance: string
  /** Per-instance API host, e.g. "https://3100.api.green-api.com". */
  apiUrl: string
}

export type InstanceState =
  | "authorized"
  | "notAuthorized"
  | "blocked"
  | "starting"
  | "suspended"
  | "pendingPassword"
  /** WhatsApp, deprecated: replaced by "suspended". */
  | "yellowCard"
  | (string & {})

export type YesNo = "yes" | "no"

export type InstanceSettings = {
  /** Must be empty: notifications are not queued for the HTTP API otherwise. */
  webhookUrl: string
  incomingWebhook: YesNo
  /** Delivery statuses of sent messages. */
  outgoingWebhook: YesNo
  /** Messages sent from the phone. */
  outgoingMessageWebhook: YesNo
  /** Messages sent through the API (echo of our own sends). */
  outgoingAPIMessageWebhook: YesNo
  stateWebhook: YesNo
  /** "v3" for MAX, "whatsapp" (or missing) for WhatsApp. */
  typeInstance?: string
}

export type CheckAccountResult = { exist: boolean; chatId: string }

export type CheckWhatsappResult = { exists: boolean }

export type SendMessageResult = { idMessage: string }

export type QueuedNotification = { receiptId: number; body: unknown }
