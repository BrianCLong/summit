import { FederatedBroker, FederatedQuery } from "../../graphrag/retrieval/federated/federatedBroker";

export async function federatedSearchHandler(req: any, res: any, broker: FederatedBroker) {
  try {
    const { query, tenantId, k = 10 } = req.body;

    if (!query || !tenantId) {
      return res.status(400).json({ error: "Missing required fields: query, tenantId" });
    }

    const queryOptions: FederatedQuery = {
      tenantId,
      query,
      k,
    };

    const result = await broker.search(queryOptions);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
