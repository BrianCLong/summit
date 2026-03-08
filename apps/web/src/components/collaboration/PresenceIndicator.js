"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceIndicator = void 0;
const react_1 = __importDefault(require("react"));
const colors_1 = require("../../lib/utils/colors");
const PresenceIndicator = ({ presence, maxDisplay = 3 }) => {
    const displayedUsers = presence.slice(0, maxDisplay);
    const remaining = Math.max(0, presence.length - maxDisplay);
    return (<div className="flex items-center -space-x-2">
      {displayedUsers.map((user) => (<div key={user.userId} className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600" title={`${user.username || user.userId} (${user.status})`} style={{ backgroundColor: (0, colors_1.getStringColor)(user.userId), color: '#fff' }}>
          {user.username ? user.username.charAt(0).toUpperCase() : user.userId.slice(0, 2)}
          <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${user.status === 'online' ? 'bg-green-400' :
                user.status === 'busy' ? 'bg-red-400' :
                    user.status === 'away' ? 'bg-yellow-400' : 'bg-gray-400'}`}/>
        </div>))}
      {remaining > 0 && (<div className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-500">
          +{remaining}
        </div>)}
    </div>);
};
exports.PresenceIndicator = PresenceIndicator;
