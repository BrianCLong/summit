"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whenThen = whenThen;
function whenThen(when, then) {
    return (_, __, desc) => {
        const f = desc.value;
        desc.value = async function (ctx, ...rest) {
            if (when(ctx)) {
                const res = await f.apply(this, [ctx, ...rest]);
                if (!then({ ctx, res }))
                    throw new Error('SpecLiveViolation: THEN failed');
                return res;
            }
            else {
                return f.apply(this, [ctx, ...rest]);
            }
        };
        return desc;
    };
}
