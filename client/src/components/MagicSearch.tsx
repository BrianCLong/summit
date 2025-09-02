import React, { useState } from 'react';
import { gql, useApolloClient, DocumentNode } from '@apollo/client';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

interface ParsedQuery {
  query: DocumentNode;
  variables: Record<string, any>;
}

const ENTITY_SUGGESTIONS = ['APT actor', 'campaign', 'target', 'malware'];

const RELATION_SUGGESTIONS = ['linked to', 'associated with', 'targets'];

const EXAMPLE = 'Show all APT actors linked to finance-themed targets';

function parseNaturalQuery(text: string): ParsedQuery | null {
  const m = /show all (.+) linked to (.+)-themed targets/i.exec(text);
  if (m) {
    const theme = m[2];
    return {
      query: gql`
        query ($theme: String!) {
          aptActors(filter: { targetTheme: $theme }) {
            id
            name
          }
        }
      `,
      variables: { theme },
    };
  }
  return null;
}

export default function MagicSearch() {
  const client = useApolloClient();
  const [input, setInput] = useState('');
  const [graphql, setGraphql] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const options = [...ENTITY_SUGGESTIONS, ...RELATION_SUGGESTIONS];

  const runSearch = async () => {
    const parsed = parseNaturalQuery(input);
    if (!parsed) return;
    setGraphql(parsed.query.loc?.source.body || '');
    try {
      const { data } = await client.query({
        query: parsed.query,
        variables: parsed.variables,
      });
      setResults(data?.aptActors || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Autocomplete
        freeSolo
        options={options}
        inputValue={input}
        onInputChange={(_, v) => setInput(v)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Magic Search"
            placeholder="Ask in natural language"
            helperText={`Try: ${EXAMPLE}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            fullWidth
          />
        )}
      />

      {graphql && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Generated GraphQL query</Typography>
          <pre>{graphql}</pre>
        </Box>
      )}

      {results.length > 0 && (
        <List>
          {results.map((r) => (
            <ListItem key={r.id}>
              <ListItemText primary={r.name || r.id} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
