import type { FC } from "react";
import type { TerrainCell } from "../types";

type Props = {
  cells: TerrainCell[];
};

export const MapView: FC<Props> = ({ cells }) => (
  <section>
    <h3>Cognitive Weather Radar</h3>
    <p>Terrain cells rendered: {cells.length}</p>
  </section>
);
