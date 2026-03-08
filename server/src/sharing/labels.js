"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLabelMetadata = exports.assertLabelImmutable = exports.createImmutableLabel = void 0;
const store_js_1 = require("./store.js");
const createImmutableLabel = (payload) => {
    return (0, store_js_1.createLabel)(payload);
};
exports.createImmutableLabel = createImmutableLabel;
const assertLabelImmutable = (existing, incomingId) => {
    if (existing && incomingId && existing.id !== incomingId) {
        throw new Error('label_is_immutable');
    }
};
exports.assertLabelImmutable = assertLabelImmutable;
const getLabelMetadata = (id) => (0, store_js_1.getLabel)(id);
exports.getLabelMetadata = getLabelMetadata;
