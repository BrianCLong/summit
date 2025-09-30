// Accepts an .mdx string with slides delimited by `---`
// Compiles per-slide using the MDX runtime (via vite plugin or dynamic eval)
import { mdx } from 'mdx/jsx-runtime'; // vite will alias
export async function compileSlides(mdxText) {
  // naive split — you can switch to remark/rehype for real parsing
  const parts = mdxText.split(/^---\s*$/m).map(s => s.trim()).filter(Boolean);
  const slides = await Promise.all(parts.map(async (src, i) => {
    const { default: Comp } = await import(/* @vite-ignore */`data:text/javascript,${encodeURIComponent(`
      import React from "react";
      import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
      import { mdx } from " @mdx-js/react";
      ${/* NOTE: This trick relies on Vite's ability to import data: URLs */}
    `)}`);
    // In practice you'd use @mdx-js/rollup or vite-plugin-mdx. For now,
    // assume upstream build provides compiled MDX per slide (or use server).
    return { id: `mdx-${i}`, type: 'mdx', Content: Comp };
  }));
  return slides;
}