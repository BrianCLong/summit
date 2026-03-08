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
exports.LocationProvider = exports.LocationContext = void 0;
// @ts-nocheck
const react_1 = __importStar(require("react"));
const LocationService_1 = require("../services/LocationService");
exports.LocationContext = (0, react_1.createContext)({
    location: null,
    isTracking: false,
    startTracking: () => { },
    stopTracking: () => { },
});
const LocationProvider = ({ children }) => {
    const [location, setLocation] = (0, react_1.useState)(null);
    const [isTracking, setIsTracking] = (0, react_1.useState)(false);
    const [watchId, setWatchId] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        return () => {
            if (watchId !== null) {
                (0, LocationService_1.clearLocationWatch)(watchId);
            }
        };
    }, [watchId]);
    const startTracking = () => {
        if (isTracking)
            return;
        const id = (0, LocationService_1.watchLocation)((loc) => {
            setLocation(loc);
        });
        setWatchId(id);
        setIsTracking(true);
    };
    const stopTracking = () => {
        if (watchId !== null) {
            (0, LocationService_1.clearLocationWatch)(watchId);
            setWatchId(null);
        }
        setIsTracking(false);
    };
    return (<exports.LocationContext.Provider value={{ location, isTracking, startTracking, stopTracking }}>
      {children}
    </exports.LocationContext.Provider>);
};
exports.LocationProvider = LocationProvider;
