import { registerPlugin } from "../src/plugins/registry";
test("rejects missing signature", async () =>{
  await expect(registerPlugin({ name:"x",version:"1",ociUri:"oci://x",digest:"sha256:abc",signature:"",capabilities:{} }, "me")).rejects.toBeTruthy();
});