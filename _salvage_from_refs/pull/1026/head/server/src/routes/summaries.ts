import { Router, Request, Response } from "express";
import puppeteer from "puppeteer";
import { llmAnalystService } from "../services/LLMAnalystService.js";

const router = Router();

// Record user feedback for a summary
router.post("/:id/feedback", async (req: Request, res: Response) => {
  try {
    await llmAnalystService.recordFeedback(req.params.id, req.body || {});
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: "Summary not found" });
  }
});

// Retrieve a summary, optionally translated
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const lang = (req.query.lang as string) || undefined;
  const product = llmAnalystService.getProduct(id);
  if (!product) {
    return res.status(404).json({ error: "Summary not found" });
  }
  try {
    let content = product.content;
    let language = product.language;
    if (lang && lang !== product.language) {
      content = await llmAnalystService.translateContent(content, lang);
      language = lang;
    }
    res.json({ id: product.id, content, language, score: product.score });
  } catch {
    res.status(500).json({ error: "Translation failed" });
  }
});

// Export summary as PDF or Markdown
router.get("/:id/export", async (req: Request, res: Response) => {
  const { id } = req.params;
  const format = (req.query.format as string) || "markdown";
  const lang = (req.query.lang as string) || undefined;
  const product = llmAnalystService.getProduct(id);
  if (!product) {
    return res.status(404).json({ error: "Summary not found" });
  }
  try {
    let content = product.content;
    if (lang && lang !== product.language) {
      content = await llmAnalystService.translateContent(content, lang);
    }
    if (format === "pdf") {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(`<pre>${content}</pre>`);
      const pdfBuffer = await page.pdf();
      await browser.close();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=summary-${id}.pdf`,
      );
      res.setHeader("Content-Type", "application/pdf");
      res.send(pdfBuffer);
    } else {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=summary-${id}.md`,
      );
      res.type("text/markdown").send(content);
    }
  } catch {
    res.status(500).json({ error: "Export failed" });
  }
});

export default router;
