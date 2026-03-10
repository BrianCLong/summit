const fs = require('fs');
const path = 'apps/web/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

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
  getSeverityBadgeVariant: (severity: string) => "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | null | undefined
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
        variant={getSeverityBadgeVariant(alert.severity)}
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
  getPriorityBadgeVariant: (priority: string) => "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | null | undefined
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
        variant={getPriorityBadgeVariant(caseItem.priority)}
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

fs.writeFileSync(path, content, 'utf8');
