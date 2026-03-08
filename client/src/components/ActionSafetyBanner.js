"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ActionSafetyBanner = ({ status, reason, appealUrl, }) => {
    return (<div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h3>Action Safety Status: {status}</h3>
      {reason && <p>Reason: {reason}</p>}
      {appealUrl && (<p>
          <a href={appealUrl} target="_blank" rel="noopener noreferrer">
            Appeal
          </a>
        </p>)}
    </div>);
};
exports.default = ActionSafetyBanner;
