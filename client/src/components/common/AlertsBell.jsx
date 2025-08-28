import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { IconButton, Badge, Menu, MenuItem, ListItemText, Snackbar, Alert as MUIAlert, Button, Box } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddCaseModal from '../cases/AddCaseModal'; // New import

const GET_ALERTS = gql`
  query Alerts($limit: Int, $onlyUnread: Boolean) {
    alerts(limit: $limit, onlyUnread: $onlyUnread) {
      id
      severity
      title
      message
      link
      createdAt
    }
  }
`;

const MARK_READ = gql`
  mutation MarkAlertRead($id: ID!) {
    markAlertRead(id: $id)
  }
`;

export default function AlertsBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [snack, setSnack] = useState(null);
  const [addCaseModalOpen, setAddCaseModalOpen] = useState(false); // New state for modal
  const [selectedAlert, setSelectedAlert] = useState(null); // To store the alert being added to case

  const open = Boolean(anchorEl);
  const { data, refetch } = useQuery(GET_ALERTS, { variables: { limit: 10, onlyUnread: true }, pollInterval: 15000 });
  const [markRead] = useMutation(MARK_READ, { onCompleted: () => refetch() });

  const alerts = data?.alerts || [];
  const count = alerts.length;

  // Show toast on newest alert
  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[0];
      setSnack({ severity: latest.severity || 'info', title: latest.title, message: latest.message });
    }
  }, [alerts.length]);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const onClickAlert = async (a) => {
    await markRead({ variables: { id: a.id } });
    if (a.link) window.location.href = a.link;
  };

  const handleAddToCaseClick = (alert) => {
    setSelectedAlert(alert);
    setAddCaseModalOpen(true);
    handleClose(); // Close the menu
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} aria-label="alerts">
        <Badge badgeContent={count} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} keepMounted>
        {alerts.length === 0 && <MenuItem disabled>No new alerts</MenuItem>}
        {alerts.map((a) => (
          <MenuItem key={a.id} onClick={() => onClickAlert(a)}>
            <ListItemText primary={a.title} secondary={a.message} />
            <Button size="small" onClick={(e) => { e.stopPropagation(); handleAddToCaseClick(a); }}>Add to Case</Button>
          </MenuItem>
        ))}
      </Menu>
      <Snackbar open={!!snack} autoHideDuration={6000} onClose={() => setSnack(null)}>
        <MUIAlert onClose={() => setSnack(null)} severity={snack?.severity || 'info'} variant="filled" sx={{ width: '100%' }}>
          <strong>{snack?.title}:</strong> {snack?.message}
        </MUIAlert>
      </Snackbar>

      {selectedAlert && (
        <AddCaseModal
          open={addCaseModalOpen}
          handleClose={() => {
            setAddCaseModalOpen(false);
            setSelectedAlert(null); // Clear selected alert on close
          }}
          itemKind="ALERT"
          itemRefId={selectedAlert.id}
        />
      )}
    </>
  );
}

