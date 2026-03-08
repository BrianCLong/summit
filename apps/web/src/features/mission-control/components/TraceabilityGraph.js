"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TraceabilityGraph;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
function TraceabilityGraph() {
    return (<Card_1.Card className="h-[500px]">
      <Card_1.CardHeader>
        <Card_1.CardTitle>Traceability Graph</Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Graph Visualization Placeholder (Wish → Spec → Epic → PR → Shipped)</p>
      </Card_1.CardContent>
    </Card_1.Card>);
}
