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
exports.ExplainPanel = void 0;
const react_1 = __importStar(require("react"));
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Table_1 = require("@/components/ui/Table");
const lucide_react_1 = require("lucide-react");
const ExplainPanel = ({ details }) => {
    const [showContributions, setShowContributions] = (0, react_1.useState)(false);
    if (!details) {
        return (<Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>Explanation</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>No data</Card_1.CardContent>
      </Card_1.Card>);
    }
    return (<Card_1.Card>
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Info className="h-4 w-4"/> ER Explainer
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span>Score:</span>
          <Badge_1.Badge variant={details.score && details.score > 0.8 ? 'default' : 'secondary'}>
            {details.score !== undefined ? Math.round(details.score * 100) : '—'}%
          </Badge_1.Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Confidence:</span>
          <span>
            {details.confidence !== undefined
            ? `${Math.round(details.confidence * 100)}%`
            : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Method:</span>
          <span>{details.method ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Threshold:</span>
          <span>
            {details.threshold !== undefined
            ? `${Math.round(details.threshold * 100)}%`
            : '—'}
          </span>
        </div>
        <div>
          <strong>Rationale:</strong>
          {details.rationale && details.rationale.length > 0 ? (<ul className="list-disc pl-5">
              {details.rationale.map((rationale, index) => (<li key={index}>{rationale}</li>))}
            </ul>) : (<div className="text-sm text-muted-foreground">No rationale provided.</div>)}
        </div>
        {details.featureContributions && details.featureContributions.length > 0 && (<div className="space-y-2">
            <Button_1.Button variant="secondary" size="sm" onClick={() => setShowContributions(prev => !prev)}>
              {showContributions ? (<>
                  <lucide_react_1.ChevronUp className="mr-2 h-4 w-4"/> Hide feature contributions
                </>) : (<>
                  <lucide_react_1.ChevronDown className="mr-2 h-4 w-4"/> Show feature contributions
                </>)}
            </Button_1.Button>
            {showContributions && (<div className="rounded-md border">
                <Table_1.Table>
                  <Table_1.TableHeader>
                    <Table_1.TableRow>
                      <Table_1.TableHead>Feature</Table_1.TableHead>
                      <Table_1.TableHead>Value</Table_1.TableHead>
                      <Table_1.TableHead>Weight</Table_1.TableHead>
                      <Table_1.TableHead>Contribution</Table_1.TableHead>
                    </Table_1.TableRow>
                  </Table_1.TableHeader>
                  <Table_1.TableBody>
                    {details.featureContributions.map(row => (<Table_1.TableRow key={row.feature}>
                        <Table_1.TableCell className="font-medium">{row.feature}</Table_1.TableCell>
                        <Table_1.TableCell>
                          {typeof row.value === 'boolean'
                        ? row.value
                            ? 'true'
                            : 'false'
                        : row.value.toFixed(3)}
                        </Table_1.TableCell>
                        <Table_1.TableCell>{(row.weight * 100).toFixed(0)}%</Table_1.TableCell>
                        <Table_1.TableCell>
                          {(row.normalizedContribution * 100).toFixed(1)}%
                        </Table_1.TableCell>
                      </Table_1.TableRow>))}
                  </Table_1.TableBody>
                </Table_1.Table>
              </div>)}
          </div>)}
      </Card_1.CardContent>
    </Card_1.Card>);
};
exports.ExplainPanel = ExplainPanel;
