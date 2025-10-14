import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, List, ListItem, ListItemText, Typography } from '@mui/material';
import { ActivityAPI } from '../../services/api';

export default function ActivityWidget() {
  const [rows, setRows] = useState([]);

  const load = async () => {
    try {
      const data = await ActivityAPI.list(10, false);
      setRows(data);
    } catch (_) {}
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <Card>
      <CardHeader title="Recent Activity" sx={{ pb: 0 }} />
      <CardContent sx={{ pt: 1 }}>
        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary">No recent activity</Typography>
        )}
        <List dense>
          {rows.map((r) => (
            <ListItem key={r.id} disableGutters>
              <ListItemText
                primary={`${r.action} — ${r.resource_type || r.resourceType || ''}:${r.resource_id || r.resourceId || ''}`}
                secondary={new Date(r.created_at || r.createdAt).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

