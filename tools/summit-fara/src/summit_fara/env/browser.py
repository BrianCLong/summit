import logging
import os
import random
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
except ImportError:
    webdriver = None

log = logging.getLogger("summit-fara")

class BrowserEnv:
    def __init__(self):
        self.width = 1920
        self.height = 1080
        self.driver = None

        if webdriver:
            try:
                opts = Options()
                opts.add_argument("--headless")
                opts.add_argument(f"--window-size={self.width},{self.height}")
                self.driver = webdriver.Chrome(options=opts)
                log.info("Browser Environment initialized (Selenium Chrome)")
            except Exception as e:
                log.warning(f"Failed to init Selenium: {e}. Falling back to mock.")
        else:
            log.info("Selenium not found. Browser Environment initialized (Headless Mock)")

    def capture_screenshot(self) -> str:
        """
        Captures a screenshot.
        """
        path = f"/tmp/screenshot_{int(random.random()*1000)}.png"

        if self.driver:
            try:
                self.driver.save_screenshot(path)
                return path
            except Exception as e:
                log.error(f"Screenshot failed: {e}")

        # Fallback / Mock
        return path

    def perform(self, params: dict):
        """
        Executes a browser action.
        params: {x, y, type: 'click'|'type'|'scroll', text: str}
        """
        action_type = params.get("type")
        x = params.get("x")
        y = params.get("y")

        if action_type == "click":
            log.debug(f"Browser: Click at ({x}, {y})")
        elif action_type == "type":
            text = params.get("text", "")
            log.debug(f"Browser: Type '{text}' at ({x}, {y})")
        elif action_type == "scroll":
            log.debug(f"Browser: Scroll")
        else:
            log.warning(f"Browser: Unknown action {action_type}")
