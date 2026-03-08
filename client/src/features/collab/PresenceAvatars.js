"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const Avatar_1 = __importDefault(require("@mui/material/Avatar"));
const Stack_1 = __importDefault(require("@mui/material/Stack"));
/**
 * PresenceAvatars renders collaborator avatars for the current session.
 */
const PresenceAvatars = ({ users }) => (<Stack_1.default direction="row" spacing={1} data-testid="presence-avatars">
    {users.map((u) => (<Avatar_1.default key={u.id} sx={{ bgcolor: u.color || 'primary.main', width: 24, height: 24 }} title={u.name}>
        {u.name.charAt(0).toUpperCase()}
      </Avatar_1.default>))}
  </Stack_1.default>);
exports.default = PresenceAvatars;
