/**
 * Summit CLI Auth Commands
 *
 * Authentication commands.
 *
 * SOC 2 Controls: CC6.1 (Access Control)
 *
 * @module @summit/cli/commands/auth
 */

/* eslint-disable no-console */
import chalk from "chalk";
import { loadConfig, saveConfig, getConfig, isConfigured } from "../config.js";

interface LoginOptions {
  email?: string;
  apiKey?: string;
  url?: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    tenantId: string;
  };
}

/**
 * Login to Summit platform
 */
export async function login(options: LoginOptions): Promise<void> {
  await loadConfig();

  // Update URL if provided
  if (options.url) {
    await saveConfig({ baseUrl: options.url });
  }

  const config = getConfig();

  if (!isConfigured() && !options.url) {
    console.error(
      chalk.red("CLI not configured. Run `summit config init` first or provide --url.")
    );
    process.exit(1);
  }

  // API Key authentication
  if (options.apiKey) {
    console.log(chalk.blue("Authenticating with API key..."));

    try {
      const response = await fetch(`${config.baseUrl}/auth/api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: options.apiKey }),
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({ error: "Authentication failed" }))) as {
          error?: string;
          message?: string;
        };
        console.error(chalk.red(`Login failed: ${errorData.error || errorData.message}`));
        process.exit(1);
      }

      const data = (await response.json()) as { data: AuthResponse };

      await saveConfig({
        apiKey: options.apiKey,
        token: data.data.token,
        tenantId: data.data.user.tenantId,
      });

      console.log(chalk.green("\nAuthenticated successfully!"));
      console.log(`User:   ${data.data.user.email}`);
      console.log(`Tenant: ${data.data.user.tenantId}`);
      console.log(`Role:   ${data.data.user.role}`);
      return;
    } catch (err) {
      console.error(chalk.red(`Login failed: ${(err as Error).message}`));
      process.exit(1);
    }
  }

  // Interactive email/password authentication
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string, hidden = false): Promise<string> => {
    return new Promise((resolve) => {
      if (hidden) {
        // Simple hidden input (basic implementation)
        process.stdout.write(prompt);
        let input = "";

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        const onData = (char: string) => {
          if (char === "\n" || char === "\r") {
            process.stdin.setRawMode(false);
            process.stdin.removeListener("data", onData);
            process.stdout.write("\n");
            resolve(input);
          } else if (char === "\u0003") {
            // Ctrl+C
            process.exit();
          } else if (char === "\u007F") {
            // Backspace
            input = input.slice(0, -1);
          } else {
            input += char;
          }
        };

        process.stdin.on("data", onData);
      } else {
        rl.question(prompt, resolve);
      }
    });
  };

  try {
    const email = options.email || (await question("Email: "));
    const password = await question("Password: ", true);

    console.log(chalk.blue("\nAuthenticating..."));

    const response = await fetch(`${config.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({ error: "Authentication failed" }))) as { error?: string; message?: string };
      console.error(chalk.red(`Login failed: ${errorData.error || errorData.message}`));
      process.exit(1);
    }

    const data = (await response.json()) as { data: AuthResponse };

    await saveConfig({
      token: data.data.token,
      tenantId: data.data.user.tenantId,
    });

    console.log(chalk.green("\nAuthenticated successfully!"));
    console.log(`User:   ${data.data.user.email}`);
    console.log(`Tenant: ${data.data.user.tenantId}`);
    console.log(`Role:   ${data.data.user.role}`);
  } finally {
    rl.close();
  }
}

/**
 * Logout from Summit platform
 */
export async function logout(): Promise<void> {
  await loadConfig();
  const config = getConfig();

  if (config.token) {
    try {
      await fetch(`${config.baseUrl}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
        },
      });
    } catch {
      // Ignore logout errors
    }
  }

  await saveConfig({
    token: undefined,
    apiKey: undefined,
  });

  console.log(chalk.green("Logged out successfully."));
}
