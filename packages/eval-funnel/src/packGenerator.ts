import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CustomerPackSpec, PackGenerationResult } from "./types";

export class CustomerPackGenerator {
  generate(specs: CustomerPackSpec[]): PackGenerationResult[] {
    return specs.map((spec) => this.generateSingle(spec));
  }

  private generateSingle(spec: CustomerPackSpec): PackGenerationResult {
    const templateDir = resolve(spec.templateDir);
    const outputDir = resolve(spec.outputDir);
    if (!existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateDir}`);
    }

    mkdirSync(outputDir, { recursive: true });
    const customerBundleDir = join(outputDir, spec.customerId);
    mkdirSync(customerBundleDir, { recursive: true });

    const documents: string[] = [];
    const configs: string[] = [];

    this.copyWithPlaceholders(
      templateDir,
      customerBundleDir,
      spec.placeholders,
      documents,
      configs
    );

    if (spec.documentationBlocks?.length) {
      const docPath = join(customerBundleDir, "ADDITIONAL_NOTES.md");
      writeFileSync(docPath, spec.documentationBlocks.join("\n\n"), "utf8");
      documents.push(docPath);
    }

    if (spec.config) {
      const configPath = join(customerBundleDir, "config.generated.json");
      writeFileSync(configPath, JSON.stringify(spec.config, null, 2), "utf8");
      configs.push(configPath);
    }

    return {
      customerId: spec.customerId,
      bundlePath: customerBundleDir,
      documents,
      configs,
    };
  }

  private copyWithPlaceholders(
    source: string,
    destination: string,
    placeholders: Record<string, string>,
    documents: string[],
    configs: string[]
  ): void {
    const entries = readdirSync(source);
    for (const entry of entries) {
      const srcPath = join(source, entry);
      const destPath = join(destination, entry);
      const stats = statSync(srcPath);
      if (stats.isDirectory()) {
        mkdirSync(destPath, { recursive: true });
        this.copyWithPlaceholders(srcPath, destPath, placeholders, documents, configs);
      } else {
        const fileContent = readFileSync(srcPath, "utf8");
        const rendered = this.render(fileContent, placeholders);
        writeFileSync(destPath, rendered, "utf8");
        if (entry.toLowerCase().endsWith(".md")) {
          documents.push(destPath);
        }
        if (
          entry.toLowerCase().endsWith(".json") ||
          entry.toLowerCase().endsWith(".yaml") ||
          entry.toLowerCase().endsWith(".yml")
        ) {
          configs.push(destPath);
        }
      }
    }
  }

  private render(content: string, placeholders: Record<string, string>): string {
    return content.replace(/\{\{([a-zA-Z0-9_\-]+)\}\}/g, (_, key: string) => {
      if (!(key in placeholders)) {
        throw new Error(`Missing placeholder value for ${key}`);
      }
      return placeholders[key];
    });
  }
}
