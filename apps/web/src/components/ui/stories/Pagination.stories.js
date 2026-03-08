"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithState = void 0;
const react_1 = __importDefault(require("react"));
const Pagination_1 = require("../Pagination");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Pagination',
    component: Pagination_1.Pagination,
};
exports.default = meta;
exports.WithState = {
    render: () => {
        const [page, setPage] = react_1.default.useState(2);
        return (<div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: (0, tokens_1.tokenVar)('ds-space-sm'),
                width: 'min(520px, 100%)',
            }}>
        <p className="text-sm text-muted-foreground">
          Showing results {(page - 1) * 10 + 1}–{page * 10} of 120
        </p>
        <Pagination_1.Pagination currentPage={page} totalPages={12} onPageChange={setPage} hasNext={page < 12} hasPrevious={page > 1}/>
      </div>);
    },
};
