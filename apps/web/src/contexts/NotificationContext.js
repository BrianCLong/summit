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
exports.useNotification = useNotification;
exports.NotificationProvider = NotificationProvider;
// =============================================
// Notification Context for Toast Messages
// =============================================
const react_1 = __importStar(require("react"));
const outline_1 = require("@heroicons/react/24/outline");
const NotificationContext = (0, react_1.createContext)(undefined);
function useNotification() {
    const context = (0, react_1.useContext)(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
}
function NotificationProvider({ children }) {
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    const showNotification = (notification) => {
        const id = Math.random().toString(36).slice(2);
        const newNotification = { id, ...notification };
        setNotifications(prev => [...prev, newNotification]);
        // Auto-remove after duration
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    };
    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };
    const clearAll = () => {
        setNotifications([]);
    };
    return (<NotificationContext.Provider value={{
            notifications,
            showNotification,
            removeNotification,
            clearAll,
        }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>);
}
// Toast container component
function NotificationContainer() {
    const { notifications, removeNotification } = useNotification();
    if (notifications.length === 0) {
        return null;
    }
    return (<div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (<NotificationToast key={notification.id} notification={notification} onClose={() => removeNotification(notification.id)}/>))}
    </div>);
}
function NotificationToast({ notification, onClose }) {
    const getIcon = () => {
        switch (notification.type) {
            case 'success':
                return <outline_1.CheckCircleIcon className="h-5 w-5 text-green-500"/>;
            case 'error':
                return <outline_1.XCircleIcon className="h-5 w-5 text-red-500"/>;
            case 'warning':
                return <outline_1.ExclamationCircleIcon className="h-5 w-5 text-yellow-500"/>;
            case 'info':
                return <outline_1.InformationCircleIcon className="h-5 w-5 text-blue-500"/>;
        }
    };
    const getBgColor = () => {
        switch (notification.type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200';
            case 'info':
                return 'bg-blue-50 border-blue-200';
        }
    };
    return (<div className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto border ${getBgColor()}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getIcon()}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-900">
              {notification.title}
            </p>
            {notification.message && (<p className="mt-1 text-sm text-gray-500">
                {notification.message}
              </p>)}
            {notification.action && (<div className="mt-3">
                <button className="text-sm font-medium text-blue-600 hover:text-blue-500" onClick={notification.action.onClick}>
                  {notification.action.label}
                </button>
              </div>)}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" onClick={onClose}>
              <span className="sr-only">Close</span>
              <outline_1.XCircleIcon className="h-5 w-5"/>
            </button>
          </div>
        </div>
      </div>
    </div>);
}
