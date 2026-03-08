"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const proj = new ts_morph_1.Project({ tsConfigFilePath: 'tsconfig.json' });
for (const sf of proj.getSourceFiles('**/*.ts*')) {
    sf.forEachDescendant((n) => {
        if (n.getKind() === ts_morph_1.SyntaxKind.CallExpression) {
            const txt = n.getText();
            if (/\.then\(/.test(txt) && !txt.includes('catch(')) {
                n.replaceWithText(`${txt}.catch(e=>logger.error("unhandled", {e}))`);
            }
        }
    });
}
await proj.save();
