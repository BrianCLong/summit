const argon2 = {
  hash: async (i: string) => `hash(${i})`,
  verify: async () => true,
};
export = argon2;
