"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeStatus = exports.InvoiceStatus = void 0;
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["OPEN"] = "OPEN";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["VOID"] = "VOID";
    InvoiceStatus["UNCOLLECTIBLE"] = "UNCOLLECTIBLE";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["OPEN"] = "OPEN";
    DisputeStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    DisputeStatus["WON"] = "WON";
    DisputeStatus["LOST"] = "LOST";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
