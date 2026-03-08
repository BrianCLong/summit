"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putArtifactHandler = exports.getArtifactHandler = void 0;
const getArtifactHandler = async (req, res) => {
    const { path } = req.params;
    console.log('Get artifact:', path);
    res.status(501).send('Not Implemented');
};
exports.getArtifactHandler = getArtifactHandler;
const putArtifactHandler = async (req, res) => {
    const { path } = req.params;
    console.log('Put artifact:', path);
    res.status(501).send('Not Implemented');
};
exports.putArtifactHandler = putArtifactHandler;
