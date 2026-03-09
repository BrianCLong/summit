const fs = require('fs');
const path = 'apps/web/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const regexMap2 = /: recentInvestigations\.map\(investigation => \([\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>\n                \)\)/;

const newMap2 = `: recentInvestigations.map(investigation => (
                  <InvestigationRow
                    key={investigation.id}
                    investigation={investigation}
                    onClick={handleInvestigationClick}
                    onKeyDown={handleInvestigationKeyDown}
                  />
                ))`;

content = content.replace(regexMap2, newMap2);

const regexMap3 = /: recentAlerts\.map\(alert => \([\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>\n                \)\)/;

const newMap3 = `: recentAlerts.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onClick={handleAlertClick}
                    onKeyDown={handleAlertKeyDown}
                    getSeverityBadgeVariant={getSeverityBadgeVariant as any}
                  />
                ))`;

content = content.replace(regexMap3, newMap3);

const regexMap4 = /: recentCases\.map\(case_ => \([\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>\n                \)\)/;

const newMap4 = `: recentCases.map(case_ => (
                  <CaseRow
                    key={case_.id}
                    caseItem={case_}
                    onClick={handleCaseClick}
                    onKeyDown={handleCaseKeyDown}
                    getPriorityBadgeVariant={getPriorityBadgeVariant as any}
                  />
                ))`;

content = content.replace(regexMap4, newMap4);

fs.writeFileSync(path, content, 'utf8');
