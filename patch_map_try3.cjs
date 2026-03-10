const fs = require('fs');

const path = 'apps/web/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const regexMap1 = /\{quickActions\.map\(action => \{[\s\S]*?\}\)\}/;

const newMap1 = `{quickActions.map(action => (
            <QuickActionCard
              key={action.title}
              action={action as any}
              onActionClick={handleActionClick}
              onActionKeyDown={handleActionKeyDown}
            />
          ))}`;

content = content.replace(regexMap1, newMap1);

const regexMap2 = /\{loading[\s\S]*?:\s*recentInvestigations\.map\(investigation => \([\s\S]*?\)[\s\S]*?\}\s*<\/CardContent>/;

const newMap2 = `{loading
              ? [...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ))
              : recentInvestigations.map(investigation => (
                  <InvestigationRow
                    key={investigation.id}
                    investigation={investigation}
                    onClick={handleInvestigationClick}
                    onKeyDown={handleInvestigationKeyDown}
                  />
                ))}
          </CardContent>`;

content = content.replace(regexMap2, newMap2);

const regexMap3 = /\{loading[\s\S]*?:\s*recentAlerts\.map\(alert => \([\s\S]*?\)[\s\S]*?\}\s*<\/CardContent>/;

const newMap3 = `{loading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              : recentAlerts.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onClick={handleAlertClick}
                    onKeyDown={handleAlertKeyDown}
                    getSeverityBadgeVariant={getSeverityBadgeVariant as any}
                  />
                ))}
          </CardContent>`;

content = content.replace(regexMap3, newMap3);

const regexMap4 = /\{loading[\s\S]*?:\s*recentCases\.map\(case_ => \([\s\S]*?\)[\s\S]*?\}\s*<\/CardContent>/;

const newMap4 = `{loading
              ? [...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))
              : recentCases.map(case_ => (
                  <CaseRow
                    key={case_.id}
                    caseItem={case_}
                    onClick={handleCaseClick}
                    onKeyDown={handleCaseKeyDown}
                    getPriorityBadgeVariant={getPriorityBadgeVariant as any}
                  />
                ))}
          </CardContent>`;

content = content.replace(regexMap4, newMap4);

fs.writeFileSync(path, content, 'utf8');
