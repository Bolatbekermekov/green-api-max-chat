import { expect, test } from "@playwright/test"

import { incomingTextBody, statusBody } from "../src/lib/green-api/fixtures"
import { mockGreenApi, TEST_CREDENTIALS } from "./mock-green-api"

// The demo video for the README. Run with: CAPTURE=1 npx playwright test e2e/demo.spec.ts

test.use({
  viewport: { width: 1280, height: 720 },
  video: { mode: "on", size: { width: 1280, height: 720 } },
})

test("demo video @capture", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one video is enough")
  test.setTimeout(90_000)
  await page.emulateMedia({ colorScheme: "light" })
  const api = await mockGreenApi(page, {
    accounts: { "79991234567": "10000000" },
  })

  await page.goto("/")
  await page.waitForTimeout(800)
  await page
    .getByLabel("ID инстанса (idInstance)")
    .pressSequentially(TEST_CREDENTIALS.idInstance, { delay: 60 })
  await page
    .getByLabel("API-токен (apiTokenInstance)")
    .pressSequentially(TEST_CREDENTIALS.apiTokenInstance, { delay: 40 })
  await page.getByRole("button", { name: "Войти" }).click()
  await expect(page.getByRole("heading", { name: "Чаты" })).toBeVisible()
  await page.waitForTimeout(800)

  await page.getByRole("button", { name: "Новый чат" }).click()
  await page
    .getByLabel("Номер телефона")
    .pressSequentially("+7 999 123-45-67", { delay: 60 })
  await page.getByRole("button", { name: "Создать чат" }).click()
  await page.waitForTimeout(800)

  await page
    .getByRole("textbox", { name: "Сообщение" })
    .pressSequentially("Привет! Пишу из веб-чата на GREEN-API 👋", {
      delay: 45,
    })
  await page.keyboard.press("Enter")
  await expect.poll(() => api.sent.length).toBe(1)
  await page.waitForTimeout(1200)

  api.push(
    statusBody({ chatId: "10000000", idMessage: "MSG-1", status: "delivered" }),
  )
  await page.waitForTimeout(1200)
  api.push(
    incomingTextBody({
      chatId: "10000000",
      idMessage: "IN-1",
      text: "Привет! Получил, отвечаю из MAX 🙂",
      timestamp: Math.floor(Date.now() / 1000),
      chatName: "Иван Петров",
    }),
  )
  api.push(
    statusBody({ chatId: "10000000", idMessage: "MSG-1", status: "read" }),
  )
  await expect(
    page
      .getByRole("region", { name: "Сообщения" })
      .getByText("Привет! Получил, отвечаю из MAX 🙂"),
  ).toBeVisible()
  await page.waitForTimeout(2500)
})
