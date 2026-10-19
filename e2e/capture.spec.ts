import { expect, test, type Page } from "@playwright/test"

import { mockGreenApi, TEST_CREDENTIALS } from "./mock-green-api"

// README screenshots. Run with: CAPTURE=1 npx playwright test

const SHOTS = "docs/screenshots"

/** A saved session with a few realistic chats, as if the app had been used. */
async function seedSession(page: Page) {
  await page.addInitScript(
    (credentials) => {
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
      const anna = "20000001"
      const chats = {
        [anna]: {
          chatId: anna,
          title: "Анна Смирнова",
          phone: "79161234567",
          lastActivityAt: now - 2 * min,
          unread: 0,
        },
        "20000002": {
          chatId: "20000002",
          title: "Иван Петров",
          lastActivityAt: now - 25 * min,
          unread: 1,
        },
        "20000003": {
          chatId: "20000003",
          title: "+7 999 123-45-67",
          phone: "79991234567",
          lastActivityAt: now - 60 * min,
          unread: 0,
        },
        "20000004": {
          chatId: "20000004",
          title: "Мария",
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
        "20000002": [
          msg("20000002", "b1", "in", "Созвонимся в 15:00?", now - 25 * min),
        ],
        "20000003": [],
        "20000004": [
          msg("20000004", "c1", "out", "До встречи!", yesterday, "read"),
        ],
      }
      localStorage.setItem(
        "max-chat:session",
        JSON.stringify({ state: { credentials }, version: 1 }),
      )
      localStorage.setItem(
        "max-chat:chats",
        JSON.stringify({
          state: {
            instanceId: credentials.idInstance,
            chats,
            messages,
            phoneIndex: { "79161234567": anna, "79991234567": "20000003" },
          },
          version: 1,
        }),
      )
    },
    { ...TEST_CREDENTIALS, apiUrl: "https://3100.api.green-api.com" },
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
