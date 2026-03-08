"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pbacPlugin = () => ({
    async requestDidStart() {
        return {
            async willSendResponse() { }
        };
    }
});
exports.default = pbacPlugin;
