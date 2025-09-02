import { createClient } from "../src";
const BASE_URL = "http://localhost:8080"; // Replace with your Maestro API URL
const TOKEN = "your_token_here"; // Replace with your actual token or leave undefined
async function main() {
    const client = createClient(BASE_URL, TOKEN);
    try {
        console.log("Listing runs...");
        const runs = await client.listRuns();
        console.log("Runs:", runs.data); // Assuming runs.data contains the array of runs
    }
    catch (error) {
        console.error("Error listing runs:", error);
    }
}
main();
