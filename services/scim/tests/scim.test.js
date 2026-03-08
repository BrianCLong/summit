"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const data_1 = require("../data");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/Users', (req, res) => {
    res.json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: data_1.users.length,
        Resources: data_1.users,
    });
});
app.get('/Groups', (req, res) => {
    res.json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: data_1.groups.length,
        Resources: data_1.groups,
    });
});
describe('SCIM Service', () => {
    it('should return a list of users', async () => {
        const res = await (0, supertest_1.default)(app).get('/Users');
        expect(res.statusCode).toEqual(200);
        expect(res.body.totalResults).toEqual(data_1.users.length);
        expect(res.body.Resources[0].userName).toEqual('jules@example.com');
    });
    it('should return a list of groups', async () => {
        const res = await (0, supertest_1.default)(app).get('/Groups');
        expect(res.statusCode).toEqual(200);
        expect(res.body.totalResults).toEqual(data_1.groups.length);
        expect(res.body.Resources[0].displayName).toEqual('Admins');
    });
});
