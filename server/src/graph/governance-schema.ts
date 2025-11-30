
export const GOVERNANCE_SCHEMA = `
# Core Concepts
type ValuePrinciple {
  id: ID!
  name: String!
  description: String!
  tenantId: String
  timestamp: String!
  epistemicMetadata: String
}

type EthicalConstraint {
  id: ID!
  description: String!
  tenantId: String
  timestamp: String!
  derivedFrom: [ValuePrinciple!]! @relationship(type: "DERIVED_FROM", direction: OUT)
}

type StakeholderClass {
  id: ID!
  name: String!
  description: String!
  tenantId: String
}

type Obligation {
  id: ID!
  description: String!
  appliesTo: [StakeholderClass!]! @relationship(type: "APPLIES_TO", direction: OUT)
  tiedTo: [ValuePrinciple!]! @relationship(type: "TIED_TO", direction: OUT)
}

type GovernanceBody {
  id: ID!
  name: String!
  description: String!
}

type GovernanceRole {
  id: ID!
  title: String!
  description: String!
  heldBy: GovernanceBody @relationship(type: "HELD_BY", direction: OUT)
}

type GovernanceInstrument {
  id: ID!
  name: String!
  type: String! # e.g., Bylaws, Charter
  embodiedIn: [ValuePrinciple!]! @relationship(type: "EMBODIED_IN", direction: OUT)
}

type Guardrail {
  id: ID!
  rule: String!
  enforcedBy: String! # PolicyBundle ID or OPA Rule
  anchoredIn: [EthicalConstraint!]! @relationship(type: "ANCHORED_IN", direction: OUT)
}

type StewardshipEntity {
  id: ID!
  name: String!
  type: String! # Trust, Foundation
}

type PhilanthropyProgram {
  id: ID!
  name: String!
  description: String!
  benefits: [StakeholderClass!]! @relationship(type: "BENEFITS", direction: OUT)
  stewardedBy: StewardshipEntity @relationship(type: "STEWARDED_BY", direction: OUT)
}

# Relationships
# DERIVED_FROM (EthicalConstraint -> ValuePrinciple)
# APPLIES_TO (Obligation -> StakeholderClass / GovernanceBody / Role)
# EMBODIED_IN (GovernanceInstrument -> ValuePrinciple / EthicalConstraint / Obligation)
# ENFORCED_BY (Guardrail -> PolicyBundle / OPA Rule / Maestro Module) - modeled as property for now or specific relation if PolicyBundle exists as node
# STEWARDED_BY (ValuePrinciple / Program -> GovernanceBody / StewardshipEntity)
# BENEFITS (PhilanthropyProgram -> StakeholderClass / Community / Organization)
`;
