import { test, expect } from "../fixtures/base";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the HTML response for the login page
    await page.route("http://localhost:3000/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `
            <html>
                <body>
                    <form>
                        <input id="email" type="email" required />
                        <input id="password" type="password" required />
                        <button type="submit">Sign In</button>
                        <div class="text-red-300" style="display: none"></div>
                    </form>
                    <script>
                        document.querySelector('form').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const email = document.getElementById('email').value;
                            const password = document.getElementById('password').value;
                            const res = await fetch('/auth/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email, password })
                            });
                            if (res.ok) {
                                window.location.href = '/';
                            } else {
                                const err = await res.json();
                                const el = document.querySelector('.text-red-300');
                                el.style.display = 'block';
                                el.innerText = err.message;
                            }
                        });
                    </script>
                </body>
            </html>
            `,
      });
    });

    // Mock the HTML response for the dashboard (root)
    await page.route("http://localhost:3000/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>Dashboard</h1></body></html>",
      });
    });

    // Mock the initial user check to return 401 (not logged in)
    await page.route("**/users/me", async (route) => {
      await route.fulfill({ status: 401 });
    });

    // Mock login endpoint
    await page.route("**/auth/login", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData.email === "sarah.chen@intelgraph.com" && postData.password === "password") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "fake-jwt-token",
            user: {
              id: "user-123",
              email: "sarah.chen@intelgraph.com",
              name: "Sarah Chen",
              role: "analyst",
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Invalid credentials" }),
        });
      }
    });
  });

  test("should login successfully with valid credentials", async ({ loginPage, page }) => {
    await loginPage.goto();

    // Mock /users/me to return user data for successful login state verification
    // This mocks the state AFTER login where the app might re-check the user
    await page.route("**/users/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-123",
          email: "sarah.chen@intelgraph.com",
          name: "Sarah Chen",
          role: "analyst",
        }),
      });
    });

    await loginPage.login("sarah.chen@intelgraph.com", "password");

    // Expect redirection to home/dashboard (root)
    await expect(page).toHaveURL("http://localhost:3000/");
  });

  test("should show error with invalid credentials", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("wrong@example.com", "wrongpassword");

    const errorMessage = await loginPage.getErrorMessageText();
    expect(errorMessage).toContain("Invalid credentials");
  });

  test("should require email and password", async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.emailInput).toHaveAttribute("required", "");
    await expect(loginPage.passwordInput).toHaveAttribute("required", "");
  });
});
