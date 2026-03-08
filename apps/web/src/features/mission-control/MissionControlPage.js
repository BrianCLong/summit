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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MissionControlPage;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_2 = require("@apollo/client/react");
const Tabs_1 = require("@/components/ui/Tabs");
const queries_1 = require("./graphql/queries");
const StrategyWall_1 = __importDefault(require("./components/StrategyWall"));
const HealthSignals_1 = __importDefault(require("./components/HealthSignals"));
const TraceabilityGraph_1 = __importDefault(require("./components/TraceabilityGraph"));
const DecisionLog_1 = __importDefault(require("./components/DecisionLog"));
const CommitmentsRegister_1 = __importDefault(require("./components/CommitmentsRegister"));
function MissionControlPage() {
    const [selectedPlanId, setSelectedPlanId] = (0, react_1.useState)(null);
    const [userRole, setUserRole] = (0, react_1.useState)('EXEC');
    const { data: listData, loading: listLoading } = (0, react_2.useQuery)(queries_1.GET_STRATEGIC_PLANS, {
        variables: { filter: { status: 'ACTIVE' } },
    });
    const { data: detailData, loading: detailLoading } = (0, react_2.useQuery)(queries_1.GET_STRATEGIC_PLAN_DETAILS, {
        variables: { id: selectedPlanId },
        skip: !selectedPlanId,
    });
    (0, react_1.useEffect)(() => {
        if (listData?.strategicPlans?.data?.length > 0 && !selectedPlanId) {
            setSelectedPlanId(listData.strategicPlans.data[0].id);
        }
    }, [listData, selectedPlanId]);
    return (<div className="container mx-auto p-6 space-y-8 min-h-screen bg-background">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
           <p className="text-muted-foreground">One cockpit for reality.</p>
        </div>
        <div className="flex gap-4">
             <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="px-3 py-2 border rounded-md text-sm bg-background" aria-label="Select Role View">
                <option value="EXEC">Exec View</option>
                <option value="PM">PM View</option>
                <option value="ENG">Eng Lead View</option>
                <option value="IC">IC View</option>
            </select>

           <select value={selectedPlanId || ''} onChange={(e) => setSelectedPlanId(e.target.value)} disabled={listLoading || !listData?.strategicPlans?.data?.length} className="w-[200px] px-3 py-2 border rounded-md text-sm bg-background" aria-label="Select Strategic Plan">
            {!selectedPlanId && <option value="">Select Plan</option>}
            {listData?.strategicPlans?.data?.map((plan) => (<option key={plan.id} value={plan.id}>{plan.name}</option>))}
           </select>
        </div>
      </div>

      <HealthSignals_1.default progress={detailData?.planProgress} kpis={detailData?.strategicPlan?.kpis}/>

      <Tabs_1.Tabs defaultValue="strategy" className="w-full">
        <Tabs_1.TabsList className="grid w-full grid-cols-5">
          <Tabs_1.TabsTrigger value="strategy">Strategy Wall</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="commitments">Commitments</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="traceability">Traceability</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="decisions">Decisions</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="health">Deep Health</Tabs_1.TabsTrigger>
        </Tabs_1.TabsList>

        <Tabs_1.TabsContent value="strategy" className="mt-6">
          <StrategyWall_1.default plan={detailData?.strategicPlan} loading={detailLoading}/>
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="commitments" className="mt-6">
          <CommitmentsRegister_1.default plan={detailData?.strategicPlan}/>
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="traceability" className="mt-6">
          <TraceabilityGraph_1.default />
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="decisions" className="mt-6">
          <DecisionLog_1.default plan={detailData?.strategicPlan}/>
        </Tabs_1.TabsContent>

        <Tabs_1.TabsContent value="health" className="mt-6">
          <HealthSignals_1.default progress={detailData?.planProgress} kpis={detailData?.strategicPlan?.kpis}/>
        </Tabs_1.TabsContent>
      </Tabs_1.Tabs>
    </div>);
}
