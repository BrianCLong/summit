"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openMaestro = openMaestro;
// =============================================
// Optional helper: e2e/utils.ts (small utilities for future tests)
// =============================================
async function openMaestro(page) {
    await page.goto('/maestro');
}
