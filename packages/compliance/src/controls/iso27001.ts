/**
 * ISO 27001:2022 Information Security Management System Controls
 */

import { ComplianceControl, ComplianceFramework, ControlFamily, ControlStatus } from '../types.js';

export enum ISO27001ControlCategory {
  ORGANIZATIONAL = 'organizational',
  PEOPLE = 'people',
  PHYSICAL = 'physical',
  TECHNOLOGICAL = 'technological',
}

export interface ISO27001Control {
  id: string;
  category: ISO27001ControlCategory;
  number: string;
  title: string;
  purpose: string;
  guidance: string;
  status: ControlStatus;
}

export const ISO_27001_CONTROLS: ISO27001Control[] = [
  // Organizational Controls
  {
    id: 'iso-5-1',
    category: ISO27001ControlCategory.ORGANIZATIONAL,
    number: '5.1',
    title: 'Policies for information security',
    purpose: 'To provide management direction and support for information security',
    guidance: 'Information security policy and topic-specific policies should be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-5-7',
    category: ISO27001ControlCategory.ORGANIZATIONAL,
    number: '5.7',
    title: 'Threat intelligence',
    purpose: 'To ensure that information relating to information security threats is collected and analyzed to produce threat intelligence',
    guidance: 'Information relating to information security threats should be collected and analyzed to produce threat intelligence',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-5-23',
    category: ISO27001ControlCategory.ORGANIZATIONAL,
    number: '5.23',
    title: 'Information security for use of cloud services',
    purpose: 'To establish processes for acquisition, use, management and exit from cloud services',
    guidance: 'Processes for acquisition, use, management and exit should be established in accordance with organizational information security requirements',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-5-30',
    category: ISO27001ControlCategory.ORGANIZATIONAL,
    number: '5.30',
    title: 'ICT readiness for business continuity',
    purpose: 'To ensure the availability of information processing facilities',
    guidance: 'ICT readiness should be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements',
    status: ControlStatus.NOT_IMPLEMENTED,
  },

  // People Controls
  {
    id: 'iso-6-1',
    category: ISO27001ControlCategory.PEOPLE,
    number: '6.1',
    title: 'Screening',
    purpose: 'To ensure that personnel and contractors are suitable and trustworthy',
    guidance: 'Background verification checks on all candidates for employment should be carried out prior to joining the organization',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-6-2',
    category: ISO27001ControlCategory.PEOPLE,
    number: '6.2',
    title: 'Terms and conditions of employment',
    purpose: 'To ensure that personnel and contractors understand their responsibilities',
    guidance: 'Contractual agreements with personnel and contractors should state their and the organization responsibilities for information security',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-6-3',
    category: ISO27001ControlCategory.PEOPLE,
    number: '6.3',
    title: 'Information security awareness, education and training',
    purpose: 'To ensure that personnel and contractors are aware of and fulfill their information security responsibilities',
    guidance: 'Personnel of the organization and relevant interested parties should receive appropriate information security awareness, education and training',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-6-5',
    category: ISO27001ControlCategory.PEOPLE,
    number: '6.5',
    title: 'Responsibilities after termination or change of employment',
    purpose: 'To protect the organization interests as part of the process of changing or terminating employment',
    guidance: 'Information security responsibilities that remain valid after termination or change of employment should be defined, enforced and communicated to relevant personnel and interested parties',
    status: ControlStatus.NOT_IMPLEMENTED,
  },

  // Physical Controls
  {
    id: 'iso-7-1',
    category: ISO27001ControlCategory.PHYSICAL,
    number: '7.1',
    title: 'Physical security perimeters',
    purpose: 'To prevent unauthorized physical access to information and other associated assets',
    guidance: 'Security perimeters should be defined and used to protect areas that contain information and other associated assets',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-7-2',
    category: ISO27001ControlCategory.PHYSICAL,
    number: '7.2',
    title: 'Physical entry',
    purpose: 'To ensure that only authorized personnel are given access to secure areas',
    guidance: 'Secure areas should be protected by appropriate entry controls and access points',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-7-4',
    category: ISO27001ControlCategory.PHYSICAL,
    number: '7.4',
    title: 'Physical security monitoring',
    purpose: 'To detect and prevent unauthorized physical access to premises and information',
    guidance: 'Premises should be continuously monitored for unauthorized physical access',
    status: ControlStatus.NOT_IMPLEMENTED,
  },

  // Technological Controls
  {
    id: 'iso-8-1',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.1',
    title: 'User endpoint devices',
    purpose: 'To protect information stored on, processed by or accessible via user endpoint devices',
    guidance: 'Information stored on, processed by or accessible via user endpoint devices should be protected',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-2',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.2',
    title: 'Privileged access rights',
    purpose: 'To limit and control the allocation and use of privileged access rights',
    guidance: 'The allocation and use of privileged access rights should be restricted and managed',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-3',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.3',
    title: 'Information access restriction',
    purpose: 'To ensure that access to information and other associated assets is authorized',
    guidance: 'Access to information and other associated assets should be restricted in accordance with the established topic-specific policy on access control',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-5',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.5',
    title: 'Secure authentication',
    purpose: 'To ensure the identity of users and the secure authentication of information',
    guidance: 'Secure authentication technologies and procedures should be implemented based on information access restrictions and the topic-specific policy on access control',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-9',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.9',
    title: 'Configuration management',
    purpose: 'To establish and maintain the security of systems and networks',
    guidance: 'Configurations, including security configurations, of hardware, software, services and networks should be established, documented, implemented, monitored and reviewed',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-10',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.10',
    title: 'Information deletion',
    purpose: 'To prevent exposure of information stored in systems, applications or services',
    guidance: 'Information stored in information systems, devices or in any other storage media should be deleted when no longer required',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-15',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.15',
    title: 'Logging',
    purpose: 'To record events and generate evidence',
    guidance: 'Logs that record activities, exceptions, faults and other relevant events should be produced, stored, protected and analyzed',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-16',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.16',
    title: 'Monitoring activities',
    purpose: 'To detect anomalous behaviour and events',
    guidance: 'Networks, systems and applications should be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-23',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.23',
    title: 'Web filtering',
    purpose: 'To prevent access to malicious websites',
    guidance: 'Access to external websites should be managed to reduce exposure to malicious content',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-24',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.24',
    title: 'Use of cryptography',
    purpose: 'To ensure proper and effective use of cryptography to protect information',
    guidance: 'Rules for the effective use of cryptography, including cryptographic key management, should be defined and implemented',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-26',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.26',
    title: 'Application security requirements',
    purpose: 'To ensure that information systems are appropriately secured',
    guidance: 'Information security requirements should be identified, specified and approved when developing or acquiring applications',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
  {
    id: 'iso-8-28',
    category: ISO27001ControlCategory.TECHNOLOGICAL,
    number: '8.28',
    title: 'Secure coding',
    purpose: 'To improve the security of application software',
    guidance: 'Secure coding principles should be applied to software development',
    status: ControlStatus.NOT_IMPLEMENTED,
  },
];

/**
 * Get controls by category
 */
export function getControlsByCategory(category: ISO27001ControlCategory): ISO27001Control[] {
  return ISO_27001_CONTROLS.filter(control => control.category === category);
}

/**
 * Calculate ISO 27001 compliance percentage
 */
export function calculateISO27001Compliance(
  implementedControls: Map<string, ControlStatus>
): {
  totalControls: number;
  implemented: number;
  partiallyImplemented: number;
  notImplemented: number;
  compliancePercentage: number;
} {
  let implemented = 0;
  let partiallyImplemented = 0;
  let notImplemented = 0;

  for (const control of ISO_27001_CONTROLS) {
    const status = implementedControls.get(control.id);

    if (status === ControlStatus.IMPLEMENTED) {
      implemented++;
    } else if (status === ControlStatus.PARTIALLY_IMPLEMENTED) {
      partiallyImplemented++;
    } else {
      notImplemented++;
    }
  }

  const totalControls = ISO_27001_CONTROLS.length;
  const compliancePercentage = ((implemented + partiallyImplemented * 0.5) / totalControls) * 100;

  return {
    totalControls,
    implemented,
    partiallyImplemented,
    notImplemented,
    compliancePercentage,
  };
}

/**
 * Statement of Applicability (SoA) generator
 */
export interface StatementOfApplicability {
  controlId: string;
  controlNumber: string;
  controlTitle: string;
  applicable: boolean;
  status: ControlStatus;
  justification: string;
  implementationDetails?: string;
}

export function generateStatementOfApplicability(
  implementedControls: Map<string, { status: ControlStatus; justification: string; details?: string }>
): StatementOfApplicability[] {
  return ISO_27001_CONTROLS.map(control => {
    const implementation = implementedControls.get(control.id);

    return {
      controlId: control.id,
      controlNumber: control.number,
      controlTitle: control.title,
      applicable: implementation?.status !== ControlStatus.NOT_APPLICABLE,
      status: implementation?.status || ControlStatus.NOT_IMPLEMENTED,
      justification: implementation?.justification || 'Not yet assessed',
      implementationDetails: implementation?.details,
    };
  });
}
