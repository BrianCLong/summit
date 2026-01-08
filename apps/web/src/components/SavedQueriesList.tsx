import React, { useEffect, useState } from 'react'
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
} from '@mui/material'

interface SavedQueriesListProps {
  onSelect: (cypher: string) => void
}

export const SavedQueriesList: React.FC<SavedQueriesListProps> = ({
  onSelect,
}) => {
  const [queries, setQueries] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/query-studio/saved')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setQueries(data)
      })
      .catch(err => console.error(err))
  }, [])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Saved Queries
      </Typography>
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {queries.map(q => (
          <ListItem key={q.id} disablePadding>
            <ListItemButton onClick={() => onSelect(q.cypher)}>
              <ListItemText
                primary={q.name}
                secondary={q.description || q.created_by}
              />
            </ListItemButton>
          </ListItem>
        ))}
        {queries.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No saved queries found.
          </Typography>
        )}
      </List>
    </Box>
  )
}
