import * as fs from 'fs';
import * as path from 'path';

// TODO: Needs full implementation after verification.

export interface GenerationOptions {
  outDir: string;
}

export async function generateSurface(surfacePlan: any, options: GenerationOptions) {
  const { outDir } = options;
  const targetDir = path.join(outDir, surfacePlan.surfaceSlug);

  fs.mkdirSync(targetDir, { recursive: true });

  const manifest = {
    id: surfacePlan.surfaceSlug,
    version: "1.0.0",
    entry: "index.tsx",
    evidenceId: surfacePlan.evidenceId,
    timestamp: null // Enforce determinism
  };

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const code = `
import React from 'react';
import { createRoot } from 'react-dom/client';
// TODO: Generate imports based on surfacePlan.panels[].widgets[].type

export function App(props: any) {
  return (
    <div>
      <h1>Generated Surface: ${surfacePlan.surfaceSlug}</h1>
      {/* TODO: Generate components */}
    </div>
  );
}

let root: any;

export function mount(el: HTMLElement, context: any) {
  root = createRoot(el);
  root.render(<App context={context} />);
}

export function unmount(el: HTMLElement) {
  if (root) {
    root.unmount();
    root = null;
  }
}

export function getManifest() {
  return ${JSON.stringify(manifest)};
}
`;

  fs.writeFileSync(path.join(targetDir, 'index.tsx'), code.trim() + '\n');

  return {
    success: true,
    paths: {
      manifest: path.join(targetDir, 'manifest.json'),
      entry: path.join(targetDir, 'index.tsx')
    }
  };
}
