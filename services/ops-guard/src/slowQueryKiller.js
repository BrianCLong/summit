"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlowKiller = createSlowKiller;
function createSlowKiller(timeoutMs, onKill) {
    let timeoutHandle = null;
    const guard = (promise) => {
        return new Promise((resolve, reject) => {
            timeoutHandle = setTimeout(() => {
                onKill();
                reject(new Error('terminated')); // ensures race resolves
            }, timeoutMs);
            promise
                .then((value) => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                resolve(value);
            })
                .catch((err) => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                reject(err);
            });
        });
    };
    const clear = () => {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
        }
    };
    return { guard, clear };
}
