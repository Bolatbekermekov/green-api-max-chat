import type { GreenApiClient } from "@/lib/green-api/client"
import { describeError } from "@/lib/green-api/errors"
import { useChatStore } from "@/store/chat-store"

type SendClient = Pick<GreenApiClient, "sendMessage">

async function deliver(
  client: SendClient,
  chatId: string,
  localId: string,
  text: string,
) {
  try {
    const { idMessage } = await client.sendMessage(chatId, text)
    useChatStore.getState().markSent(chatId, localId, idMessage)
  } catch (error) {
    useChatStore.getState().markFailed(chatId, localId, describeError(error))
  }
}

/** Optimistic send: the bubble appears at once and then follows the API result. */
export async function sendChatMessage({
  client,
  chatId,
  text,
}: {
  client: SendClient
  chatId: string
  text: string
}): Promise<void> {
  const message = text.trim()
  if (!message) return
  const localId = useChatStore.getState().addPendingMessage(chatId, message)
  await deliver(client, chatId, localId, message)
}

export async function retryChatMessage({
  client,
  chatId,
  localId,
}: {
  client: SendClient
  chatId: string
  localId: string
}): Promise<void> {
  const store = useChatStore.getState()
  const message = store.messages[chatId]?.find((m) => m.id === localId)
  if (!message?.text) return
  store.markPending(chatId, localId)
  await deliver(client, chatId, localId, message.text)
}
