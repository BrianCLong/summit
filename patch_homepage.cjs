const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/HomePage.tsx', 'utf8');

// The new imports and types
const newImports = `import React, { useState, useEffect, useCallback, memo } from 'react'
import {
  ArrowRight,
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
  LucideIcon
} from 'lucide-react'`;

content = content.replace(/import React, { useState, useEffect } from 'react'\\nimport {\\n  ArrowRight,\\n  Search,\\n  AlertTriangle,\\n  FileText,\\n  BarChart3,\\n} from 'lucide-react'/, newImports);

const newTypes = `
import type { KPIMetric, Investigation, Alert, Case } from '@/types'

// Extracted Memoized Components for Performance

const QuickActionCard = memo(({ action, onActionClick, onActionKeyDown }: {
  action: { title: string, description: string, icon: LucideIcon, href: string, color: string, badge?: string },
  onActionClick: (href: string) => void,
  onActionKeyDown: (e: React.KeyboardEvent, href: string) => void
}) => {
  const Icon = action.icon;
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      onClick={() => onActionClick(action.href)}
      tabIndex={0}
      onKeyDown={(e) => onActionKeyDown(e, action.href)}
      role="button"
      aria-label={\`\${action.title}: \${action.description}\`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={\`p-2 rounded-lg \${action.color} text-white\`}>
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
  );
});
QuickActionCard.displayName = 'QuickActionCard';

const InvestigationRow = memo(({ investigation, onClick, onKeyDown }: {
  investigation: Investigation,
  onClick: (id: string) => void,
  onKeyDown: (e: React.KeyboardEvent, id: string) => void
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={\`View investigation: \${investigation.title}\`}
    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => onClick(investigation.id)}
    onKeyDown={(e) => onKeyDown(e, investigation.id)}
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
));
InvestigationRow.displayName = 'InvestigationRow';

const AlertRow = memo(({ alert, onClick, onKeyDown, getSeverityBadgeVariant }: {
  alert: Alert,
  onClick: (id: string) => void,
  onKeyDown: (e: React.KeyboardEvent, id: string) => void,
  getSeverityBadgeVariant: (severity: string) => "default" | "secondary" | "destructive" | "outline" | "warning" | "success"
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={\`View alert: \${alert.title}\`}
    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => onClick(alert.id)}
    onKeyDown={(e) => onKeyDown(e, alert.id)}
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
));
AlertRow.displayName = 'AlertRow';

const CaseRow = memo(({ caseItem, onClick, onKeyDown, getPriorityBadgeVariant }: {
  caseItem: Case,
  onClick: (id: string) => void,
  onKeyDown: (e: React.KeyboardEvent, id: string) => void,
  getPriorityBadgeVariant: (priority: string) => "default" | "secondary" | "destructive" | "outline" | "warning" | "success"
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={\`View case: \${caseItem.title}\`}
    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => onClick(caseItem.id)}
    onKeyDown={(e) => onKeyDown(e, caseItem.id)}
  >
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{caseItem.title}</div>
      <div className="text-sm text-muted-foreground">
        {caseItem.investigationIds.length} investigations •{' '}
        {caseItem.alertIds.length} alerts
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge
        variant={getPriorityBadgeVariant(caseItem.priority) as any}
        className="text-xs"
      >
        {caseItem.priority}
      </Badge>
      <Badge variant="outline" className="text-xs">
        {caseItem.status.replace('_', ' ')}
      </Badge>
    </div>
  </div>
));
CaseRow.displayName = 'CaseRow';
`;

content = content.replace(/import type \{ KPIMetric, Investigation, Alert, Case \} from '@\/types'/, newTypes);

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
                    getSeverityBadgeVariant={getSeverityBadgeVariant}
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
                    getPriorityBadgeVariant={getPriorityBadgeVariant}
                  />
                ))`;
content = content.replace(replaceMap4, newMap4);


const handlers = `  const handleItemKeyDown = (e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(path)
    }
  }`;

const newHandlers = `  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(path)
    }
  }, [navigate]);

  const handleActionClick = useCallback((href: string) => {
    navigate(href);
  }, [navigate]);

  const handleActionKeyDown = useCallback((e: React.KeyboardEvent, href: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(href);
    }
  }, [navigate]);

  const handleInvestigationClick = useCallback((id: string) => {
    navigate(\`/explore?investigation=\${id}\`);
  }, [navigate]);

  const handleInvestigationKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, \`/explore?investigation=\${id}\`);
  }, [handleItemKeyDown]);

  const handleAlertClick = useCallback((id: string) => {
    navigate(\`/alerts/\${id}\`);
  }, [navigate]);

  const handleAlertKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, \`/alerts/\${id}\`);
  }, [handleItemKeyDown]);

  const handleCaseClick = useCallback((id: string) => {
    navigate(\`/cases/\${id}\`);
  }, [navigate]);

  const handleCaseKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    handleItemKeyDown(e, \`/cases/\${id}\`);
  }, [handleItemKeyDown]);
`;

content = content.replace(handlers, newHandlers);

fs.writeFileSync('apps/web/src/pages/HomePage.tsx', content, 'utf8');
