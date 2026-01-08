import type { RoleTemplate } from "@intelgraph/mdm-core";

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: "records_officer",
    permissions: [
      "records:create",
      "records:update",
      "records:hold:apply",
      "records:export",
      "records:retention:configure",
    ],
    description: "Responsible for applying retention schedules, legal holds, and approvals.",
  },
  {
    name: "records_admin",
    permissions: [
      "records:define",
      "records:search",
      "records:integrity:verify",
      "records:role-template:view",
      "records:audits:view",
    ],
    description: "Administers record definitions, integrity checks, and search visibility.",
  },
  {
    name: "records_operator",
    permissions: ["records:access", "records:search", "records:export:request"],
    description: "Operational user with controlled access and evidence trails.",
  },
];
