import { MDXProvider } from ' @mdx-js/react';
import { Typography, Box, Link, List, ListItem } from ' @mui/material';

const components = {
  h1: (p)=><Typography variant="h3" gutterBottom {...p} />,
  h2: (p)=><Typography variant="h4" gutterBottom {...p} />,
  h3: (p)=><Typography variant="h5" gutterBottom {...p} />,
  p:  (p)=><Typography variant="body1" gutterBottom {...p} />,
  a:  (p)=><Link {...p} />,
  ul: (p)=><List dense {...p} />,
  li: (p)=><ListItem sx={{ display:'list-item' }} {...p} />,
  code: (p)=><Box component="code" sx={{ p:0.5, borderRadius:1, bgcolor:'action.hover' }} {...p} />
};

export default function SlideMDX({ Content }) {
  // Content is the compiled MDX component (one slide)
  return (
    <MDXProvider components={components}>
      <Box sx={{ p: 3, maxWidth: '80ch', mx: 'auto' }}>
        <Content />
      </Box>
    </MDXProvider>
  );
}