import { z } from 'zod';

export const VulnerabilitySeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const VulnerabilityStatusSchema = z.enum(['open', 'fixed', 'wont-fix', 'mitigated', 'false-positive']);
export const SecurityStandardSchema = z.enum(['OWASP', 'CWE', 'SANS', 'NIST', 'ISO27001', 'PCI-DSS']);
export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export const ComplianceStatusSchema = z.enum(['compliant', 'non-compliant', 'partial', 'not-applicable']);

export const VulnerabilitySchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: VulnerabilitySeveritySchema,
  status: VulnerabilityStatusSchema.default('open'),
  cweId: z.string().optional(),
  cvssScore: z.number().min(0).max(10).optional(),
  cvssVector: z.string().optional(),
  location: z.object({
    file: z.string(),
    line: z.number().optional(),
    column: z.number().optional(),
    function: z.string().optional()
  }),
  evidence: z.string().optional(),
  impact: z.string().optional(),
  remediation: z.string().optional(),
  references: z.array(z.string().url()).default([]),
  detectedAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  falsePositive: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.8)
});

export const SecurityAssessmentSchema = z.object({
  overallScore: z.number().min(0).max(10),
  riskLevel: RiskLevelSchema,
  vulnerabilities: z.array(VulnerabilitySchema).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  assessedAt: z.string().datetime(),
  assessor: z.string().optional(),
  toolVersion: z.string().optional()
});

export const ComplianceRequirementSchema = z.object({
  id: z.string(),
  standard: SecurityStandardSchema,
  requirement: z.string(),
  description: z.string(),
  status: ComplianceStatusSchema,
  evidence: z.string().optional(),
  lastVerified: z.string().datetime().optional(),
  verifiedBy: z.string().optional()
});

export const ComplianceReportSchema = z.object({
  standards: z.array(SecurityStandardSchema),
  requirements: z.array(ComplianceRequirementSchema),
  overallStatus: ComplianceStatusSchema,
  complianceScore: z.number().min(0).max(100),
  gaps: z.array(z.string()).default([]),
  improvementAreas: z.array(z.string()).default([]),
  generatedAt: z.string().datetime(),
  validUntil: z.string().datetime().optional()
});

export const RiskAssessmentSchema = z.object({
  riskLevel: RiskLevelSchema,
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(10),
  threats: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    likelihood: z.number().min(0).max(1),
    impact: z.number().min(0).max(1),
    mitigation: z.string().optional(),
    residualRisk: z.number().min(0).max(1).optional()
  })).default([]),
  controls: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.enum(['preventive', 'detective', 'corrective']),
    effectiveness: z.number().min(0).max(1),
    implemented: z.boolean().default(false)
  })).default([]),
  assessedAt: z.string().datetime(),
  assessor: z.string().optional()
});

export const SecurityRecommendationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  priority: RiskLevelSchema,
  category: z.enum(['code', 'configuration', 'dependency', 'architecture', 'process']),
  implementation: z.string(),
  effort: z.enum(['low', 'medium', 'high']),
  impact: z.enum(['low', 'medium', 'high']),
  timeline: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  status: z.enum(['pending', 'in-progress', 'completed', 'deferred']).default('pending')
});

export const SecurityReportSchema = z.object({
  id: z.string().uuid(),
  pluginId: z.string().uuid(),
  pluginVersion: z.string(),
  assessment: SecurityAssessmentSchema,
  compliance: ComplianceReportSchema,
  risk: RiskAssessmentSchema,
  recommendations: z.array(SecurityRecommendationSchema).default([]),
  generatedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  signature: z.string().optional(),
  checksum: z.string().optional()
});

export type VulnerabilitySeverity = z.infer<typeof VulnerabilitySeveritySchema>;
export type VulnerabilityStatus = z.infer<typeof VulnerabilityStatusSchema>;
export type SecurityStandard = z.infer<typeof SecurityStandardSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;
export type Vulnerability = z.infer<typeof VulnerabilitySchema>;
export type SecurityAssessment = z.infer<typeof SecurityAssessmentSchema>;
export type ComplianceRequirement = z.infer<typeof ComplianceRequirementSchema>;
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type SecurityRecommendation = z.infer<typeof SecurityRecommendationSchema>;
export type SecurityReport = z.infer<typeof SecurityReportSchema>;

export class SecurityReportValidator {
  static validateSecurityReport(data: unknown): { success: boolean; report?: SecurityReport; errors?: string[] } {
    try {
      const report = SecurityReportSchema.parse(data);
      return { success: true, report };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateVulnerability(data: unknown): { success: boolean; vulnerability?: Vulnerability; errors?: string[] } {
    try {
      const vulnerability = VulnerabilitySchema.parse(data);
      return { success: true, vulnerability };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateComplianceReport(data: unknown): { success: boolean; compliance?: ComplianceReport; errors?: string[] } {
    try {
      const compliance = ComplianceReportSchema.parse(data);
      return { success: true, compliance };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }
}

export class SecurityReportGenerator {
  static generateSecurityReport(pluginId: string, pluginVersion: string, assessment: SecurityAssessment, compliance: ComplianceReport, risk: RiskAssessment, recommendations: SecurityRecommendation[] = []): SecurityReport {
    const now = new Date().toISOString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: this.generateUUID(),
      pluginId,
      pluginVersion,
      assessment,
      compliance,
      risk,
      recommendations,
      generatedAt: now,
      validUntil
    };
  }

  static generateSecurityAssessment(vulnerabilities: Vulnerability[]): SecurityAssessment {
    const overallScore = this.calculateSecurityScore(vulnerabilities);
    const riskLevel = this.determineRiskLevel(overallScore);
    const strengths = this.identifyStrengths(vulnerabilities);
    const weaknesses = this.identifyWeaknesses(vulnerabilities);
    const recommendations = this.generateAssessmentRecommendations(vulnerabilities);

    return {
      overallScore,
      riskLevel,
      vulnerabilities,
      strengths,
      weaknesses,
      recommendations,
      assessedAt: new Date().toISOString()
    };
  }

  static generateComplianceReport(requirements: ComplianceRequirement[]): ComplianceReport {
    const standards = Array.from(new Set(requirements.map(req => req.standard)));
    const statusCounts = requirements.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<ComplianceStatus, number>);

    const compliantCount = statusCounts.compliant || 0;
    const totalApplicable = requirements.filter(req => req.status !== 'not-applicable').length;
    const complianceScore = totalApplicable > 0 ? (compliantCount / totalApplicable) * 100 : 100;

    const overallStatus = this.determineOverallComplianceStatus(statusCounts, totalApplicable);
    const gaps = requirements.filter(req => req.status === 'non-compliant').map(req => req.requirement);
    const improvementAreas = requirements.filter(req => req.status === 'partial').map(req => req.requirement);

    return {
      standards,
      requirements,
      overallStatus,
      complianceScore,
      gaps,
      improvementAreas,
      generatedAt: new Date().toISOString()
    };
  }

  static generateRiskAssessment(vulnerabilities: Vulnerability[], controls: Array<{ id: string; name: string; type: string; effectiveness: number; implemented: boolean }> = []): RiskAssessment {
    const riskScore = this.calculateRiskScore(vulnerabilities);
    const riskLevel = this.determineRiskLevel(riskScore);
    const likelihood = this.calculateOverallLikelihood(vulnerabilities);
    const impact = this.calculateOverallImpact(vulnerabilities);
    const threats = this.identifyThreats(vulnerabilities);

    return {
      riskLevel,
      likelihood,
      impact,
      riskScore,
      threats,
      controls,
      assessedAt: new Date().toISOString()
    };
  }

  private static calculateSecurityScore(vulnerabilities: Vulnerability[]): number {
    if (vulnerabilities.length === 0) return 10;

    const severityWeights = {
      critical: 10,
      high: 7.5,
      medium: 5,
      low: 2.5
    };

    const totalWeight = vulnerabilities.reduce((sum, vuln) => {
      if (vuln.falsePositive) return sum;
      return sum + (severityWeights[vuln.severity] || 5);
    }, 0);

    const maxPossibleWeight = vulnerabilities.length * 10;
    const score = 10 - (totalWeight / maxPossibleWeight) * 10;
    return Math.max(0, Math.min(10, score));
  }

  private static determineRiskLevel(score: number): RiskLevel {
    if (score >= 8) return 'low';
    if (score >= 6) return 'medium';
    if (score >= 4) return 'high';
    return 'critical';
  }

  private static identifyStrengths(vulnerabilities: Vulnerability[]): string[] {
    const strengths: string[] = [];
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical' && !v.falsePositive);
    const highVulns = vulnerabilities.filter(v => v.severity === 'high' && !v.falsePositive);

    if (criticalVulns.length === 0) strengths.push('No critical vulnerabilities detected');
    if (highVulns.length === 0) strengths.push('No high severity vulnerabilities detected');
    if (vulnerabilities.filter(v => !v.falsePositive).length === 0) strengths.push('Clean security scan results');

    const implementedControls = vulnerabilities.filter(v => v.status === 'mitigated').length;
    if (implementedControls > 0) strengths.push('Effective vulnerability mitigation strategies in place');

    return strengths;
  }

  private static identifyWeaknesses(vulnerabilities: Vulnerability[]): string[] {
    const weaknesses: string[] = [];
    const activeVulns = vulnerabilities.filter(v => !v.falsePositive && v.status === 'open');

    const severityCounts = activeVulns.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<VulnerabilitySeverity, number>);

    if (severityCounts.critical) weaknesses.push(`${severityCounts.critical} critical vulnerabilities requiring immediate attention`);
    if (severityCounts.high) weaknesses.push(`${severityCounts.high} high severity vulnerabilities need remediation`);
    if (activeVulns.length > 10) weaknesses.push('Large number of open vulnerabilities indicates systemic issues');

    return weaknesses;
  }

  private static generateAssessmentRecommendations(vulnerabilities: Vulnerability[]): string[] {
    const recommendations: string[] = [];
    const activeVulns = vulnerabilities.filter(v => !v.falsePositive && v.status === 'open');

    const criticalCount = activeVulns.filter(v => v.severity === 'critical').length;
    const highCount = activeVulns.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) recommendations.push(`Address ${criticalCount} critical vulnerabilities immediately`);
    if (highCount > 0) recommendations.push(`Remediate ${highCount} high severity vulnerabilities in next release cycle`);
    if (activeVulns.length > 0) recommendations.push('Implement automated security testing in CI/CD pipeline');
    if (vulnerabilities.some(v => v.cvssScore && v.cvssScore >= 7)) recommendations.push('Review and update security controls for high CVSS score vulnerabilities');

    return recommendations;
  }

  private static determineOverallComplianceStatus(statusCounts: Record<ComplianceStatus, number>, totalApplicable: number): ComplianceStatus {
    if (totalApplicable === 0) return 'not-applicable';
    if (statusCounts.non-compliant > 0) return 'non-compliant';
    if (statusCounts.partial > 0) return 'partial';
    return 'compliant';
  }

  private static calculateRiskScore(vulnerabilities: Vulnerability[]): number {
    if (vulnerabilities.length === 0) return 0;

    const severityScores = {
      critical: 10,
      high: 7.5,
      medium: 5,
      low: 2.5
    };

    const totalScore = vulnerabilities.reduce((sum, vuln) => {
      if (vuln.falsePositive) return sum;
      const baseScore = severityScores[vuln.severity] || 5;
      const confidenceMultiplier = vuln.confidence || 0.8;
      return sum + (baseScore * confidenceMultiplier);
    }, 0);

    return Math.min(10, totalScore / vulnerabilities.length);
  }

  private static calculateOverallLikelihood(vulnerabilities: Vulnerability[]): number {
    const activeVulns = vulnerabilities.filter(v => !v.falsePositive && v.status === 'open');
    if (activeVulns.length === 0) return 0;

    const severityLikelihood = {
      critical: 0.9,
      high: 0.7,
      medium: 0.5,
      low: 0.3
    };

    const totalLikelihood = activeVulns.reduce((sum, vuln) => {
      return sum + (severityLikelihood[vuln.severity] || 0.5);
    }, 0);

    return Math.min(1, totalLikelihood / activeVulns.length);
  }

  private static calculateOverallImpact(vulnerabilities: Vulnerability[]): number {
    const activeVulns = vulnerabilities.filter(v => !v.falsePositive && v.status === 'open');
    if (activeVulns.length === 0) return 0;

    const severityImpact = {
      critical: 0.9,
      high: 0.7,
      medium: 0.5,
      low: 0.3
    };

    const totalImpact = activeVulns.reduce((sum, vuln) => {
      return sum + (severityImpact[vuln.severity] || 0.5);
    }, 0);

    return Math.min(1, totalImpact / activeVulns.length);
  }

  private static identifyThreats(vulnerabilities: Vulnerability[]): Array<{ id: string; description: string; likelihood: number; impact: number; mitigation: string; residualRisk: number }> {
    const threats: Array<{ id: string; description: string; likelihood: number; impact: number; mitigation: string; residualRisk: number }> = [];

    const vulnByType = vulnerabilities.reduce((acc, vuln) => {
      const type = vuln.title.split(':')[0] || 'General';
      if (!acc[type]) acc[type] = [];
      acc[type].push(vuln);
      return acc;
    }, {} as Record<string, Vulnerability[]>);

    for (const [type, typeVulns] of Object.entries(vulnByType)) {
      const avgLikelihood = typeVulns.reduce((sum, v) => sum + (v.confidence || 0.8), 0) / typeVulns.length;
      const maxImpact = Math.max(...typeVulns.map(v => {
        const severityImpact = { critical: 0.9, high: 0.7, medium: 0.5, low: 0.3 };
        return severityImpact[v.severity] || 0.5;
      }));

      threats.push({
        id: this.generateUUID(),
        description: `${type} vulnerabilities (${typeVulns.length} instances)`,
        likelihood: avgLikelihood,
        impact: maxImpact,
        mitigation: `Implement ${type.toLowerCase()} security controls and validation`,
        residualRisk: avgLikelihood * maxImpact * 0.5
      });
    }

    return threats;
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export class SecurityReportAnalyzer {
  static getVulnerabilitySummary(report: SecurityReport): { total: number; bySeverity: Record<VulnerabilitySeverity, number>; byStatus: Record<VulnerabilityStatus, number> } {
    const vulnerabilities = report.assessment.vulnerabilities;
    const bySeverity = vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<VulnerabilitySeverity, number>);

    const byStatus = vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.status] = (acc[vuln.status] || 0) + 1;
      return acc;
    }, {} as Record<VulnerabilityStatus, number>);

    return {
      total: vulnerabilities.length,
      bySeverity,
      byStatus
    };
  }

  static getTopVulnerabilities(report: SecurityReport, limit: number = 10): Vulnerability[] {
    return report.assessment.vulnerabilities
      .filter(v => !v.falsePositive && v.status === 'open')
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aScore = severityOrder[a.severity] || 0;
        const bScore = severityOrder[b.severity] || 0;
        if (bScore !== aScore) return bScore - aScore;
        return (b.cvssScore || 0) - (a.cvssScore || 0);
      })
      .slice(0, limit);
  }

  static getComplianceGaps(report: ComplianceReport): ComplianceRequirement[] {
    return report.requirements.filter(req => req.status === 'non-compliant');
  }

  static getHighPriorityRecommendations(report: SecurityReport): SecurityRecommendation[] {
    return report.recommendations
      .filter(rec => rec.priority === 'critical' || rec.priority === 'high')
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  static calculateRiskTrend(currentReport: SecurityReport, previousReport?: SecurityReport): { trend: 'improving' | 'deteriorating' | 'stable'; change: number } {
    if (!previousReport) return { trend: 'stable', change: 0 };

    const currentScore = currentReport.assessment.overallScore;
    const previousScore = previousReport.assessment.overallScore;
    const change = currentScore - previousScore;

    if (change > 0.5) return { trend: 'improving', change };
    if (change < -0.5) return { trend: 'deteriorating', change };
    return { trend: 'stable', change };
  }

  static isReportExpired(report: SecurityReport): boolean {
    return new Date() > new Date(report.validUntil);
  }

  static shouldBlockDeployment(report: SecurityReport, threshold: RiskLevel = 'high'): boolean {
    const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const currentRiskOrder = riskOrder[report.risk.riskLevel] || 0;
    const thresholdOrder = riskOrder[threshold] || 0;
    
    return currentRiskOrder >= thresholdOrder;
  }
}

export class SecurityReportSerializer {
  static serializeReport(report: SecurityReport): string {
    return JSON.stringify(report, null, 2);
  }

  static deserializeReport(jsonString: string): { success: boolean; report?: SecurityReport; errors?: string[] } {
    try {
      const data = JSON.parse(jsonString);
      return SecurityReportValidator.validateSecurityReport(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { success: false, errors: ['Invalid JSON format'] };
      }
      return { success: false, errors: ['Failed to parse security report'] };
    }
  }

  static toCSV(report: SecurityReport): string {
    const headers = ['ID', 'Title', 'Severity', 'Status', 'File', 'Line', 'CVSS', 'Description'];
    const vulnerabilities = report.assessment.vulnerabilities;
    
    const csvRows = [
      headers.join(','),
      ...vulnerabilities.map(vuln => [
        vuln.id,
        `"${vuln.title.replace(/"/g, '""')}"`,
        vuln.severity,
        vuln.status,
        `"${vuln.location.file.replace(/"/g, '""')}"`,
        vuln.location.line || '',
        vuln.cvssScore || '',
        `"${vuln.description.replace(/"/g, '""')}"`
      ].join(','))
    ];
    
    return csvRows.join('\n');
  }

  static toHTML(report: SecurityReport): string {
    const summary = SecurityReportAnalyzer.getVulnerabilitySummary(report);
    const topVulns = SecurityReportAnalyzer.getTopVulnerabilities(report, 5);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Report - ${report.pluginId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .vulnerability { border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .critical { border-left: 4px solid #d73a49; }
        .high { border-left: 4px solid #f66a0a; }
        .medium { border-left: 4px solid #ffd33d; }
        .low { border-left: 4px solid #28a745; }
        .metric { display: inline-block; margin: 0 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Assessment Report</h1>
        <p>Plugin: ${report.pluginId} v${report.pluginVersion}</p>
        <p>Generated: ${new Date(report.generatedAt).toLocaleDateString()}</p>
        <div class="metrics">
            <div class="metric"><strong>Overall Score:</strong> ${report.assessment.overallScore.toFixed(1)}/10</div>
            <div class="metric"><strong>Risk Level:</strong> ${report.risk.riskLevel}</div>
            <div class="metric"><strong>Compliance:</strong> ${report.compliance.overallStatus}</div>
        </div>
    </div>
    
    <div class="section">
        <h2>Vulnerability Summary</h2>
        <p>Total: ${summary.total} (Critical: ${summary.bySeverity.critical || 0}, High: ${summary.bySeverity.high || 0})</p>
    </div>
    
    <div class="section">
        <h2>Top Vulnerabilities</h2>
        ${topVulns.map(vuln => `
        <div class="vulnerability ${vuln.severity}">
            <h3>${vuln.title} <span style="color: #666;">(${vuln.severity})</span></h3>
            <p><strong>Location:</strong> ${vuln.location.file}${vuln.location.line ? `:${vuln.location.line}` : ''}</p>
            <p>${vuln.description}</p>
            ${vuln.remediation ? `<p><strong>Remediation:</strong> ${vuln.remediation}</p>` : ''}
        </div>
        `).join('')}
    </div>
</body>
</html>
    `.trim();
  }
}