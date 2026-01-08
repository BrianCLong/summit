// @ts-nocheck
import React from "react";

export interface AxisProps {
  orientation: "top" | "bottom" | "left" | "right";
  scale: any;
  tickFormat?: (value: any) => string;
  tickCount?: number;
}

export const Axis: React.FC<AxisProps> = ({ orientation, scale, tickFormat, tickCount }) => {
  return <g className={`axis axis-${orientation}`}></g>;
};

export default Axis;
