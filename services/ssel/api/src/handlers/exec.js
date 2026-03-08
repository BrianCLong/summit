"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execHandler = void 0;
const execHandler = async (req, res) => {
    const body = req.body;
    console.log('Exec request:', body);
    const response = {
        exitCode: 0,
        stdout: 'Mock execution',
        stderr: ''
    };
    res.status(200).json(response);
};
exports.execHandler = execHandler;
