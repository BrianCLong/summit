import React from 'react';
import { Tabs, Tab, Box, TextField, Stack, Button, Typography } from '@mui/material';

function TabPanel({ value, index, children }: any) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`search-tab-${index}`}>{value === index && <Box p={2}>{children}</Box>}</div>
  );
}

export default function SearchHome() {
  const [value, setValue] = React.useState(0);
  return (
    <Box p={2}>
      <Tabs value={value} onChange={(_, v) => setValue(v)} aria-label="Search tabs">
        <Tab label="Simple" />
        <Tab label="Advanced" />
        <Tab label="Semantic" />
        <Tab label="Graph" />
        <Tab label="Temporal" />
        <Tab label="Geospatial" />
      </Tabs>
      <TabPanel value={value} index={0}>
        <Stack direction="row" spacing={1}><TextField size="small" placeholder="Search…" inputProps={{ 'aria-label': 'Search input' }} /><Button variant="contained">Search</Button></Stack>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Typography>Advanced filters coming soon…</Typography>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Typography>Semantic search scaffold…</Typography>
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Typography>Graph search coming soon…</Typography>
      </TabPanel>
      <TabPanel value={value} index={4}>
        <Typography>Temporal search coming soon…</Typography>
      </TabPanel>
      <TabPanel value={value} index={5}>
        <Typography>Geospatial search coming soon…</Typography>
      </TabPanel>
    </Box>
  );
}

