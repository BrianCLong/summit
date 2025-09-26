import { gql } from 'graphql-tag';

export const workflowTemplateTypeDefs = gql`
  type WorkflowTemplateVariable {
    name: String!
    type: String
    description: String
    required: Boolean!
    defaultValue: JSON
  }

  input WorkflowTemplateVariableInput {
    name: String!
    type: String
    description: String
    required: Boolean = false
    defaultValue: JSON
  }

  type WorkflowTemplate {
    id: ID!
    tenantId: String!
    name: String!
    description: String
    argoTemplate: JSON!
    variables: [WorkflowTemplateVariable!]!
    createdBy: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WorkflowExecution {
    runId: String!
    status: String!
    submittedAt: DateTime!
    workflow: JSON
  }

  input CreateWorkflowTemplateInput {
    tenantId: String!
    name: String!
    description: String
    argoTemplate: JSON!
    variables: [WorkflowTemplateVariableInput!] = []
  }

  input ExecuteWorkflowTemplateInput {
    templateId: ID!
    tenantId: String
    variables: JSON
    runName: String
  }

  extend type Query {
    workflowTemplate(id: ID!, tenantId: String): WorkflowTemplate
    workflowTemplates(tenantId: String!, limit: Int = 20, offset: Int = 0): [WorkflowTemplate!]!
  }

  extend type Mutation {
    createWorkflowTemplate(input: CreateWorkflowTemplateInput!): WorkflowTemplate!
    executeWorkflowTemplate(input: ExecuteWorkflowTemplateInput!): WorkflowExecution!
  }
`;

export default workflowTemplateTypeDefs;
