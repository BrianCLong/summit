import { fetchAndVerify } from '../../../clients/cos-policy-fetcher/src/index';

export async function loadPolicyPack(url: string) {
  const dir = await fetchAndVerify({ url });
  // Here you would hot-reload OPA bundle (e.g., via sidecar or local engine)
  // For sidecar: POST /v1/policies with tar; for embedded: point to `dir/opa`
  return { dir };
}
