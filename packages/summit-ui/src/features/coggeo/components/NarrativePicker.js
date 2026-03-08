"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativePicker = void 0;
const NarrativePicker = ({ narratives, selected, onSelect }) => (<select value={selected ?? ""} onChange={(event) => onSelect(event.target.value)}>
    <option value="">Select narrative</option>
    {narratives.map((narrative) => (<option key={narrative.id} value={narrative.id}>
        {narrative.label}
      </option>))}
  </select>);
exports.NarrativePicker = NarrativePicker;
