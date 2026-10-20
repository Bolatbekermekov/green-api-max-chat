import { expect, test, type Page } from "@playwright/test"

import type { MessengerType } from "../src/lib/green-api/messenger"
import {
  mockGreenApi,
  TEST_CREDENTIALS,
  WHATSAPP_CREDENTIALS,
} from "./mock-green-api"

// README screenshots. Run with: CAPTURE=1 npx playwright test

const SHOTS = "docs/screenshots"

/** A saved session with a few realistic chats, as if the app had been used. */
async function seedSession(page: Page, messenger: MessengerType = "max") {
  const credentials =
    messenger === "max"
      ? { ...TEST_CREDENTIALS, apiUrl: "https://3100.api.green-api.com" }
      : { ...WHATSAPP_CREDENTIALS, apiUrl: "https://1101.api.green-api.com" }
  await page.addInitScript(
    ({ credentials, messenger }) => {
      const now = Date.now()
      const min = 60_000
      const yesterday = now - 24 * 60 * min
      const msg = (
        chatId: string,
        id: string,
        direction: "in" | "out",
        text: string,
        timestamp: number,
        status?: string,
      ) => ({
        id,
        idMessage: id,
        chatId,
        direction,
        text,
        timestamp,
        ...(status ? { status } : {}),
      })
      // MAX chats have numeric ids and share the phone only sometimes;
      // a WhatsApp chat is the phone number itself.
      const whatsapp = messenger === "whatsapp"
      const chatOf = (maxId: string, phone: string) =>
        whatsapp ? `${phone}@c.us` : maxId
      const phoneOf = (phone: string) => (whatsapp ? { phone } : {})
      const anna = chatOf("20000001", "79161234567")
      const ivan = chatOf("20000002", "79031234567")
      const unknown = chatOf("20000003", "79991234567")
      const maria = chatOf("20000004", "77011234567")
      const chats = {
        [anna]: {
          chatId: anna,
          title: "Анна Смирнова",
          phone: "79161234567",
          lastActivityAt: now - 2 * min,
          unread: 0,
        },
        [ivan]: {
          chatId: ivan,
          title: "Иван Петров",
          ...phoneOf("79031234567"),
          lastActivityAt: now - 25 * min,
          unread: 1,
        },
        [unknown]: {
          chatId: unknown,
          title: "+7 999 123-45-67",
          phone: "79991234567",
          lastActivityAt: now - 60 * min,
          unread: 0,
        },
        [maria]: {
          chatId: maria,
          title: "Мария",
          ...phoneOf("77011234567"),
          lastActivityAt: yesterday,
          unread: 0,
        },
      }
      const messages = {
        [anna]: [
          msg(
            anna,
            "a1",
            "in",
            "Привет! Ты уже посмотрел макет нового экрана?",
            yesterday - 80 * min,
          ),
          msg(
            anna,
            "a2",
            "out",
            "Да, всё отлично. Завтра пришлю правки 👍",
            yesterday - 68 * min,
            "read",
          ),
          msg(
            anna,
            "a3",
            "out",
            "Доброе утро! Отправил правки на почту",
            now - 12 * min,
            "read",
          ),
          msg(anna, "a4", "in", "Спасибо, уже смотрю", now - 10 * min),
          msg(
            anna,
            "a5",
            "in",
            "Кстати, тестовое на GREEN-API получилось?",
            now - 9 * min,
          ),
          msg(
            anna,
            "a6",
            "out",
            "Да! Это сообщение отправлено через GREEN-API SendMessage, а ответы приходят через HTTP API — ReceiveNotification и DeleteNotification.",
            now - 2 * min,
            "delivered",
          ),
        ],
        [ivan]: [msg(ivan, "b1", "in", "Созвонимся в 15:00?", now - 25 * min)],
        [unknown]: [],
        [maria]: [msg(maria, "c1", "out", "До встречи!", yesterday, "read")],
      }
      localStorage.setItem(
        "max-chat:session",
        JSON.stringify({ state: { credentials, messenger }, version: 1 }),
      )
      localStorage.setItem(
        "max-chat:chats",
        JSON.stringify({
          state: {
            instanceId: credentials.idInstance,
            chats,
            messages,
            phoneIndex: {
              "79161234567": anna,
              "79991234567": unknown,
              ...(whatsapp
                ? { "79031234567": ivan, "77011234567": maria }
                : {}),
            },
          },
          version: 1,
        }),
      )
    },
    { credentials, messenger },
  )
}

async function openAnna(page: Page) {
  await page.getByRole("button", { name: /Анна Смирнова/ }).click()
  await expect(
    page.getByRole("heading", { level: 2, name: "Анна Смирнова" }),
  ).toBeVisible()
}

for (const scheme of ["light", "dark"] as const) {
  test(`screenshots in ${scheme} theme @capture`, async ({
    page,
  }, testInfo) => {
    const device = testInfo.project.name
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
    await mockGreenApi(page)

    await page.goto("/")
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/${device}-login-${scheme}.png` })

    await seedSession(page)
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "Чаты" })).toBeVisible()
    if (device === "mobile") {
      await page.screenshot({ path: `${SHOTS}/${device}-chats-${scheme}.png` })
    }
    await openAnna(page)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SHOTS}/${device}-chat-${scheme}.png` })
  })
}

test("WhatsApp screenshot @capture", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one WhatsApp shot is enough")
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })
  await mockGreenApi(page, { messenger: "whatsapp" })

  await seedSession(page, "whatsapp")
  await page.goto("/")
  await expect(page.getByText("Мессенджер: WhatsApp")).toBeVisible()
  await openAnna(page)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SHOTS}/desktop-chat-whatsapp-light.png` })
})
