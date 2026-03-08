"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const WarRoomCard = ({ warRoom, onJoin }) => {
    return (<material_1.Card sx={{ minWidth: 275, mb: 2 }}>
      <material_1.CardContent>
        <material_1.Typography variant="h5" component="div">
          {warRoom.name}
        </material_1.Typography>
        <material_1.Typography sx={{ mb: 1.5 }} color="text.secondary">
          {warRoom.participants.length} participants
        </material_1.Typography>
        <material_1.AvatarGroup max={4}>
          {warRoom.participants.map((p, index) => (<material_1.Avatar key={index}>{p.user.name.charAt(0)}</material_1.Avatar>))}
        </material_1.AvatarGroup>
      </material_1.CardContent>
      <material_1.CardActions>
        <material_1.Button size="small" onClick={() => onJoin(warRoom.id)}>
          Join War Room
        </material_1.Button>
      </material_1.CardActions>
    </material_1.Card>);
};
exports.default = WarRoomCard;
