"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserOpsEnvironment = void 0;
const env_js_1 = require("../env.js");
class BrowserOpsEnvironment extends env_js_1.BaseEnvironment {
    name = 'BrowserOps';
    currentUrl = 'about:blank';
    pageContent = '<html><body></body></html>';
    async _reset(options) {
        this.currentUrl = options?.url || 'https://internal.summit.corp/dashboard';
        this.pageContent = this.generateContent(this.currentUrl);
        return this.getObservation();
    }
    async _step(action) {
        let success = true;
        let message = 'Action completed';
        const reward = 0;
        switch (action.type) {
            case 'goto':
                this.currentUrl = action.params.url;
                this.pageContent = this.generateContent(this.currentUrl);
                message = `Navigated to ${this.currentUrl}`;
                break;
            case 'click':
                // Mock click
                if (action.params.selector) {
                    message = `Clicked ${action.params.selector}`;
                    // Simulate state change if it's a specific button
                    if (action.params.selector === '#login-btn') {
                        this.currentUrl = 'https://internal.summit.corp/home';
                        this.pageContent = this.generateContent(this.currentUrl);
                    }
                }
                else {
                    success = false;
                    message = 'Missing selector';
                }
                break;
            case 'type':
                if (action.params.selector && action.params.text) {
                    message = `Typed "${action.params.text}" into ${action.params.selector}`;
                }
                else {
                    success = false;
                    message = 'Missing selector or text';
                }
                break;
            default:
                success = false;
                message = `Unknown action type: ${action.type}`;
        }
        return {
            observation: this.getObservation(),
            feedback: { success, message, reward },
            done: false,
            info: { url: this.currentUrl }
        };
    }
    getObservation() {
        return {
            type: 'mixed',
            content: {
                url: this.currentUrl,
                dom: this.pageContent
            },
            timestamp: Date.now()
        };
    }
    generateContent(url) {
        if (url.includes('dashboard')) {
            return '<html><body><h1>Admin Dashboard</h1><form><input id="search" /><button id="search-btn">Search</button></form></body></html>';
        }
        else if (url.includes('home')) {
            return '<html><body><h1>Welcome Home</h1><a href="/profile">Profile</a></body></html>';
        }
        return '<html><body><h1>404 Not Found</h1></body></html>';
    }
}
exports.BrowserOpsEnvironment = BrowserOpsEnvironment;
