import type { FC } from "react";
import type { ExplainPayload } from "../types";

type Props = {
  payload: ExplainPayload | null;
};

export const ExplainDrawer: FC<Props> = ({ payload }) => {
  if (!payload) {
    return <aside>No explain payload selected.</aside>;
  }

  return (
    <aside>
      <h3>Explain</h3>
      <p>{payload.summary}</p>
      <small>Confidence: {payload.confidence}</small>
    </aside>
  );
};
