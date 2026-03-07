import { type Page } from "@playwright/test";

export async function waitForGraphLoad(page: Page) {
  // Example helper for canvas or specific graph element
  await page.waitForSelector("canvas", { state: "visible" });
  await page.waitForLoadState("networkidle");
}

export function generateRandomString(length: number = 10): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}
