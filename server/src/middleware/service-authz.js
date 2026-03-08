"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceAuthzMiddleware = void 0;
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
const serviceAuthzMiddleware = async (req, res, next) => {
    const sourceSpiffeId = req.headers['x-spiffe-id'];
    const destinationService = req.hostname;
    if (!sourceSpiffeId) {
        return res.status(401).send('Missing SPIFFE ID');
    }
    try {
        const response = await axios_1.default.post('http://localhost:8181/v1/data/services/allow', {
            input: {
                source_spiffe_id: sourceSpiffeId,
                destination_service: destinationService,
            },
        });
        if (response.data.result) {
            next();
        }
        else {
            res.status(403).send('Forbidden');
        }
    }
    catch (error) {
        logger.error(error);
        res.status(500).send('Internal Server Error');
    }
};
exports.serviceAuthzMiddleware = serviceAuthzMiddleware;
