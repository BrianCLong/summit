#!/usr/bin/env node

// Generate comprehensive compliance report for Conductor Omniversal
// Aggregates security, policy, data protection, and infrastructure compliance scores

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ComplianceReportGenerator {
  constructor(options = {}) {
    this.securityScore = parseFloat(options.securityScore) || 0;
    this.securityCritical = parseInt(options.securityCritical) || 0;
    this.policyScore = parseFloat(options.policyScore) || 0;
    this.policyCoverage = parseFloat(options.policyCoverage) || 0;
    this.gdprCompliant = options.gdprCompliant === 'true';
    this.piiScore = parseFloat(options.piiScore) || 0;
    this.infraScore = parseFloat(options.infraScore) || 0;
    this.k8sCompliant = options.k8sCompliant === 'true';
    this.reportsDir = options.reportsDir || './compliance-reports';
    this.outputFile = options.outputFile || 'compliance-dashboard.html';
  }

  async generateReport() {
    try {
      console.log('🔍 Generating comprehensive compliance report...');
      
      // Load detailed reports
      const detailedReports = await this.loadDetailedReports();
      
      // Calculate scores and compliance metrics
      const complianceMetrics = this.calculateComplianceMetrics();
      
      // Generate HTML dashboard
      const htmlReport = this.generateHTMLDashboard(complianceMetrics, detailedReports);
      
      // Write report to file
      fs.writeFileSync(this.outputFile, htmlReport);
      
      // Generate JSON summary
      const jsonSummary = this.generateJSONSummary(complianceMetrics);
      fs.writeFileSync(this.outputFile.replace('.html', '.json'), JSON.stringify(jsonSummary, null, 2));
      
      console.log(`✅ Compliance report generated: ${this.outputFile}`);
      console.log(`📊 Overall compliance score: ${complianceMetrics.overallScore}%`);
      
      return complianceMetrics;
      
    } catch (error) {
      console.error('❌ Failed to generate compliance report:', error.message);
      throw error;
    }
  }

  calculateComplianceMetrics() {
    // Weighted scoring system aligned with enterprise compliance frameworks
    const weights = {
      security: 0.30,        // 30% - Critical for production systems
      policy: 0.25,          // 25% - Governance and authorization
      dataProtection: 0.25,  // 25% - GDPR/privacy compliance
      infrastructure: 0.20   // 20% - Deployment security
    };

    const scores = {
      security: this.securityScore,
      policy: this.policyScore,
      dataProtection: this.piiScore,
      infrastructure: this.infraScore
    };

    const overallScore = Math.round(
      Object.entries(scores).reduce((acc, [key, score]) => 
        acc + (score * weights[key]), 0)
    );

    // Determine compliance level
    let complianceLevel, riskLevel, recommendedActions;
    
    if (overallScore >= 90) {
      complianceLevel = 'EXCELLENT';
      riskLevel = 'LOW';
      recommendedActions = ['Continue monitoring', 'Maintain current practices'];
    } else if (overallScore >= 85) {
      complianceLevel = 'COMPLIANT';
      riskLevel = 'LOW';
      recommendedActions = ['Minor improvements recommended', 'Review identified gaps'];
    } else if (overallScore >= 70) {
      complianceLevel = 'PARTIAL';
      riskLevel = 'MEDIUM';
      recommendedActions = ['Address compliance gaps', 'Implement remediation plan'];
    } else {
      complianceLevel = 'NON_COMPLIANT';
      riskLevel = 'HIGH';
      recommendedActions = ['Immediate action required', 'Halt production deployment'];
    }

    // Calculate specific compliance flags
    const flags = {
      criticalSecurityFindings: this.securityCritical > 0,
      policyComplianceBreach: this.policyScore < 80,
      gdprComplianceIssue: !this.gdprCompliant,
      infrastructureRisks: this.infraScore < 75,
      policyCoverageLow: this.policyCoverage < 80
    };

    // Generate compliance requirements status
    const requirements = {
      'SOC 2 Type II': overallScore >= 85 && this.securityScore >= 85,
      'GDPR Article 32': this.gdprCompliant && this.piiScore >= 80,
      'ISO 27001': overallScore >= 80 && this.securityScore >= 85 && this.infraScore >= 80,
      'NIST Cybersecurity Framework': overallScore >= 85,
      'Production Readiness': overallScore >= 85 && this.securityCritical === 0
    };

    return {
      overallScore,
      complianceLevel,
      riskLevel,
      scores,
      weights,
      flags,
      requirements,
      recommendedActions,
      timestamp: new Date().toISOString(),
      commitSha: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown'
    };
  }

  async loadDetailedReports() {
    const reports = {
      security: {},
      policy: {},
      dataProtection: {},
      infrastructure: {}
    };

    try {
      // Load security reports
      const securityReportsPath = path.join(this.reportsDir, `security-reports-${process.env.GITHUB_SHA}`);
      if (fs.existsSync(securityReportsPath)) {
        const files = fs.readdirSync(securityReportsPath);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            const filePath = path.join(securityReportsPath, file);
            try {
              reports.security[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
              console.warn(`⚠️ Failed to parse security report: ${file}`);
            }
          }
        });
      }

      // Load policy reports
      const policyReportsPath = path.join(this.reportsDir, `policy-reports-${process.env.GITHUB_SHA}`);
      if (fs.existsSync(policyReportsPath)) {
        const files = fs.readdirSync(policyReportsPath);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            const filePath = path.join(policyReportsPath, file);
            try {
              reports.policy[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
              console.warn(`⚠️ Failed to parse policy report: ${file}`);
            }
          }
        });
      }

      // Load data protection reports
      const dataProtectionPath = path.join(this.reportsDir, `data-protection-reports-${process.env.GITHUB_SHA}`);
      if (fs.existsSync(dataProtectionPath)) {
        const files = fs.readdirSync(dataProtectionPath);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            const filePath = path.join(dataProtectionPath, file);
            try {
              reports.dataProtection[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
              console.warn(`⚠️ Failed to parse data protection report: ${file}`);
            }
          }
        });
      }

      // Load infrastructure reports
      const infrastructurePath = path.join(this.reportsDir, `infrastructure-reports-${process.env.GITHUB_SHA}`);
      if (fs.existsSync(infrastructurePath)) {
        const files = fs.readdirSync(infrastructurePath);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            const filePath = path.join(infrastructurePath, file);
            try {
              reports.infrastructure[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
              console.warn(`⚠️ Failed to parse infrastructure report: ${file}`);
            }
          }
        });
      }

    } catch (error) {
      console.warn('⚠️ Error loading detailed reports:', error.message);
    }

    return reports;
  }

  generateHTMLDashboard(metrics, reports) {
    const riskColorMap = {
      'LOW': '#28a745',
      'MEDIUM': '#ffc107', 
      'HIGH': '#dc3545'
    };

    const complianceColorMap = {
      'EXCELLENT': '#28a745',
      'COMPLIANT': '#17a2b8',
      'PARTIAL': '#ffc107',
      'NON_COMPLIANT': '#dc3545'
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conductor Omniversal - Compliance Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 15px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white; 
            padding: 30px; 
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .dashboard { padding: 30px; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .metric-card { 
            background: #f8f9fa; 
            border-radius: 10px; 
            padding: 25px; 
            border-left: 5px solid #007bff;
            transition: transform 0.2s;
        }
        .metric-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .metric-title { font-size: 0.9rem; color: #6c757d; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .metric-value { font-size: 2.2rem; font-weight: bold; color: #2c3e50; }
        .metric-subtitle { font-size: 0.9rem; color: #6c757d; margin-top: 5px; }
        .compliance-overview { 
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 15px; 
            padding: 30px; 
            margin-bottom: 30px;
            text-align: center;
        }
        .compliance-score { 
            font-size: 4rem; 
            font-weight: bold; 
            color: ${complianceColorMap[metrics.complianceLevel]}; 
            margin-bottom: 10px;
        }
        .compliance-level { 
            font-size: 1.5rem; 
            color: ${complianceColorMap[metrics.complianceLevel]}; 
            font-weight: bold;
            padding: 10px 20px;
            background: white;
            border-radius: 25px;
            display: inline-block;
            margin-bottom: 15px;
        }
        .risk-indicator { 
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            background: ${riskColorMap[metrics.riskLevel]}20;
            color: ${riskColorMap[metrics.riskLevel]};
            border-radius: 20px;
            font-weight: bold;
        }
        .requirements-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px; 
            margin-bottom: 30px;
        }
        .requirement-item { 
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 8px;
        }
        .requirement-name { font-weight: 600; }
        .status-badge { 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 0.8rem; 
            font-weight: bold;
        }
        .status-pass { background: #d4edda; color: #155724; }
        .status-fail { background: #f8d7da; color: #721c24; }
        .actions-section { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 10px; 
            padding: 20px; 
            margin-bottom: 30px;
        }
        .actions-title { 
            color: #856404; 
            font-weight: bold; 
            margin-bottom: 15px; 
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .actions-list { list-style: none; }
        .actions-list li { 
            padding: 8px 0; 
            border-bottom: 1px solid #ffeaa720; 
            color: #856404;
        }
        .actions-list li:last-child { border-bottom: none; }
        .actions-list li:before { 
            content: "→"; 
            margin-right: 10px; 
            font-weight: bold;
        }
        .detailed-findings { margin-top: 30px; }
        .findings-section { margin-bottom: 25px; }
        .findings-title { 
            font-size: 1.2rem; 
            font-weight: bold; 
            color: #2c3e50; 
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3498db;
        }
        .finding-item { 
            background: #f8f9fa; 
            padding: 15px; 
            margin-bottom: 10px; 
            border-radius: 8px; 
            border-left: 4px solid #007bff;
        }
        .finding-severity { 
            display: inline-block; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 0.8rem; 
            font-weight: bold; 
            margin-bottom: 8px;
        }
        .severity-critical { background: #f8d7da; color: #721c24; }
        .severity-warning { background: #fff3cd; color: #856404; }
        .severity-info { background: #d4edda; color: #155724; }
        .footer { 
            background: #2c3e50; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 0.9rem;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        @media (max-width: 768px) {
            .container { margin: 10px; border-radius: 10px; }
            .header { padding: 20px; }
            .header h1 { font-size: 2rem; }
            .dashboard { padding: 20px; }
            .metrics-grid { grid-template-columns: 1fr; gap: 15px; }
            .compliance-score { font-size: 3rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Conductor Omniversal</h1>
            <p>Enterprise Compliance Dashboard</p>
            <p><strong>Branch:</strong> ${metrics.branch} | <strong>Commit:</strong> ${metrics.commitSha?.substring(0, 8)}</p>
            <p><strong>Generated:</strong> ${new Date(metrics.timestamp).toLocaleString()}</p>
        </div>

        <div class="dashboard">
            <div class="compliance-overview">
                <div class="compliance-score">${metrics.overallScore}%</div>
                <div class="compliance-level">${metrics.complianceLevel}</div>
                <div class="risk-indicator">
                    <span>🎯</span>
                    <span>Risk Level: ${metrics.riskLevel}</span>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-title">🔒 Security Score</div>
                    <div class="metric-value">${metrics.scores.security}%</div>
                    <div class="metric-subtitle">${this.securityCritical} critical findings</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${metrics.scores.security}%"></div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">📋 Policy Compliance</div>
                    <div class="metric-value">${metrics.scores.policy}%</div>
                    <div class="metric-subtitle">${this.policyCoverage}% test coverage</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${metrics.scores.policy}%"></div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">🔐 Data Protection</div>
                    <div class="metric-value">${metrics.scores.dataProtection}%</div>
                    <div class="metric-subtitle">GDPR: ${this.gdprCompliant ? '✅ Compliant' : '❌ Non-compliant'}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${metrics.scores.dataProtection}%"></div>
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">🏗️ Infrastructure Security</div>
                    <div class="metric-value">${metrics.scores.infrastructure}%</div>
                    <div class="metric-subtitle">K8s: ${this.k8sCompliant ? '✅ Secure' : '⚠️ Issues found'}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${metrics.scores.infrastructure}%"></div>
                    </div>
                </div>
            </div>

            <div class="findings-section">
                <div class="findings-title">📊 Compliance Requirements Status</div>
                <div class="requirements-grid">
                    ${Object.entries(metrics.requirements).map(([req, status]) => `
                        <div class="requirement-item">
                            <span class="requirement-name">${req}</span>
                            <span class="status-badge ${status ? 'status-pass' : 'status-fail'}">
                                ${status ? '✅ PASS' : '❌ FAIL'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${metrics.recommendedActions.length > 0 ? `
            <div class="actions-section">
                <div class="actions-title">
                    <span>🎯</span>
                    <span>Recommended Actions</span>
                </div>
                <ul class="actions-list">
                    ${metrics.recommendedActions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="detailed-findings">
                <div class="findings-section">
                    <div class="findings-title">🚨 Active Compliance Issues</div>
                    ${Object.entries(metrics.flags).filter(([, value]) => value).length === 0 ? 
                        '<p style="color: #28a745; font-weight: bold;">✅ No critical compliance issues found</p>' :
                        Object.entries(metrics.flags)
                            .filter(([, value]) => value)
                            .map(([flag, ]) => `
                                <div class="finding-item">
                                    <div class="finding-severity severity-${flag.includes('critical') || flag.includes('breach') ? 'critical' : 'warning'}">
                                        ${flag.includes('critical') || flag.includes('breach') ? 'CRITICAL' : 'WARNING'}
                                    </div>
                                    <strong>${flag.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                                    ${this.getFlagDescription(flag)}
                                </div>
                            `).join('')
                    }
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated by Conductor Omniversal Compliance Automation</p>
            <p>Report ID: ${metrics.commitSha}-${Date.now().toString(36)}</p>
        </div>
    </div>
</body>
</html>`;
  }

  getFlagDescription(flag) {
    const descriptions = {
      criticalSecurityFindings: 'Critical security vulnerabilities detected that must be resolved before production deployment.',
      policyComplianceBreach: 'Authorization policies do not meet minimum compliance thresholds.',
      gdprComplianceIssue: 'GDPR data protection requirements are not fully satisfied.',
      infrastructureRisks: 'Infrastructure security configuration has potential vulnerabilities.',
      policyCoverageLow: 'Policy test coverage is below recommended threshold (80%).'
    };
    return descriptions[flag] || 'Compliance issue requiring attention.';
  }

  generateJSONSummary(metrics) {
    return {
      version: '1.0',
      timestamp: metrics.timestamp,
      repository: process.env.GITHUB_REPOSITORY,
      commit: metrics.commitSha,
      branch: metrics.branch,
      compliance: {
        overallScore: metrics.overallScore,
        level: metrics.complianceLevel,
        riskLevel: metrics.riskLevel,
        componentScores: metrics.scores,
        weights: metrics.weights,
        requirements: metrics.requirements,
        flags: metrics.flags,
        recommendedActions: metrics.recommendedActions
      },
      metadata: {
        generatedBy: 'conductor-compliance-automation',
        reportType: 'comprehensive',
        retentionDays: 2555
      }
    };
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const value = args[i + 1];
    options[key] = value;
  }

  const generator = new ComplianceReportGenerator(options);
  generator.generateReport()
    .then(metrics => {
      console.log(`\n📊 Final Compliance Score: ${metrics.overallScore}%`);
      console.log(`🎯 Compliance Level: ${metrics.complianceLevel}`);
      console.log(`⚠️  Risk Level: ${metrics.riskLevel}`);
      process.exit(metrics.complianceLevel === 'NON_COMPLIANT' ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Compliance report generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = ComplianceReportGenerator;