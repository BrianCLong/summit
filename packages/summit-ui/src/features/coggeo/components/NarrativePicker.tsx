import type { FC } from "react";
import type { Narrative } from "../types";

type Props = {
  narratives: Narrative[];
  selected: string | null;
  onSelect: (id: string) => void;
};

export const NarrativePicker: FC<Props> = ({ narratives, selected, onSelect }) => (
  <select
    aria-label="Select narrative"
    value={selected ?? ""}
    onChange={(event) => onSelect(event.target.value)}
  >
    <option value="">Select narrative</option>
    {narratives.map((narrative) => (
      <option key={narrative.id} value={narrative.id}>
        {narrative.label}
      </option>
    ))}
  </select>
);
