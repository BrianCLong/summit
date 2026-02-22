import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  region: z.string(),
});

export const DisclosurePackSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  product: z.string(),
  environment: z.string(),
  generated_at: z.string().datetime(),
  residency_region: z.string(),
});

export const ApiContracts = {
  getCustomer: {
    params: z.object({
      tenantId: z.string().startsWith("tenant_"),
      id: z.string(),
    }),
    response: CustomerSchema,
  },
  listDisclosurePacks: {
    response: z.object({
      items: z.array(DisclosurePackSchema),
    }),
  },
};
