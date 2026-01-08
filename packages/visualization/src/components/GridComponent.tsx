// @ts-nocheck
import React from "react";

export interface GridProps {
  xScale?: any;
  yScale?: any;
  width: number;
  height: number;
  strokeDasharray?: string;
}

export const Grid: React.FC<GridProps> = ({
  xScale,
  yScale,
  width,
  height,
  strokeDasharray = "3,3",
}) => {
  return <g className="grid"></g>;
};

export default Grid;
