const express = require("express");
const path = require("path");

const app = express();
const port = 3001;

app.use("/bundles", express.static(path.join(__dirname, "bundles")));

app.listen(port, () => {
  console.log(`Bundle server listening at http://localhost:${port}`);
});
