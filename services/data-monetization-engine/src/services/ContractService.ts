/**
 * Automated Contract Generation Service
 * Creates legally-compliant data licensing and sharing agreements
 */

import { v4 as uuid } from 'uuid';
import {
  DataContract,
  DataProduct,
  ComplianceFramework,
  ContractType,
  CreateContractInput,
} from '@intelgraph/data-monetization-types';
import { logger } from '../utils/logger.js';

// Contract clause templates
const CLAUSE_TEMPLATES = {
  dataRights: {
    standard: `
ARTICLE 3: DATA RIGHTS AND RESTRICTIONS

3.1 Grant of Rights. Subject to the terms of this Agreement, Provider hereby grants to Consumer
a non-exclusive, non-transferable license to access and use the Data solely for the Permitted Purposes.

3.2 Permitted Purposes. Consumer may use the Data only for: {{allowedPurposes}}.

3.3 Prohibited Uses. Consumer shall not: {{prohibitedUses}}.

3.4 Geographic Restrictions. Data use is restricted to: {{geographicRestrictions}}.

3.5 Sublicensing. {{sublicensingClause}}

3.6 Derivative Works. {{derivativeWorksClause}}

3.7 Attribution. {{attributionClause}}
`,
  },
  gdprClauses: {
    dataProcessing: `
ARTICLE 4: DATA PROTECTION (GDPR COMPLIANCE)

4.1 Roles. For purposes of applicable data protection laws, Provider acts as Data Controller
and Consumer acts as Data Processor with respect to any Personal Data included in the Data.

4.2 Processing Instructions. Consumer shall process Personal Data only in accordance with
Provider's documented instructions as set forth in this Agreement.

4.3 Security Measures. Consumer shall implement appropriate technical and organizational
measures to ensure a level of security appropriate to the risk, including:
{{securityMeasures}}

4.4 Sub-processing. Consumer shall not engage any sub-processor without Provider's prior
written authorization. Consumer shall ensure any sub-processor is bound by the same
data protection obligations.

4.5 Data Subject Rights. Consumer shall assist Provider in responding to requests from
data subjects exercising their rights under applicable data protection laws.

4.6 Data Breach Notification. Consumer shall notify Provider within {{breachNotificationHours}} hours
of becoming aware of any Personal Data breach.

4.7 Return or Deletion. Upon termination, Consumer shall return or delete all Personal Data
and certify such deletion in writing.

4.8 Audit Rights. Provider may audit Consumer's compliance with this Article upon reasonable
notice.
`,
    internationalTransfer: `
ARTICLE 5: INTERNATIONAL DATA TRANSFERS

5.1 Transfer Mechanism. Any transfer of Personal Data outside the European Economic Area
shall be conducted pursuant to an approved transfer mechanism under GDPR Article 46.

5.2 Standard Contractual Clauses. The parties agree that the EU Standard Contractual Clauses
for processor-to-processor transfers (Module 3) are hereby incorporated by reference.

5.3 Supplementary Measures. The parties shall implement the following supplementary measures
to ensure adequate protection: {{supplementaryMeasures}}.
`,
  },
  liability: `
ARTICLE 8: LIABILITY AND INDEMNIFICATION

8.1 Limitation of Liability. EXCEPT FOR BREACHES OF CONFIDENTIALITY, DATA PROTECTION
OBLIGATIONS, OR INDEMNIFICATION OBLIGATIONS, NEITHER PARTY SHALL BE LIABLE FOR ANY
INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

8.2 Liability Cap. Each party's total aggregate liability under this Agreement shall not
exceed {{liabilityCap}}.

8.3 Indemnification. Consumer shall indemnify and hold harmless Provider from any claims,
damages, or expenses arising from Consumer's breach of this Agreement or misuse of the Data.
`,
  termination: `
ARTICLE 9: TERM AND TERMINATION

9.1 Term. This Agreement commences on {{startDate}} and continues until {{endDate}},
unless earlier terminated.

9.2 Auto-Renewal. {{autoRenewalClause}}

9.3 Termination for Convenience. Either party may terminate this Agreement upon
{{terminationNoticeDays}} days' written notice.

9.4 Termination for Cause. Either party may terminate immediately upon material breach
that remains uncured for 30 days after written notice.

9.5 Effect of Termination. Upon termination, Consumer shall immediately cease use of the
Data and return or destroy all copies within 30 days.
`,
};

export class ContractService {
  private contractCounter = 1000;

  /**
   * Generate a complete data contract
   */
  async generateContract(
    input: CreateContractInput,
    product: DataProduct,
  ): Promise<DataContract> {
    logger.info({ productId: product.id, type: input.type }, 'Generating contract');

    const contractNumber = this.generateContractNumber(input.type);

    const contract: DataContract = {
      id: uuid(),
      contractNumber,
      type: input.type,
      status: 'DRAFT',
      productId: input.productId,
      providerId: input.providerId,
      providerName: input.providerName,
      consumerId: input.consumerId,
      consumerName: input.consumerName,
      terms: input.terms,
      pricing: input.pricing,
      dataRights: input.dataRights,
      compliance: input.compliance,
      signatures: [],
      amendments: [],
      attachments: [],
      tenantId: input.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return contract;
  }

  /**
   * Generate full contract document text
   */
  generateContractDocument(contract: DataContract, product: DataProduct): string {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(contract));

    // Recitals
    sections.push(this.generateRecitals(contract, product));

    // Definitions
    sections.push(this.generateDefinitions(contract, product));

    // Data Rights
    sections.push(this.generateDataRightsSection(contract));

    // GDPR clauses if applicable
    if (contract.compliance.frameworks.includes('GDPR')) {
      sections.push(this.generateGDPRSection(contract));
    }

    // Payment terms
    sections.push(this.generatePaymentSection(contract));

    // Liability
    sections.push(this.generateLiabilitySection(contract));

    // Termination
    sections.push(this.generateTerminationSection(contract));

    // Signatures
    sections.push(this.generateSignatureBlock(contract));

    return sections.join('\n\n');
  }

  private generateContractNumber(type: ContractType): string {
    const prefix = {
      DATA_LICENSE: 'DL',
      DATA_SHARING: 'DS',
      DATA_PROCESSING: 'DP',
      JOINT_CONTROLLER: 'JC',
      SUB_PROCESSOR: 'SP',
    }[type];

    return `${prefix}-${new Date().getFullYear()}-${String(++this.contractCounter).padStart(5, '0')}`;
  }

  private generateHeader(contract: DataContract): string {
    return `
================================================================================
                    DATA ${contract.type.replace('_', ' ')} AGREEMENT
================================================================================

Contract Number: ${contract.contractNumber}
Effective Date: ${contract.terms.startDate}

BETWEEN:

${contract.providerName} ("Provider")

AND

${contract.consumerName} ("Consumer")

(each a "Party" and collectively the "Parties")
================================================================================
`;
  }

  private generateRecitals(contract: DataContract, product: DataProduct): string {
    return `
RECITALS

WHEREAS, Provider owns or controls certain data assets described herein and has
the right to license such data;

WHEREAS, Consumer desires to obtain access to and use of said data for the
purposes described herein;

WHEREAS, the data product is: ${product.name} (${product.description});

WHEREAS, the parties wish to establish the terms and conditions governing the
sharing, processing, and use of such data;

NOW, THEREFORE, in consideration of the mutual covenants and agreements
contained herein, and for other good and valuable consideration, the receipt
and sufficiency of which are hereby acknowledged, the parties agree as follows:
`;
  }

  private generateDefinitions(contract: DataContract, product: DataProduct): string {
    return `
ARTICLE 1: DEFINITIONS

1.1 "Agreement" means this Data ${contract.type.replace('_', ' ')} Agreement.

1.2 "Data" means the data product known as "${product.name}" including all
records, fields, and derived calculations as described in Schedule A.

1.3 "Personal Data" means any information relating to an identified or
identifiable natural person as defined under applicable data protection laws.

1.4 "Permitted Purposes" means ${contract.dataRights.allowedPurposes.join('; ')}.

1.5 "Confidential Information" means all non-public information disclosed by
either party, including the Data, business plans, and technical specifications.

1.6 "Security Measures" means the technical and organizational measures
implemented to protect the Data from unauthorized access or disclosure.
`;
  }

  private generateDataRightsSection(contract: DataContract): string {
    const sublicensingClause = contract.dataRights.sublicensing
      ? 'Consumer may sublicense the Data to authorized third parties with Provider\'s prior written consent.'
      : 'Consumer shall not sublicense, transfer, or assign the rights granted herein without Provider\'s prior written consent.';

    const derivativeWorksClause = contract.dataRights.derivativeWorks
      ? 'Consumer may create derivative works from the Data, provided that Provider retains ownership of any derivative works incorporating the original Data.'
      : 'Consumer shall not create derivative works from the Data without Provider\'s prior written consent.';

    const attributionClause = contract.dataRights.attribution
      ? 'Consumer shall provide appropriate attribution to Provider in any publications or products utilizing the Data.'
      : 'No attribution requirement applies.';

    return CLAUSE_TEMPLATES.dataRights.standard
      .replace('{{allowedPurposes}}', contract.dataRights.allowedPurposes.join('; '))
      .replace(
        '{{prohibitedUses}}',
        contract.dataRights.prohibitedUses.length > 0
          ? contract.dataRights.prohibitedUses.join('; ')
          : 'No specific prohibitions beyond those implied by the Permitted Purposes',
      )
      .replace(
        '{{geographicRestrictions}}',
        contract.dataRights.geographicRestrictions.length > 0
          ? contract.dataRights.geographicRestrictions.join(', ')
          : 'Worldwide',
      )
      .replace('{{sublicensingClause}}', sublicensingClause)
      .replace('{{derivativeWorksClause}}', derivativeWorksClause)
      .replace('{{attributionClause}}', attributionClause);
  }

  private generateGDPRSection(contract: DataContract): string {
    const securityMeasures =
      contract.compliance.securityMeasures.length > 0
        ? contract.compliance.securityMeasures.map((m) => `  - ${m}`).join('\n')
        : '  - Encryption at rest and in transit\n  - Access controls and authentication\n  - Regular security assessments';

    return (
      CLAUSE_TEMPLATES.gdprClauses.dataProcessing
        .replace('{{securityMeasures}}', securityMeasures)
        .replace(
          '{{breachNotificationHours}}',
          String(contract.compliance.breachNotificationHours),
        ) + CLAUSE_TEMPLATES.gdprClauses.internationalTransfer.replace(
        '{{supplementaryMeasures}}',
        'encryption, pseudonymization, and access restrictions',
      )
    );
  }

  private generatePaymentSection(contract: DataContract): string {
    const amount = (contract.pricing.totalValueCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: contract.pricing.currency,
    });

    return `
ARTICLE 6: PAYMENT TERMS

6.1 Fees. Consumer shall pay Provider ${amount} for the rights granted herein.

6.2 Payment Terms. ${contract.pricing.paymentTerms}

6.3 Billing Frequency. Payments shall be made on a ${contract.pricing.billingFrequency.toLowerCase()} basis.

6.4 Late Payment. Any amounts not paid when due shall accrue interest at the rate
of 1.5% per month or the maximum rate permitted by law, whichever is less.

6.5 Taxes. Consumer shall be responsible for all applicable taxes, excluding
taxes based on Provider's income.
`;
  }

  private generateLiabilitySection(contract: DataContract): string {
    const cap = (contract.pricing.totalValueCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: contract.pricing.currency,
    });

    return CLAUSE_TEMPLATES.liability.replace('{{liabilityCap}}', cap);
  }

  private generateTerminationSection(contract: DataContract): string {
    const autoRenewalClause = contract.terms.autoRenewal
      ? `This Agreement shall automatically renew for successive ${contract.terms.renewalPeriodDays || 365}-day periods unless either party provides written notice of non-renewal at least ${contract.terms.terminationNoticeDays} days prior to the end of the then-current term.`
      : 'This Agreement shall not automatically renew.';

    return CLAUSE_TEMPLATES.termination
      .replace('{{startDate}}', contract.terms.startDate)
      .replace('{{endDate}}', contract.terms.endDate || 'the date of termination')
      .replace('{{autoRenewalClause}}', autoRenewalClause)
      .replace('{{terminationNoticeDays}}', String(contract.terms.terminationNoticeDays));
  }

  private generateSignatureBlock(contract: DataContract): string {
    return `
================================================================================
                              SIGNATURE PAGE
================================================================================

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.


PROVIDER: ${contract.providerName}

By: _________________________________

Name: _______________________________

Title: ______________________________

Date: _______________________________


CONSUMER: ${contract.consumerName}

By: _________________________________

Name: _______________________________

Title: ______________________________

Date: _______________________________

================================================================================
`;
  }

  /**
   * Add digital signature to contract
   */
  async signContract(
    contract: DataContract,
    party: string,
    signedBy: string,
    digitalSignature?: string,
  ): Promise<DataContract> {
    const signature = {
      party,
      signedBy,
      signedAt: new Date().toISOString(),
      digitalSignature,
    };

    contract.signatures.push(signature);
    contract.updatedAt = new Date().toISOString();

    // Check if fully executed
    if (contract.signatures.length >= 2) {
      contract.status = 'ACTIVE';
    } else {
      contract.status = 'PENDING_APPROVAL';
    }

    return contract;
  }
}

export const contractService = new ContractService();
