export type MessengerType = "max" | "whatsapp"

export const MESSENGER_NAMES: Record<MessengerType, string> = {
  max: "MAX",
  whatsapp: "WhatsApp",
}

/** Longest text SendMessage accepts, per the GREEN-API docs. */
export const MESSAGE_LIMITS: Record<MessengerType, number> = {
  max: 4000,
  whatsapp: 20000,
}

/**
 * getSettings names the messenger in typeInstance: "v3" for MAX, "whatsapp"
 * for WhatsApp, whose older API leaves the field out. Anything else (such as
 * "telegram") is a messenger this chat does not support.
 */
export function detectMessenger(
  typeInstance: string | undefined,
): MessengerType | null {
  if (typeInstance === "v3") return "max"
  if (typeInstance === "whatsapp" || !typeInstance) return "whatsapp"
  return null
}
