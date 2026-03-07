import React from "react";
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Avatar,
  AvatarGroup,
} from "@mui/material";

// Assuming WarRoom and User types are available
interface WarRoom {
  id: string;
  name: string;
  participants: { user: { name: string; avatar?: string } }[];
}

interface WarRoomCardProps {
  warRoom: WarRoom;
  onJoin: (warRoomId: string) => void;
}

const WarRoomCard: React.FC<WarRoomCardProps> = ({ warRoom, onJoin }) => {
  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div">
          {warRoom.name}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          {warRoom.participants.length} participants
        </Typography>
        <AvatarGroup max={4}>
          {warRoom.participants.map((p, index) => (
            <Avatar key={index}>{p.user.name.charAt(0)}</Avatar>
          ))}
        </AvatarGroup>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onJoin(warRoom.id)}>
          Join War Room
        </Button>
      </CardActions>
    </Card>
  );
};

export default WarRoomCard;
