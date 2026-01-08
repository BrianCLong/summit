import React, { useState } from "react";
import {
  Autocomplete,
  TextField,
  Chip,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Box,
} from "@mui/material";

// Assuming a User type is available
interface User {
  id: string;
  name: string;
}

interface ParticipantSelectorProps {
  onParticipantsChange: (participants: User[]) => void;
}

// Mock user data for demonstration
const mockUsers: User[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
  { id: "3", name: "Charlie" },
  { id: "4", name: "Diana" },
];

const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({ onParticipantsChange }) => {
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectionChange = (event: any, newValue: User[]) => {
    setSelectedParticipants(newValue);
    onParticipantsChange(newValue);
  };

  return (
    <Autocomplete
      multiple
      options={mockUsers}
      getOptionLabel={(option) => option.name}
      value={selectedParticipants}
      onChange={handleSelectionChange}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          label="Add Participants"
          placeholder="Search for users..."
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip variant="outlined" label={option.name} {...getTagProps({ index })} />
        ))
      }
    />
  );
};

export default ParticipantSelector;
