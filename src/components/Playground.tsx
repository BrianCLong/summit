import React from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
export default function Playground({
  files,
  template = 'vanilla-ts',
}: {
  files: Record<string, string>;
  template?: string;
}) {
  return (
    <Sandpack
      template={template}
      files={files}
      options={{ editorHeight: 420, showTabs: true }}
    />
  );
}
