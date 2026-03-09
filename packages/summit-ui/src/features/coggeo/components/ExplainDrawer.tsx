import type { FC } from "react";
import type { ExplainPayload } from "../types";

type Props = {
  payload: ExplainPayload | null;
};

export const ExplainDrawer: FC<Props> = ({ payload }) => {
  if (!payload) {
    return <div role="complementary">No explain payload selected.</div>;
  }

  return (
    <div role="complementary">
      <h3>Explain</h3>
      <p>{payload.summary}</p>
      <small>Confidence: {payload.confidence}</small>
    </div>
  );
};
