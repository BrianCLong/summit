"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@opentelemetry/api");
api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.INFO);
