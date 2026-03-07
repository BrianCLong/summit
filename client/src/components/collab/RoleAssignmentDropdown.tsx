import React, { useState } from "react";
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@mui/material";

// Assuming a User type is available
interface User {
  id: string;
  name: string;
}

interface RoleAssignmentDropdownProps {
  participant: User;
  onRoleChange: (userId: string, role: string) => void;
}

const RoleAssignmentDropdown: React.FC<RoleAssignmentDropdownProps> = ({
  participant,
  onRoleChange,
}) => {
  const [role, setRole] = useState("PARTICIPANT");

  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    const newRole = event.target.value;
    setRole(newRole);
    onRoleChange(participant.id, newRole);
  };

  return (
    <FormControl fullWidth variant="standard">
      <InputLabel>Role</InputLabel>
      <Select value={role} onChange={handleRoleChange}>
        <MenuItem value="PARTICIPANT">Participant</MenuItem>
        <MenuItem value="MODERATOR">Moderator</MenuItem>
        <MenuItem value="ADMIN">Admin</MenuItem>
      </Select>
    </FormControl>
  );
};

export default RoleAssignmentDropdown;
