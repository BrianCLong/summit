"use strict";
const argon2 = {
    hash: async (i) => `hash(${i})`,
    verify: async () => true,
};
module.exports = argon2;
