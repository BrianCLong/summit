import { Page, Locator, expect } from "@playwright/test";

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForUrl(urlPattern: string | RegExp) {
    await this.page.waitForURL(urlPattern);
  }

  async click(selector: string) {
    await this.page.click(selector);
  }

  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async waitForSelector(selector: string) {
    await this.page.waitForSelector(selector);
  }

  async getByText(text: string): Promise<Locator> {
    return this.page.getByText(text);
  }

  async getByRole(role: "button" | "link" | "tab" | "heading", options?: any): Promise<Locator> {
    return this.page.getByRole(role, options);
  }

  async expectTitle(title: string | RegExp) {
    await expect(this.page).toHaveTitle(title);
  }

  async expectUrl(url: string | RegExp) {
    await expect(this.page).toHaveURL(url);
  }
}
