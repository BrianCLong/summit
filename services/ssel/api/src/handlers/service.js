"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exposeServiceHandler = void 0;
const exposeServiceHandler = async (req, res) => {
    const body = req.body;
    console.log('Expose service:', body);
    res.status(501).send('Not Implemented');
};
exports.exposeServiceHandler = exposeServiceHandler;
