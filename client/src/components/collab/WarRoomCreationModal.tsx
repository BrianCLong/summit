import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
} from "@mui/material";
import { gql, useMutation } from "@apollo/client";

// In a real project, this would be in a .graphql file and imported
// after running a codegen process.
const CREATE_WAR_ROOM = gql`
  mutation CreateWarRoom($name: String!) {
    createWarRoom(name: $name) {
      id
      name
      createdAt
    }
  }
`;

interface WarRoomCreationModalProps {
  open: boolean;
  onClose: () => void;
  // The type for 'data' would come from generated types.
  // Using 'any' for now.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess: (data: any) => void;
}

const WarRoomCreationModal: React.FC<WarRoomCreationModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [createWarRoom, { loading, error }] = useMutation(CREATE_WAR_ROOM);

  const handleCreate = async () => {
    if (name.trim()) {
      try {
        const { data } = await createWarRoom({ variables: { name: name.trim() } });
        if (data) {
          onSuccess(data);
          setName("");
          onClose();
        }
      } catch (e) {
        // Error is already captured by the `error` object from useMutation
        console.error("Failed to create War Room:", e);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create a New War Room</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error.message}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          label="War Room Name"
          type="text"
          fullWidth
          variant="standard"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!name.trim() || loading}>
          {loading ? <CircularProgress size={24} /> : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WarRoomCreationModal;
