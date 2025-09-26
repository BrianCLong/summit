import { gql } from 'graphql-tag';

export const notificationsTypeDefs = gql`
  type EmailBranding {
    companyName: String
    logoUrl: String
    primaryColor: String
    accentColor: String
    supportEmail: String
    footerText: String
  }

  input EmailBrandingInput {
    companyName: String
    logoUrl: String
    primaryColor: String
    accentColor: String
    supportEmail: String
    footerText: String
  }

  type EmailTemplate {
    id: ID!
    tenantId: ID!
    key: String!
    subjectTemplate: String!
    bodyTemplate: String!
    description: String
    branding: EmailBranding!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input UpsertEmailTemplateInput {
    key: String!
    subjectTemplate: String!
    bodyTemplate: String!
    description: String
    branding: EmailBrandingInput
  }

  input RenderEmailTemplateInput {
    context: JSON!
    brandOverrides: EmailBrandingInput
  }

  type EmailTemplateRenderResult {
    subject: String!
    html: String!
    text: String!
    branding: EmailBranding!
  }

  extend type Query {
    emailTemplates(tenantId: ID!, key: String): [EmailTemplate!]!
    emailTemplate(tenantId: ID!, key: String!): EmailTemplate
  }

  extend type Mutation {
    upsertEmailTemplate(tenantId: ID!, input: UpsertEmailTemplateInput!): EmailTemplate!
    deleteEmailTemplate(tenantId: ID!, key: String!): Boolean!
    renderEmailTemplate(
      tenantId: ID!
      key: String!
      input: RenderEmailTemplateInput!
    ): EmailTemplateRenderResult!
  }
`;

export default notificationsTypeDefs;
