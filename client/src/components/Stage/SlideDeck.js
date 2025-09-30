import { useEffect, useMemo, useState } from 'react';
import { MDXProvider } from ' @mdx-js/react';
import { Box, Typography } from ' @mui/material';
import PropTypes from 'prop-types';

// Split MDX by horizontal rule markers '---' into slides.
// Each slide becomes its own MDX component boundary by re-compiling via Vite loader.
// We rely on Vite MDX + dynamic import per deck; in-render slicing is simulated:
// strategy: render whole deck but only show the chosen "slide index" via CSS.
export default function SlideDeck({ DeckComponent, slide = 0 }) {
  // Render DeckComponent once; we add headings count to approximate pages.
  // Simpler approach: interpret sections separated by '---' using CSS blocks.
  // We'll add data-slide markers with a simple wrapper.
  const [maxSlides, setMaxSlides] = useState(1);

  const components = useMemo(() => ({
    hr: (props) => <div data-slide-sep="true" {...props} />,
    h1: (props) => <Typography variant="h4" gutterBottom {...props} />,
    h2: (props) => <Typography variant="h5" gutterBottom {...props} />,
    p: (props) => <Typography variant="body1" paragraph {...props} />,
    li: (props) => <li {...props} style={{ marginBottom: 6 }} />,
  }), []);

  useEffect(() => {
    // after mount, count separators to estimate slide count
    const root = document.getElementById('mdx-deck-root');
    if (!root) return;
    const seps = root.querySelectorAll('[data-slide-sep]');
    setMaxSlides(seps.length + 1);
  }, [DeckComponent]);

  return (
    <Box className="w-full h-full flex items-center justify-center">
      <Box
        className="w-[960px] h-[540px] rounded-xl shadow-lg p-8 overflow-auto bg-white dark:bg-neutral-900"
        sx={{ border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <MDXProvider components={components}>
          <div id="mdx-deck-root" data-current-slide={slide}>
            <DeckComponent />
          </div>
        </MDXProvider>
        <Typography variant="caption" sx={{ position: 'absolute', right: 16, bottom: 12, opacity: 0.7 }}>
          Slide {Math.max(1, Math.min(slide + 1, maxSlides))} / {maxSlides}
        </Typography>
      </Box>
    </Box>
  );
}

SlideDeck.propTypes = {
  DeckComponent: PropTypes.elementType.isRequired,
  slide: PropTypes.number,
};