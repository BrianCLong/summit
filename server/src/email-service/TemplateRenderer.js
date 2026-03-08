"use strict";
// @ts-nocheck
/**
 * Template Renderer
 *
 * Renders email templates using MJML and React Email
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRenderer = void 0;
const mjml_1 = __importDefault(require("mjml"));
const render_1 = require("@react-email/render");
const html_to_text_1 = require("html-to-text");
const juice_1 = __importDefault(require("juice"));
class TemplateRenderer {
    /**
     * Render an email template with variables
     */
    async render(template, variables) {
        // Validate required variables
        this.validateVariables(template.variables, variables);
        // Render subject with variables
        const subject = this.interpolate(template.subject, variables);
        let html;
        // Render based on template type
        if (template.mjmlContent) {
            html = await this.renderMJML(template.mjmlContent, variables);
        }
        else if (template.reactEmailComponent) {
            html = await this.renderReactEmail(template.reactEmailComponent, variables);
        }
        else {
            throw new Error(`Template ${template.id} has no content to render`);
        }
        // Inline CSS for better email client compatibility
        html = (0, juice_1.default)(html);
        // Generate text version
        const text = (0, html_to_text_1.htmlToText)(html, {
            wordwrap: 130,
            preserveNewlines: true,
            selectors: [
                { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
                { selector: 'img', format: 'skip' },
            ],
        });
        return {
            subject,
            html,
            text,
            previewText: template.previewText
                ? this.interpolate(template.previewText, variables)
                : undefined,
        };
    }
    /**
     * Render MJML template
     */
    async renderMJML(mjmlContent, variables) {
        // Interpolate variables in MJML
        const interpolatedMjml = this.interpolate(mjmlContent, variables);
        // Convert MJML to HTML
        const result = (0, mjml_1.default)(interpolatedMjml, {
            keepComments: false,
            beautify: false,
            minify: true,
        });
        if (result.errors.length > 0) {
            throw new Error(`MJML rendering errors: ${result.errors.map((e) => e.message).join(', ')}`);
        }
        return result.html;
    }
    /**
     * Render React Email component
     */
    async renderReactEmail(componentCode, variables) {
        // This is a simplified implementation
        // In production, you'd want to properly evaluate the React component
        // For now, we'll treat it as a template string
        try {
            // Note: This is a basic implementation
            // A full implementation would require dynamic component loading
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const html = (0, render_1.render)(componentCode, variables);
            return html;
        }
        catch (error) {
            throw new Error(`React Email rendering error: ${error.message}`);
        }
    }
    /**
     * Interpolate variables in template string
     */
    interpolate(template, variables) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(variables, path.trim());
            if (value === undefined || value === null) {
                console.warn(`Template variable not found: ${path}`);
                return match; // Keep placeholder if value not found
            }
            // Format value based on type
            if (value instanceof Date) {
                return value.toLocaleDateString();
            }
            if (Array.isArray(value)) {
                return value.join(', ');
            }
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Validate that all required variables are provided
     */
    validateVariables(templateVars, providedVars) {
        const missing = [];
        for (const templateVar of templateVars) {
            if (templateVar.required) {
                const value = this.getNestedValue(providedVars, templateVar.name);
                if (value === undefined || value === null) {
                    // Check if there's a default value
                    if (templateVar.defaultValue === undefined) {
                        missing.push(templateVar.name);
                    }
                    else {
                        // Set default value
                        this.setNestedValue(providedVars, templateVar.name, templateVar.defaultValue);
                    }
                }
            }
        }
        if (missing.length > 0) {
            throw new Error(`Missing required template variables: ${missing.join(', ')}`);
        }
    }
    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
}
exports.TemplateRenderer = TemplateRenderer;
