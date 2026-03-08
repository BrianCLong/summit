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
exports.ExecutiveDashboard = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const KPIView_1 = require("./KPIView");
const Tabs_1 = require("@/components/ui/Tabs");
const useAuth_1 = require("@/hooks/useAuth"); // Assuming auth hook exists
const ExecutiveDashboard = () => {
    const { user } = (0, useAuth_1.useAuth)();
    const [role, setRole] = (0, react_1.useState)('CEO');
    const [metrics, setMetrics] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchDashboard(role);
    }, [role]);
    const fetchDashboard = async (selectedRole) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token'); // Or however auth is handled
            const res = await fetch(`/summitsight/exec-dashboard/${selectedRole}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.metrics) {
                setMetrics(data.metrics);
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Summitsight Executive Intelligence</h1>
                <div className="text-sm text-gray-500">
                    Viewing as: <span className="font-mono font-bold text-gray-800">{user?.email || 'Guest'}</span>
                </div>
            </div>

            <Tabs_1.Tabs defaultValue="CEO" onValueChange={(val) => setRole(val)} className="w-full">
                <Tabs_1.TabsList className="grid w-full max-w-md grid-cols-3">
                    <Tabs_1.TabsTrigger value="CEO">CEO</Tabs_1.TabsTrigger>
                    <Tabs_1.TabsTrigger value="CTO">CTO</Tabs_1.TabsTrigger>
                    <Tabs_1.TabsTrigger value="CISO">CISO</Tabs_1.TabsTrigger>
                </Tabs_1.TabsList>

                <Tabs_1.TabsContent value={role} className="mt-6">
                    {loading ? (<div className="flex justify-center p-12">Loading intelligence...</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {metrics.map((m) => (<KPIView_1.KPIView key={m.definition.kpi_id} data={m}/>))}
                        </div>)}
                </Tabs_1.TabsContent>
            </Tabs_1.Tabs>
        </div>);
};
exports.ExecutiveDashboard = ExecutiveDashboard;
