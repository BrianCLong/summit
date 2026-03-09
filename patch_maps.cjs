const fs = require('fs');

const path = 'apps/web/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const replaceMap1 = `          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => navigate(action.href)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(action.href);
                  }
                }}
                role="button"
                aria-label={\`\${action.title}: \${action.description}\`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={\`p-2 rounded-lg \${action.color} text-white\`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {action.title}
                        {action.badge && (
                          <Badge variant="destructive" className="text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}`;

const newMap1 = `          {quickActions.map(action => (
            <QuickActionCard
              key={action.title}
              action={action as any}
              onActionClick={handleActionClick}
              onActionKeyDown={handleActionKeyDown}
            />
          ))}`;
content = content.replace(replaceMap1, newMap1);

const replaceMap2 = `              : recentInvestigations.map(investigation => (
                  <div
                    key={investigation.id}
                    role="button"
                    tabIndex={0}
                    aria-label={\`View investigation: \${investigation.title}\`}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() =>
                      navigate(\`/explore?investigation=\${investigation.id}\`)
                    }
                    onKeyDown={e =>
                      handleItemKeyDown(
                        e,
                        \`/explore?investigation=\${investigation.id}\`
                      )
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {investigation.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {investigation.status.replace('_', ' ')} •{' '}
                        {new Date(investigation.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {investigation.priority}
                      </Badge>
                    </div>
                  </div>
                ))`;
const newMap2 = `              : recentInvestigations.map(investigation => (
                  <InvestigationRow
                    key={investigation.id}
                    investigation={investigation}
                    onClick={handleInvestigationClick}
                    onKeyDown={handleInvestigationKeyDown}
                  />
                ))`;
content = content.replace(replaceMap2, newMap2);

const replaceMap3 = `              : recentAlerts.map(alert => (
                  <div
                    key={alert.id}
                    role="button"
                    tabIndex={0}
                    aria-label={\`View alert: \${alert.title}\`}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => navigate(\`/alerts/\${alert.id}\`)}
                    onKeyDown={e =>
                      handleItemKeyDown(e, \`/alerts/\${alert.id}\`)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {alert.source} •{' '}
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getSeverityBadgeVariant(alert.severity) as any}
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))`;
const newMap3 = `              : recentAlerts.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onClick={handleAlertClick}
                    onKeyDown={handleAlertKeyDown}
                    getSeverityBadgeVariant={getSeverityBadgeVariant as any}
                  />
                ))`;
content = content.replace(replaceMap3, newMap3);

const replaceMap4 = `              : recentCases.map(case_ => (
                  <div
                    key={case_.id}
                    role="button"
                    tabIndex={0}
                    aria-label={\`View case: \${case_.title}\`}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => navigate(\`/cases/\${case_.id}\`)}
                    onKeyDown={e =>
                      handleItemKeyDown(e, \`/cases/\${case_.id}\`)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{case_.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {case_.investigationIds.length} investigations •{' '}
                        {case_.alertIds.length} alerts
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={getPriorityBadgeVariant(case_.priority) as any}
                        className="text-xs"
                      >
                        {case_.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {case_.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))`;
const newMap4 = `              : recentCases.map(case_ => (
                  <CaseRow
                    key={case_.id}
                    caseItem={case_}
                    onClick={handleCaseClick}
                    onKeyDown={handleCaseKeyDown}
                    getPriorityBadgeVariant={getPriorityBadgeVariant as any}
                  />
                ))`;
content = content.replace(replaceMap4, newMap4);

fs.writeFileSync(path, content, 'utf8');
