"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = get;
exports.post = post;
exports.put = put;
exports.del = del;
const toResponse = (body, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => body,
});
async function get(path) {
    return toResponse({ path, method: 'GET' });
}
async function post(path, body) {
    return toResponse({ path, method: 'POST', body }, 202);
}
async function put(path, body) {
    return toResponse({ path, method: 'PUT', body });
}
async function del(path) {
    return toResponse({ path, method: 'DELETE' }, 204);
}
exports.default = { get, post, put, del };
