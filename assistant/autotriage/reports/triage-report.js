/**
 * Triage report generator
 * Generates comprehensive triage reports with prioritization
 */
export function generateTriageReport(items, clusters, topIssuesCount = 10, topThemesCount = 10) {
    const now = new Date().toISOString();
    // Calculate summary statistics
    const summary = {
        totalItems: items.length,
        bySource: countByField(items, 'source'),
        byArea: countByArea(items),
        byImpact: countByField(items, 'impact'),
        byType: countByField(items, 'type'),
    };
    // Get top blocking themes (clusters with highest impact)
    const topBlockingThemes = clusters
        .filter((c) => c.avgImpactScore >= 50) // High impact threshold
        .sort((a, b) => b.avgImpactScore - a.avgImpactScore)
        .slice(0, topThemesCount);
    // Get top individual issues by impact score
    const topIssues = [...items]
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, topIssuesCount);
    // Get good first issues
    const goodFirstIssues = items.filter((item) => item.isGoodFirstIssue);
    // Generate recommendations
    const recommendations = generateRecommendations(items, clusters, topBlockingThemes);
    return {
        generatedAt: now,
        summary,
        topBlockingThemes,
        topIssues,
        goodFirstIssues,
        clusters,
        recommendations,
    };
}
function countByField(items, field) {
    const counts = {};
    items.forEach((item) => {
        const value = String(item[field]);
        counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
}
function countByArea(items) {
    const counts = {};
    items.forEach((item) => {
        item.area.forEach((area) => {
            counts[area] = (counts[area] || 0) + 1;
        });
    });
    return counts;
}
function generateRecommendations(items, clusters, topThemes) {
    const recommendations = [];
    // Blocker recommendations
    const blockers = items.filter((i) => i.impact === 'blocker');
    if (blockers.length > 0) {
        recommendations.push(`🚨 ${blockers.length} BLOCKER issue(s) require immediate attention`);
    }
    // Cluster recommendations
    if (topThemes.length > 0) {
        const topTheme = topThemes[0];
        recommendations.push(`📊 Top recurring theme: "${topTheme.theme}" with ${topTheme.count} related issues - consider creating an epic`);
    }
    // Area concentration
    const areaStats = countByArea(items);
    const topArea = Object.entries(areaStats).sort((a, b) => b[1] - a[1])[0];
    if (topArea && topArea[1] > items.length * 0.3) {
        recommendations.push(`🎯 ${Math.round((topArea[1] / items.length) * 100)}% of issues are in "${topArea[0]}" - consider dedicated sprint`);
    }
    // Good first issues
    const goodFirst = items.filter((i) => i.isGoodFirstIssue);
    if (goodFirst.length > 0) {
        recommendations.push(`👋 ${goodFirst.length} issues tagged as good first issues for new contributors`);
    }
    // Unowned issues
    const unowned = items.filter((i) => !i.owner || i.owner === 'TBD');
    if (unowned.length > items.length * 0.5) {
        recommendations.push(`⚠️  ${unowned.length} issues (${Math.round((unowned.length / items.length) * 100)}%) are unassigned - consider ownership assignment`);
    }
    // Tech debt accumulation
    const techDebt = items.filter((i) => i.type === 'tech-debt');
    if (techDebt.length > 10) {
        recommendations.push(`🔧 ${techDebt.length} tech debt items - schedule dedicated cleanup sprint`);
    }
    return recommendations;
}
/**
 * Format report as markdown
 */
export function formatReportAsMarkdown(report) {
    const lines = [];
    lines.push('# Triage Report');
    lines.push('');
    lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push('');
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Items**: ${report.summary.totalItems}`);
    lines.push('');
    lines.push('### By Source');
    Object.entries(report.summary.bySource).forEach(([source, count]) => {
        lines.push(`- ${source}: ${count}`);
    });
    lines.push('');
    lines.push('### By Impact');
    Object.entries(report.summary.byImpact).forEach(([impact, count]) => {
        const emoji = getImpactEmoji(impact);
        lines.push(`- ${emoji} ${impact}: ${count}`);
    });
    lines.push('');
    lines.push('### By Area');
    Object.entries(report.summary.byArea)
        .sort((a, b) => b[1] - a[1])
        .forEach(([area, count]) => {
        lines.push(`- ${area}: ${count}`);
    });
    lines.push('');
    lines.push('### By Type');
    Object.entries(report.summary.byType).forEach(([type, count]) => {
        lines.push(`- ${type}: ${count}`);
    });
    lines.push('');
    // Recommendations
    if (report.recommendations.length > 0) {
        lines.push('## 🎯 Recommendations');
        lines.push('');
        report.recommendations.forEach((rec) => {
            lines.push(`- ${rec}`);
        });
        lines.push('');
    }
    // Top Blocking Themes
    if (report.topBlockingThemes.length > 0) {
        lines.push('## 🔥 Top 10 Blocking Themes');
        lines.push('');
        report.topBlockingThemes.forEach((cluster, idx) => {
            lines.push(`### ${idx + 1}. ${cluster.theme}`);
            lines.push('');
            lines.push(`- **Count**: ${cluster.count} related issues`);
            lines.push(`- **Areas**: ${cluster.area.join(', ') || 'N/A'}`);
            lines.push(`- **Avg Impact Score**: ${cluster.avgImpactScore.toFixed(1)}`);
            lines.push('');
            lines.push('**Related Issues**:');
            cluster.items.slice(0, 5).forEach((item) => {
                const impactEmoji = getImpactEmoji(item.impact);
                lines.push(`- ${impactEmoji} [${item.id}] ${item.title} (${item.source})`);
            });
            if (cluster.items.length > 5) {
                lines.push(`- ... and ${cluster.items.length - 5} more`);
            }
            lines.push('');
        });
    }
    // Top Issues
    if (report.topIssues.length > 0) {
        lines.push('## ⚡ Top Priority Issues');
        lines.push('');
        lines.push('| ID | Title | Impact | Type | Area | Score | Source |');
        lines.push('|----|-------|--------|------|------|-------|--------|');
        report.topIssues.forEach((item) => {
            const impactEmoji = getImpactEmoji(item.impact);
            lines.push(`| ${item.id} | ${truncate(item.title, 50)} | ${impactEmoji} ${item.impact} | ${item.type} | ${item.area.join(', ')} | ${item.impactScore.toFixed(0)} | ${item.source} |`);
        });
        lines.push('');
    }
    // Good First Issues
    if (report.goodFirstIssues.length > 0) {
        lines.push('## 👋 Good First Issues');
        lines.push('');
        report.goodFirstIssues.slice(0, 10).forEach((item) => {
            lines.push(`- [${item.id}] ${item.title} (${item.area.join(', ')}) - Complexity: ${item.complexityScore}`);
        });
        if (report.goodFirstIssues.length > 10) {
            lines.push(`- ... and ${report.goodFirstIssues.length - 10} more`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Format report as JSON
 */
export function formatReportAsJSON(report) {
    return JSON.stringify(report, null, 2);
}
function getImpactEmoji(impact) {
    switch (impact) {
        case 'blocker':
            return '🚨';
        case 'high':
            return '🔴';
        case 'medium':
            return '🟡';
        case 'low':
            return '🟢';
        default:
            return '⚪';
    }
}
function truncate(str, maxLen) {
    return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}
//# sourceMappingURL=triage-report.js.map