"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForGraphLoad = waitForGraphLoad;
exports.generateRandomString = generateRandomString;
exports.clearLocalStorage = clearLocalStorage;
async function waitForGraphLoad(page) {
    // Example helper for canvas or specific graph element
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForLoadState('networkidle');
}
function generateRandomString(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
async function clearLocalStorage(page) {
    await page.evaluate(() => localStorage.clear());
}
