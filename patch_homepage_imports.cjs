const fs = require('fs');

const path = 'apps/web/src/pages/HomePage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace standard imports
const oldImports = `import React, { useState, useEffect } from 'react'
import {
  ArrowRight,
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
} from 'lucide-react'`;

const newImports = `import React, { useState, useEffect, useCallback, memo } from 'react'
import {
  ArrowRight,
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
  LucideIcon,
} from 'lucide-react'`;

content = content.replace(oldImports, newImports);

// Fix double definitions of components by dropping the top half of the duplication
const badStart = `import type { KPIMetric, Investigation, Alert, Case } from '@/types'

// Extracted Memoized Components for Performance

const QuickActionCard = memo(({ action, onActionClick, onActionKeyDown }: {
  action: { title: string, description: string, icon: LucideIcon, href: string, color: string, badge?: string },
  onActionClick: (href: string) => void,
  onActionKeyDown: (e: React.KeyboardEvent, href: string) => void`;

const findBadStartIdx = content.indexOf(badStart);
if (findBadStartIdx !== -1) {
    const endString = `CaseRow.displayName = 'CaseRow';\n`;
    const findEndIdx = content.indexOf(endString, findBadStartIdx) + endString.length;
    // We remove the first instance of these
    content = content.slice(0, findBadStartIdx) + `import type { KPIMetric, Investigation, Alert, Case } from '@/types'` + content.slice(findEndIdx);
}


fs.writeFileSync(path, content, 'utf8');
