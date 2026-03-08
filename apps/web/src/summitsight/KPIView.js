"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KPIView = void 0;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
exports.KPIView = react_1.default.memo(({ data, onClick }) => {
    const { definition, currentValue, status } = data;
    const colorClass = status === 'green' ? 'text-green-500' : (status === 'yellow' ? 'text-yellow-500' : 'text-red-500');
    const bgClass = status === 'green' ? 'bg-green-50' : (status === 'yellow' ? 'bg-yellow-50' : 'bg-red-50');
    return (<Card_1.Card className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${status === 'green' ? 'border-l-green-500' : status === 'yellow' ? 'border-l-yellow-500' : 'border-l-red-500'}`} onClick={onClick}>
            <Card_1.CardHeader className="pb-2">
                <Card_1.CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {definition.name}
                </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-3xl font-bold text-gray-900">
                            {currentValue !== null ? currentValue.toFixed(1) : '-'}
                        </span>
                        <span className="ml-1 text-sm text-gray-500">{definition.unit}</span>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${bgClass} ${colorClass}`}>
                       {status.toUpperCase()}
                    </div>
                </div>
                {definition.description && (<p className="mt-2 text-xs text-gray-400 truncate" title={definition.description}>
                        {definition.description}
                    </p>)}
            </Card_1.CardContent>
        </Card_1.Card>);
});
exports.KPIView.displayName = 'KPIView';
