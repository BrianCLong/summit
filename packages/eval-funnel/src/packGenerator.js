"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerPackGenerator = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
class CustomerPackGenerator {
    generate(specs) {
        return specs.map((spec) => this.generateSingle(spec));
    }
    generateSingle(spec) {
        const templateDir = (0, node_path_1.resolve)(spec.templateDir);
        const outputDir = (0, node_path_1.resolve)(spec.outputDir);
        if (!(0, node_fs_1.existsSync)(templateDir)) {
            throw new Error(`Template directory not found: ${templateDir}`);
        }
        (0, node_fs_1.mkdirSync)(outputDir, { recursive: true });
        const customerBundleDir = (0, node_path_1.join)(outputDir, spec.customerId);
        (0, node_fs_1.mkdirSync)(customerBundleDir, { recursive: true });
        const documents = [];
        const configs = [];
        this.copyWithPlaceholders(templateDir, customerBundleDir, spec.placeholders, documents, configs);
        if (spec.documentationBlocks?.length) {
            const docPath = (0, node_path_1.join)(customerBundleDir, 'ADDITIONAL_NOTES.md');
            (0, node_fs_1.writeFileSync)(docPath, spec.documentationBlocks.join('\n\n'), 'utf8');
            documents.push(docPath);
        }
        if (spec.config) {
            const configPath = (0, node_path_1.join)(customerBundleDir, 'config.generated.json');
            (0, node_fs_1.writeFileSync)(configPath, JSON.stringify(spec.config, null, 2), 'utf8');
            configs.push(configPath);
        }
        return {
            customerId: spec.customerId,
            bundlePath: customerBundleDir,
            documents,
            configs,
        };
    }
    copyWithPlaceholders(source, destination, placeholders, documents, configs) {
        const entries = (0, node_fs_1.readdirSync)(source);
        for (const entry of entries) {
            const srcPath = (0, node_path_1.join)(source, entry);
            const destPath = (0, node_path_1.join)(destination, entry);
            const stats = (0, node_fs_1.statSync)(srcPath);
            if (stats.isDirectory()) {
                (0, node_fs_1.mkdirSync)(destPath, { recursive: true });
                this.copyWithPlaceholders(srcPath, destPath, placeholders, documents, configs);
            }
            else {
                const fileContent = (0, node_fs_1.readFileSync)(srcPath, 'utf8');
                const rendered = this.render(fileContent, placeholders);
                (0, node_fs_1.writeFileSync)(destPath, rendered, 'utf8');
                if (entry.toLowerCase().endsWith('.md')) {
                    documents.push(destPath);
                }
                if (entry.toLowerCase().endsWith('.json') || entry.toLowerCase().endsWith('.yaml') || entry.toLowerCase().endsWith('.yml')) {
                    configs.push(destPath);
                }
            }
        }
    }
    render(content, placeholders) {
        return content.replace(/\{\{([a-zA-Z0-9_\-]+)\}\}/g, (_, key) => {
            if (!(key in placeholders)) {
                throw new Error(`Missing placeholder value for ${key}`);
            }
            return placeholders[key];
        });
    }
}
exports.CustomerPackGenerator = CustomerPackGenerator;
