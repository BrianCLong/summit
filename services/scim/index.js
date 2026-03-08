"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const data_1 = require("./data");
// SCIM 2.0 User Endpoint (read-only)
app.get('/Users', (req, res) => {
    console.log('Fetching users for SCIM');
    res.json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: data_1.users.length,
        Resources: data_1.users,
    });
});
// SCIM 2.0 Group Endpoint (read-only)
app.get('/Groups', (req, res) => {
    console.log('Fetching groups for SCIM');
    res.json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: data_1.groups.length,
        Resources: data_1.groups,
    });
});
function run() {
    const port = process.env.SCIM_PORT || 3003;
    app.listen(port, () => {
        console.log(`SCIM service running on port ${port}`);
    });
}
run();
