"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignOSExtractSkill = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class DesignOSExtractSkill {
    name = "designos:extract";
    validate(config) {
        // Optional config validation
    }
    async execute(context, step, execution) {
        const sourcePath = step.config.source_path || './';
        const outputPath = step.config.output_path || 'DESIGN.md';
        // Mock extraction logic
        // In a real implementation, this would scan sourcePath for CSS/Tailwind config
        const designTokens = {
            colors: {
                primary: "#007AFF",
                secondary: "#5856D6"
            },
            spacing: {
                sm: "4px",
                md: "8px"
            }
        };
        const designMdContent = `# Design System

## Colors
- Primary: ${designTokens.colors.primary}
- Secondary: ${designTokens.colors.secondary}

## Spacing
- Small: ${designTokens.spacing.sm}
- Medium: ${designTokens.spacing.md}
`;
        if (!step.config.dry_run) {
            await fs.writeFile(path.resolve(process.cwd(), outputPath), designMdContent);
        }
        return {
            output: {
                design_md: designMdContent,
                graph_nodes: designTokens
            },
            metadata: {
                evidence: {
                    source_path: sourcePath,
                    generated_at: new Date().toISOString(),
                    token_count: Object.keys(designTokens.colors).length + Object.keys(designTokens.spacing).length
                }
            }
        };
    }
}
exports.DesignOSExtractSkill = DesignOSExtractSkill;
