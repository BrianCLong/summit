"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyChip = void 0;
const react_1 = __importDefault(require("react"));
const InfoOutlined_1 = __importDefault(require("@mui/icons-material/InfoOutlined"));
const PolicyChip = ({ reason, onExplain }) => (<button className="policy-chip" aria-label={`Policy: ${reason}`} onClick={onExplain} title={reason}>
    <InfoOutlined_1.default fontSize="small"/> Policy
  </button>);
exports.PolicyChip = PolicyChip;
