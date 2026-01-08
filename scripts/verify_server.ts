import http from "http";
import { exec } from "child_process";

const server = exec("pnpm --filter intelgraph-server dev");

server.stdout.on("data", (data) => {
  console.log(`server stdout: ${data}`);
});

server.stderr.on("data", (data) => {
  console.error(`server stderr: ${data}`);
});

server.on("close", (code) => {
  console.log(`server process exited with code ${code}`);
});

const waitForServer = async () => {
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise((resolve, reject) => {
        http.get("http://localhost:4000/health", (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            reject(new Error(`Server not ready, status code: ${res.statusCode}`));
          }
        });
      });
      return;
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Server did not start in time");
};

const runVerification = async () => {
  try {
    await waitForServer();
    console.log("Server is healthy");
    // You can add a GraphQL query here to further test the application
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

runVerification();
