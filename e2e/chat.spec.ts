import { expect, test, type Page } from "@playwright/test"

import {
  incomingTextBody,
  outgoingTextBody,
  statusBody,
} from "../src/lib/green-api/fixtures"
import { RECOMMENDED_SETTINGS } from "../src/lib/green-api/settings"
import {
  mockGreenApi,
  TEST_CREDENTIALS,
  WHATSAPP_CREDENTIALS,
} from "./mock-green-api"

async function logIn(
  page: Page,
  {
    idInstance = TEST_CREDENTIALS.idInstance,
    token = TEST_CREDENTIALS.apiTokenInstance,
  } = {},
) {
  await page.goto("/")
  await page.getByLabel("ID инстанса (idInstance)").fill(idInstance)
  await page.getByLabel("API-токен (apiTokenInstance)").fill(token)
  await page.getByRole("button", { name: "Войти" }).click()
}

const nowInSeconds = () => Math.floor(Date.now() / 1000)

test("full flow: login, new chat, send, reply, read", async ({ page }) => {
  const api = await mockGreenApi(page, {
    accounts: { "79991234567": "10000000" },
  })

  await logIn(page)
  await expect(page.getByRole("heading", { name: "Чаты" })).toBeVisible()

  await page.getByRole("button", { name: "Новый чат" }).click()
  await page.getByLabel("Номер телефона").fill("8 (999) 123-45-67")
  await page.getByRole("button", { name: "Создать чат" }).click()
  await expect(
    page.getByRole("heading", { level: 2, name: "+7 999 123-45-67" }),
  ).toBeVisible()

  await page.getByRole("textbox", { name: "Сообщение" }).fill("Привет из e2e!")
  await page.keyboard.press("Enter")
  await expect
    .poll(() => api.sent)
    .toEqual([{ chatId: "10000000", message: "Привет из e2e!" }])

  // The API echo of our own message must not duplicate the bubble.
  api.push(
    outgoingTextBody({
      chatId: "10000000",
      idMessage: "MSG-1",
      text: "Привет из e2e!",
      timestamp: nowInSeconds(),
    }),
  )
  api.push(
    incomingTextBody({
      chatId: "10000000",
      idMessage: "IN-1",
      text: "Ответ из MAX",
      timestamp: nowInSeconds(),
      chatName: "Иван",
    }),
  )
  api.push(
    statusBody({ chatId: "10000000", idMessage: "MSG-1", status: "read" }),
  )

  const transcript = page.getByRole("region", { name: "Сообщения" })
  await expect(transcript.getByText("Ответ из MAX")).toBeVisible()
  await expect(transcript.getByRole("img", { name: "Прочитано" })).toBeVisible()
  await expect(transcript.getByText("Привет из e2e!")).toHaveCount(1)
  // The reply arrived after our message and is shown below it.
  await expect(transcript.getByText(/Привет из e2e!|Ответ из MAX/)).toHaveText([
    "Привет из e2e!",
    "Ответ из MAX",
  ])
  await expect(
    page.getByRole("heading", { level: 2, name: "Иван" }),
  ).toBeVisible()
})

test("wrong token shows an error", async ({ page }) => {
  await mockGreenApi(page)

  await logIn(page, { token: "wrong-token" })

  await expect(
    page.getByRole("alert").filter({ hasText: "Неверный apiTokenInstance" }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Войти" })).toBeEnabled()
})

test("settings banner fixes settings", async ({ page }) => {
  const api = await mockGreenApi(page, { settings: { incomingWebhook: "no" } })

  await logIn(page)
  const banner = page.getByRole("alert").filter({
    hasText: "Сообщения не будут приходить",
  })
  await expect(banner).toBeVisible()
  await page.getByRole("button", { name: "Исправить настройки" }).click()

  await expect.poll(() => api.settingsUpdates).toEqual([RECOMMENDED_SETTINGS])
  await expect(banner).toBeHidden()
})

test("WhatsApp: login, new chat, send, reply, read", async ({ page }) => {
  const chatId = "77011234567@c.us"
  const api = await mockGreenApi(page, {
    messenger: "whatsapp",
    whatsappNumbers: ["77011234567"],
  })

  await logIn(page, { idInstance: WHATSAPP_CREDENTIALS.idInstance })
  await expect(page.getByText("Мессенджер: WhatsApp")).toBeVisible()

  await page.getByRole("button", { name: "Новый чат" }).click()
  await page.getByLabel("Номер телефона").fill("8 701 123 45 67")
  await page.getByRole("button", { name: "Создать чат" }).click()
  await expect(
    page.getByRole("heading", { level: 2, name: "+7 701 123-45-67" }),
  ).toBeVisible()

  await page
    .getByRole("textbox", { name: "Сообщение" })
    .fill("Привет из WhatsApp!")
  await page.keyboard.press("Enter")
  await expect
    .poll(() => api.sent)
    .toEqual([{ chatId, message: "Привет из WhatsApp!" }])

  api.push(
    outgoingTextBody({
      messenger: "whatsapp",
      chatId,
      idMessage: "MSG-1",
      text: "Привет из WhatsApp!",
      timestamp: nowInSeconds(),
    }),
  )
  api.push(
    incomingTextBody({
      messenger: "whatsapp",
      chatId,
      idMessage: "IN-1",
      text: "Ответ из WhatsApp",
      timestamp: nowInSeconds(),
      chatName: "Айгерим",
    }),
  )
  api.push(
    statusBody({
      messenger: "whatsapp",
      chatId,
      idMessage: "MSG-1",
      status: "read",
    }),
  )

  const transcript = page.getByRole("region", { name: "Сообщения" })
  await expect(transcript.getByText("Ответ из WhatsApp")).toBeVisible()
  await expect(transcript.getByRole("img", { name: "Прочитано" })).toBeVisible()
  await expect(transcript.getByText("Привет из WhatsApp!")).toHaveCount(1)
  await expect(
    page.getByRole("heading", { level: 2, name: "Айгерим" }),
  ).toBeVisible()
})

test("an instance of another messenger is refused", async ({ page }) => {
  await mockGreenApi(page, { settings: { typeInstance: "telegram" } })

  await logIn(page)

  await expect(
    page.getByRole("alert").filter({
      hasText: "Чат работает с инстансами MAX и WhatsApp",
    }),
  ).toBeVisible()
})

test("a number without MAX keeps the dialog open", async ({ page }) => {
  await mockGreenApi(page)

  await logIn(page)
  await page.getByRole("button", { name: "Новый чат" }).click()
  await page.getByLabel("Номер телефона").fill("+7 900 000-00-00")
  await page.getByRole("button", { name: "Создать чат" }).click()

  await expect(page.getByRole("dialog")).toContainText(
    "У номера +7 900 000-00-00 нет аккаунта MAX",
  )
})
