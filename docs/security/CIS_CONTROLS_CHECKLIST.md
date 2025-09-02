# CIS Controls Checklist for IntelGraph Platform

This checklist maps the CIS Critical Security Controls (CIS Controls) to the IntelGraph platform's security posture and implementation details. It serves as a guide for assessing compliance and identifying areas for improvement.

## CIS Control 1: Inventory and Control of Enterprise Assets

- [ ] **1.1 Develop and Maintain an Asset Inventory**: All hardware assets (servers, network devices) are identified and documented.
- [ ] **1.2 Address Unauthorized Assets**: Mechanisms are in place to detect and prevent unauthorized assets from connecting to the network.
- [ ] **1.3 Utilize an Active Discovery Tool**: Automated tools are used for continuous discovery of assets.
- [ ] **1.4 Use a Passive Asset Discovery Tool**: Passive tools (e.g., network sniffers) are used to identify assets that may not be actively discovered.
- [ ] **1.5 Deploy a Port-Level Access Control**: Network access control (NAC) is implemented to restrict unauthorized devices.

## CIS Control 2: Inventory and Control of Software Assets

- [ ] **2.1 Develop and Maintain a Software Inventory**: All software (OS, applications, libraries) is identified and documented.
- [ ] **2.2 Address Unauthorized Software**: Policies and technical controls prevent the installation and execution of unauthorized software.
- [ ] **2.3 Utilize Software Inventory Tools**: Automated tools are used for continuous discovery of software assets.
- [ ] **2.4 Utilize Software Hashing**: File integrity monitoring (FIM) or hashing is used to detect unauthorized changes to software.
- [ ] **2.5 Address Unauthorized Scripts**: Controls are in place to prevent the execution of unauthorized scripts.

## CIS Control 3: Data Protection

- [ ] **3.1 Establish and Maintain a Data Management Process**: Data is classified and handled according to its sensitivity.
- [ ] **3.2 Establish and Maintain a Data Inventory**: All data (structured and unstructured) is identified and documented.
- [ ] **3.3 Configure Data Access Control Lists**: Access to data is restricted based on least privilege.
- [ ] **3.4 Enforce Data Encryption at Rest**: Sensitive data is encrypted when stored (e.g., databases, S3 buckets).
  - **Implementation**: S3 buckets require SSE-KMS and `aws:SecureTransport` (via bucket policy).
  - **Implementation**: RDS/PostgreSQL enforces TLS and uses KMS CMK for storage-level encryption.
- [ ] **3.5 Enforce Data Encryption in Transit**: All data in transit is encrypted using strong protocols (e.g., TLS 1.2+).
  - **Implementation**: TLS 1.2+ enforced end-to-end (Ingress, internal services, datastores).
- [ ] **3.6 Implement Data Loss Prevention (DLP)**: DLP solutions are deployed to prevent sensitive data exfiltration.
- [ ] **3.7 Implement Data Backup and Recovery**: Regular backups are performed and tested.
  - **Implementation**: Postgres daily snapshots (7-day retention) + weekly basebackup; PITR if available.
  - **Implementation**: S3 artifacts lifecycle to IA/Glacier; WORM evidence bucket protected.
- [ ] **3.8 Dispose of Data Securely**: Data is securely deleted or sanitized when no longer needed.

## CIS Control 4: Secure Configuration of Enterprise Assets and Software

- [ ] **4.1 Establish and Maintain a Secure Configuration Process**: Baseline configurations are defined and enforced.
- [ ] **4.2 Establish and Maintain a Secure Configuration Process for Network Devices**: Network devices are securely configured.
- [ ] **4.3 Configure Automatic Session Lock**: User sessions automatically lock after inactivity.
- [ ] **4.4 Implement and Manage a Firewall**: Firewalls are configured to restrict unauthorized network access.
- [ ] **4.5 Implement and Manage a Secure Configuration Process for Servers**: Servers are securely configured.
- [ ] **4.6 Implement and Manage a Secure Configuration Process for Workstations**: Workstations are securely configured.
- [ ] **4.7 Implement and Manage a Secure Configuration Process for Mobile Devices**: Mobile devices are securely configured.
- [ ] **4.8 Implement and Manage a Secure Configuration Process for Cloud Infrastructure**: Cloud resources are securely configured.
  - **Implementation**: Redis TLS on.
  - **Implementation**: Snapshots encrypted.

## CIS Control 5: Account Management

- [ ] **5.1 Establish and Maintain an Account Management Process**: User accounts are managed throughout their lifecycle.
- [ ] **5.2 Use Unique Passwords**: Unique and complex passwords are enforced.
- [ ] **5.3 Disable or Remove Accounts**: Inactive or terminated accounts are promptly disabled/removed.
- [ ] **5.4 Implement Multi-Factor Authentication (MFA)**: MFA is enforced for all accounts.
- [ ] **5.5 Use Role-Based Access Control (RBAC)**: Access is granted based on roles and least privilege.

## CIS Control 6: Access Control Management

- [ ] **6.1 Establish and Maintain an Access Control Process**: Access to systems and data is controlled.
- [ ] **6.2 Implement Least Privilege**: Users are granted only the minimum necessary access.
- [ ] **6.3 Implement Segregation of Duties**: Critical functions are separated among multiple individuals.
- [ ] **6.4 Implement Access Control for Remote Access**: Remote access is secured.
- [ ] **6.5 Implement Access Control for Wireless Access**: Wireless access is secured.

## CIS Control 7: Continuous Vulnerability Management

- [ ] **7.1 Establish and Maintain a Vulnerability Management Process**: Vulnerabilities are identified and remediated.
- [ ] **7.2 Perform Vulnerability Scans**: Regular vulnerability scans are conducted.
- [ ] **7.3 Perform Penetration Tests**: Regular penetration tests are conducted.
- [ ] **7.4 Establish and Maintain a Remediation Process**: Vulnerabilities are remediated in a timely manner.

## CIS Control 8: Audit Log Management

- [ ] **8.1 Establish and Maintain an Audit Log Management Process**: Audit logs are collected, stored, and reviewed.
- [ ] **8.2 Collect Audit Logs**: All relevant system and application logs are collected.
- [ ] **8.3 Ensure Audit Log Retention**: Audit logs are retained for a specified period.
- [ ] **8.4 Centralize Audit Logs**: Logs are centralized for easier analysis.
- [ ] **8.5 Monitor Audit Logs**: Audit logs are continuously monitored for suspicious activity.

## CIS Control 9: Email and Web Browser Protections

- [ ] **9.1 Implement Email and Web Browser Protections**: Email and web browser usage is secured.

## CIS Control 10: Malware Defenses

- [ ] **10.1 Implement Malware Defenses**: Anti-malware solutions are deployed.

## CIS Control 11: Data Recovery

- [ ] **11.1 Establish and Maintain a Data Recovery Process**: Data recovery procedures are documented and tested.

## CIS Control 12: Network Infrastructure Management

- [ ] **12.1 Establish and Maintain a Network Infrastructure Management Process**: Network devices are managed securely.

## CIS Control 13: Network Monitoring and Defense

- [ ] **13.1 Implement Network Monitoring and Defense**: Network traffic is monitored for threats.

## CIS Control 14: Security Awareness and Skills Training

- [ ] **14.1 Establish and Maintain a Security Awareness and Skills Training Program**: Employees receive security training.

## CIS Control 15: Service Provider Management

- [ ] **15.1 Establish and Maintain a Service Provider Management Process**: Third-party service providers are managed securely.

## CIS Control 16: Application Software Security

- [ ] **16.1 Establish and Maintain an Application Software Security Process**: Applications are developed and maintained securely.

## CIS Control 17: Incident Response Management

- [ ] **17.1 Establish and Maintain an Incident Response Process**: Incident response procedures are documented and tested.

## CIS Control 18: Penetration Testing

- [ ] **18.1 Conduct Penetration Tests**: Regular penetration tests are conducted.
