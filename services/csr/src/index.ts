import { createApp } from "./app";

const { app } = createApp();

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4102;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Consent State Reconciler service listening on port ${port}`);
});
