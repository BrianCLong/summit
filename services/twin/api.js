"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get('/v1/releases/:id', (req, res) => {
    res.json({
        id: req.params.id,
        controls: [
        /*...*/
        ],
        provenance: {
        /*...*/
        },
    });
});
app.listen(8090);
