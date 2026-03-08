"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTabs = void 0;
const react_1 = __importDefault(require("react"));
const Tabs_1 = require("../Tabs");
const Card_1 = require("../Card");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Tabs',
    component: Tabs_1.Tabs,
};
exports.default = meta;
exports.DefaultTabs = {
    render: () => (<Tabs_1.Tabs defaultValue="overview">
      <Tabs_1.TabsList className="grid w-[360px] grid-cols-3">
        <Tabs_1.TabsTrigger value="overview">Overview</Tabs_1.TabsTrigger>
        <Tabs_1.TabsTrigger value="signals">Signals</Tabs_1.TabsTrigger>
        <Tabs_1.TabsTrigger value="audit">Audit</Tabs_1.TabsTrigger>
      </Tabs_1.TabsList>
      <Tabs_1.TabsContent value="overview">
        <Card_1.Card style={{ marginTop: (0, tokens_1.tokenVar)('ds-space-sm') }}>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Activity summary</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <p className="text-sm text-muted-foreground">
              Analysts completed 12 reviews in the last hour.
            </p>
          </Card_1.CardContent>
        </Card_1.Card>
      </Tabs_1.TabsContent>
      <Tabs_1.TabsContent value="signals">
        <Card_1.Card style={{ marginTop: (0, tokens_1.tokenVar)('ds-space-sm') }}>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Signals</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground">
              <li>3 anomalous login attempts</li>
              <li>1 data egress spike</li>
              <li>2 geo-fence violations</li>
            </ul>
          </Card_1.CardContent>
        </Card_1.Card>
      </Tabs_1.TabsContent>
      <Tabs_1.TabsContent value="audit">
        <Card_1.Card style={{ marginTop: (0, tokens_1.tokenVar)('ds-space-sm') }}>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Audit trail</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <p className="text-sm text-muted-foreground">
              Audit events stream to the governance ledger automatically.
            </p>
          </Card_1.CardContent>
        </Card_1.Card>
      </Tabs_1.TabsContent>
    </Tabs_1.Tabs>),
};
