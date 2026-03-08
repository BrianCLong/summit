"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStatus = ConnectionStatus;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const SocketContext_1 = require("@/contexts/SocketContext");
function ConnectionStatus({ className }) {
    const { connected, socket } = (0, SocketContext_1.useSocket)();
    const getStatus = () => {
        if (!socket) {
            return 'disconnected';
        }
        if (connected) {
            return 'connected';
        }
        return 'connecting';
    };
    const status = getStatus();
    const statusConfig = {
        connected: {
            icon: lucide_react_1.Wifi,
            text: 'Live',
            className: 'bg-green-100 text-green-800 border-green-200',
            iconClassName: 'text-green-600',
        },
        connecting: {
            icon: lucide_react_1.Loader2,
            text: 'Connecting',
            className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            iconClassName: 'text-yellow-600 animate-spin',
        },
        disconnected: {
            icon: lucide_react_1.WifiOff,
            text: 'Offline',
            className: 'bg-gray-100 text-gray-800 border-gray-200',
            iconClassName: 'text-gray-600',
        },
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    return (<div className={(0, utils_1.cn)('flex items-center gap-2 px-3 py-1 border rounded-full text-sm font-medium', config.className, className)}>
      <Icon className={(0, utils_1.cn)('h-3 w-3', config.iconClassName)}/>
      <span>{config.text}</span>
    </div>);
}
