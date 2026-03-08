"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContrastBudgeter = ContrastBudgeter;
const react_1 = __importDefault(require("react"));
const contrast_1 = require("../utils/contrast");
function ContrastBudgeter({ palette, minimumRatio }) {
    const results = (0, contrast_1.evaluateContrastBudget)(palette, minimumRatio);
    return (<table className="table" role="grid" aria-label="contrast budget">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Ratio</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {results.map((entry) => (<tr key={entry.name}>
            <td>{entry.name}</td>
            <td>{entry.ratio.toFixed(2)}:1</td>
            <td aria-label={entry.pass ? 'passes contrast budget' : 'fails contrast budget'}>
              {entry.pass ? 'Passes AA' : 'Needs adjustment'}
            </td>
          </tr>))}
      </tbody>
    </table>);
}
