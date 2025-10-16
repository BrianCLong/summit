const fetch = async (_url: string, _opts?: any) => ({
  ok: true,
  status: 200,
  json: async () => ({ ok: true }),
});
export default fetch;
module.exports = fetch;
