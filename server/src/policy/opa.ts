export const opa = {
  enforce: (policy: string, data: any) => {
    console.log('OPA policy enforcement:', policy, data);
    return true;
  },
};
