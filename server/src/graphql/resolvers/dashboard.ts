import { z } from 'zod';
import { requireAuth } from '../../lib/auth.js';
import {
  fetchDashboardConfiguration,
  saveDashboardConfiguration,
  type DashboardConfigurationRecord,
  type SaveDashboardConfiguration,
} from '../../db/repositories/dashboardConfigs.js';

const positionSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

const widgetSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  position: positionSchema,
  config: z.any().optional(),
  dataSource: z.any().optional(),
  refreshInterval: z.number().int().nullable().optional(),
});

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  layout: z.enum(['grid', 'freeform']).default('grid'),
  settings: z.any().optional(),
  widgets: z.array(widgetSchema),
});

function toGraphQL(record: DashboardConfigurationRecord) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    layout: record.layout,
    settings: record.settings,
    updatedAt:
      record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
    widgets: record.widgets.map((widget) => ({
      id: widget.id,
      type: widget.type,
      title: widget.title,
      position: widget.position,
      config: widget.config,
      dataSource: widget.dataSource,
      refreshInterval: widget.refreshInterval,
    })),
  };
}

export const dashboardResolvers = {
  Query: {
    async dashboardConfiguration(_parent: unknown, args: { id?: string | null }, context: any) {
      const user = requireAuth(context);
      const record = await fetchDashboardConfiguration({ id: args?.id ?? null, userId: user.id });
      return record ? toGraphQL(record) : null;
    },
  },
  Mutation: {
    async saveDashboardConfiguration(
      _parent: unknown,
      args: { input: Omit<SaveDashboardConfiguration, 'userId'> },
      context: any,
    ) {
      const user = requireAuth(context);
      const parsed = saveSchema.parse(args.input);
      const record = await saveDashboardConfiguration({ ...parsed, userId: user.id });
      return toGraphQL(record);
    },
  },
};

export default dashboardResolvers;
