"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const ToastContainer_1 = require("../ToastContainer");
const RealTimePresence = ({ currentUser, onUserClick, className = '', }) => {
    const [connectedUsers, setConnectedUsers] = (0, react_1.useState)([]);
    const [recentActivity, setRecentActivity] = (0, react_1.useState)([]);
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const [connectionStatus, setConnectionStatus] = (0, react_1.useState)('connecting');
    const wsRef = (0, react_1.useRef)(null);
    const toast = (0, ToastContainer_1.useToast)();
    // Simulate WebSocket connection for real-time presence
    (0, react_1.useEffect)(() => {
        const connectWebSocket = () => {
            setConnectionStatus('connecting');
            // Simulate WebSocket connection
            const mockWs = {
                send: (data) => {
                    console.log('Mock WS send:', data);
                },
                close: () => {
                    console.log('Mock WS closed');
                },
                readyState: 1, // OPEN
            };
            wsRef.current = mockWs;
            setConnectionStatus('connected');
            // Simulate initial user data
            const mockUsers = [
                {
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    avatar: currentUser.avatar,
                    role: currentUser.role,
                    status: 'active',
                    lastSeen: Date.now(),
                    currentLocation: {
                        route: '/investigations',
                        action: 'Viewing investigations dashboard',
                    },
                },
                {
                    id: 'user-2',
                    name: 'Sarah Chen',
                    email: 'sarah.chen@intelgraph.com',
                    role: 'analyst',
                    status: 'active',
                    lastSeen: Date.now() - 120000, // 2 minutes ago
                    currentLocation: {
                        route: '/search',
                        action: 'Analyzing network patterns',
                    },
                },
                {
                    id: 'user-3',
                    name: 'Marcus Rodriguez',
                    email: 'marcus.r@intelgraph.com',
                    role: 'investigator',
                    status: 'active',
                    lastSeen: Date.now() - 300000, // 5 minutes ago
                    currentLocation: {
                        route: '/graph',
                        action: 'Exploring entity relationships',
                    },
                },
                {
                    id: 'user-4',
                    name: 'Emma Thompson',
                    email: 'emma.t@intelgraph.com',
                    role: 'admin',
                    status: 'away',
                    lastSeen: Date.now() - 900000, // 15 minutes ago
                    currentLocation: {
                        route: '/admin',
                        action: 'System maintenance',
                    },
                },
            ];
            setConnectedUsers(mockUsers);
            // Simulate real-time activity updates
            const activityTimer = setInterval(() => {
                const activities = generateMockActivity();
                setRecentActivity((prev) => [...activities, ...prev].slice(0, 20));
            }, 15000); // New activity every 15 seconds
            // Simulate user status updates
            const statusTimer = setInterval(() => {
                setConnectedUsers((prev) => prev.map((user) => ({
                    ...user,
                    lastSeen: user.status === 'active' ? Date.now() : user.lastSeen,
                    status: Math.random() > 0.9 ? 'away' : user.status, // 10% chance to go away
                })));
            }, 30000); // Update every 30 seconds
            return () => {
                clearInterval(activityTimer);
                clearInterval(statusTimer);
            };
        };
        const cleanup = connectWebSocket();
        return () => {
            cleanup?.();
            wsRef.current?.close();
        };
    }, [currentUser]);
    const generateMockActivity = () => {
        const users = [
            'Sarah Chen',
            'Marcus Rodriguez',
            'Emma Thompson',
            'Alex Kumar',
        ];
        const activities = [
            {
                type: 'search',
                descriptions: [
                    'searched for "suspicious IP addresses"',
                    'executed advanced entity query',
                    'filtered results by confidence >90%',
                    'searched threat intelligence feeds',
                ],
            },
            {
                type: 'analysis',
                descriptions: [
                    'analyzed network topology patterns',
                    'identified entity clusters',
                    'generated relationship timeline',
                    'computed centrality scores',
                ],
            },
            {
                type: 'investigation',
                descriptions: [
                    'created new investigation "APT-2024-089"',
                    'updated investigation status to "Active"',
                    'added entities to investigation scope',
                    'assigned team members to investigation',
                ],
            },
            {
                type: 'export',
                descriptions: [
                    'exported executive summary report',
                    'generated technical analysis PDF',
                    'created forensic evidence package',
                    'scheduled automated report delivery',
                ],
            },
        ];
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomDescription = randomActivity.descriptions[Math.floor(Math.random() * randomActivity.descriptions.length)];
        return [
            {
                id: `activity-${Date.now()}-${Math.random()}`,
                userId: `user-${Math.floor(Math.random() * 4) + 1}`,
                userName: randomUser,
                type: randomActivity.type,
                description: randomDescription,
                timestamp: Date.now(),
                metadata: {
                    investigationId: randomActivity.type === 'investigation'
                        ? 'INV-2024-089'
                        : undefined,
                    searchQuery: randomActivity.type === 'search'
                        ? randomDescription.match(/"([^"]+)"/)?.[1]
                        : undefined,
                },
            },
        ];
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-400';
            case 'away':
                return 'bg-yellow-400';
            case 'offline':
                return 'bg-gray-400';
            default:
                return 'bg-gray-400';
        }
    };
    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return 'text-purple-600 bg-purple-100';
            case 'investigator':
                return 'text-blue-600 bg-blue-100';
            case 'analyst':
                return 'text-green-600 bg-green-100';
            case 'viewer':
                return 'text-gray-600 bg-gray-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };
    const getActivityIcon = (type) => {
        switch (type) {
            case 'search':
                return '🔍';
            case 'analysis':
                return '📊';
            case 'export':
                return '📤';
            case 'investigation':
                return '🔬';
            case 'edit':
                return '✏️';
            case 'comment':
                return '💬';
            default:
                return '📝';
        }
    };
    const formatTimeAgo = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        if (diff < 60000)
            return 'just now';
        if (diff < 3600000)
            return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000)
            return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };
    return (<div className={`real-time-presence bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected'
            ? 'bg-green-400'
            : connectionStatus === 'connecting'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-red-400'}`}/>
            <h3 className="font-semibold text-gray-900">Team Presence</h3>
          </div>
          <span className="text-sm text-gray-500">
            {connectedUsers.filter((u) => u.status === 'active').length} active
          </span>
        </div>

        <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-gray-400 hover:text-gray-600 rounded" title={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? '📐' : '📏'}
        </button>
      </div>

      {/* User Avatars */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {connectedUsers.slice(0, isExpanded ? undefined : 8).map((user) => (<div key={user.id} className="relative group cursor-pointer" onClick={() => onUserClick?.(user)}>
              <div className="relative">
                {user.avatar ? (<img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-gray-200"/>) : (<div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                  </div>)}

                {/* Status indicator */}
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}/>
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="font-semibold">{user.name}</div>
                <div className="text-gray-300">
                  {user.currentLocation?.action || 'Active'}
                </div>
                <div className={`inline-block px-2 py-1 rounded text-xs mt-1 ${getRoleColor(user.role)}`}>
                  {user.role}
                </div>
              </div>
            </div>))}

          {connectedUsers.length > 8 && !isExpanded && (<button onClick={() => setIsExpanded(true)} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 hover:bg-gray-200">
              +{connectedUsers.length - 8}
            </button>)}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (<>
          {/* User List */}
          <div className="border-t">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Active Team Members
              </h4>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {connectedUsers.map((user) => (<div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.avatar ? (<img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full"/>) : (<div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                          </div>)}
                        <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${getStatusColor(user.status)}`}/>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.currentLocation?.action ||
                    `Last seen ${formatTimeAgo(user.lastSeen)}`}
                        </div>
                      </div>
                    </div>

                    <div className={`px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                      {user.role}
                    </div>
                  </div>))}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="border-t">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Recent Activity
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {recentActivity.slice(0, 10).map((activity) => (<div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                      {getActivityIcon(activity.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">{activity.userName}</span>{' '}
                        <span>{activity.description}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                        {activity.metadata?.investigationId && (<span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                            {activity.metadata.investigationId}
                          </span>)}
                      </div>
                    </div>
                  </div>))}
              </div>
            </div>
          </div>
        </>)}

      {/* Connection Status */}
      {connectionStatus !== 'connected' && (<div className="p-3 bg-gray-50 border-t text-center">
          <div className="text-sm text-gray-600">
            {connectionStatus === 'connecting' ? (<span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin"/>
                Connecting to collaboration server...
              </span>) : (<span className="text-red-600">
                ⚠️ Connection lost. Trying to reconnect...
              </span>)}
          </div>
        </div>)}
    </div>);
};
exports.default = RealTimePresence;
