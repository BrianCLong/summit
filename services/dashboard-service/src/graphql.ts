import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Express } from 'express';
import { DashboardService } from './services/DashboardService';

const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');

export async function setupGraphQL(app: Express, dashboardService: DashboardService) {
  const resolvers = {
    Query: {
      dashboard: async (_: any, { id }: { id: string }) => {
        return dashboardService.getDashboard(id);
      },

      dashboards: async (_: any, { filter, limit, offset }: any) => {
        const dashboards = await dashboardService.listDashboards(filter);
        const start = offset || 0;
        const end = limit ? start + limit : undefined;
        return dashboards.slice(start, end);
      },

      widgetTemplates: async (_: any, { category }: { category?: string }) => {
        return dashboardService.getWidgetTemplates(category);
      },

      dashboardTemplates: async (_: any, { category }: { category?: string }) => {
        // Return predefined dashboard templates
        return [];
      },

      widgetData: async (_: any, { widgetId, filters }: any) => {
        // Would fetch actual widget data based on widget config
        return {};
      },

      searchDashboards: async (_: any, { query }: { query: string }) => {
        const dashboards = await dashboardService.listDashboards();
        return dashboards.filter(d =>
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.description?.toLowerCase().includes(query.toLowerCase())
        );
      },
    },

    Mutation: {
      createDashboard: async (_: any, { input }: any) => {
        return dashboardService.createDashboard(input);
      },

      updateDashboard: async (_: any, { id, input }: any) => {
        return dashboardService.updateDashboard(id, input);
      },

      deleteDashboard: async (_: any, { id }: { id: string }) => {
        return dashboardService.deleteDashboard(id);
      },

      duplicateDashboard: async (_: any, { id }: { id: string }) => {
        return dashboardService.duplicateDashboard(id);
      },

      createPage: async (_: any, { dashboardId, input }: any) => {
        const dashboard = await dashboardService.getDashboard(dashboardId);
        if (!dashboard) throw new Error('Dashboard not found');

        const newPage = {
          id: `page-${Date.now()}`,
          name: input.name,
          layout: input.layout,
          widgets: [],
          order: dashboard.pages.length,
        };

        dashboard.pages.push(newPage);
        await dashboardService.updateDashboard(dashboardId, { pages: dashboard.pages });

        return newPage;
      },

      updatePage: async (_: any, { pageId, input }: any) => {
        // Implementation would find and update the page
        return { id: pageId, ...input };
      },

      deletePage: async (_: any, { pageId }: { pageId: string }) => {
        // Implementation would find and delete the page
        return true;
      },

      addWidget: async (_: any, { pageId, input }: any, context: any) => {
        // Would need dashboard ID from context or input
        const widget = {
          id: `widget-${Date.now()}`,
          ...input,
        };
        return widget;
      },

      updateWidget: async (_: any, { widgetId, input }: any) => {
        return { id: widgetId, ...input };
      },

      deleteWidget: async (_: any, { widgetId }: { widgetId: string }) => {
        return true;
      },

      duplicateWidget: async (_: any, { widgetId }: { widgetId: string }) => {
        return { id: `widget-${Date.now()}-copy` };
      },

      moveWidget: async (_: any, { widgetId, targetPageId }: any) => {
        return true;
      },

      exportDashboard: async (_: any, { dashboardId, format }: any) => {
        return dashboardService.exportDashboard(dashboardId, format);
      },

      updatePermissions: async (_: any, { dashboardId, input }: any) => {
        return dashboardService.updateDashboard(dashboardId, { permissions: input });
      },

      shareDashboard: async (_: any, { dashboardId, userIds }: any) => {
        return true;
      },
    },

    // Scalar resolvers
    DateTime: {
      serialize(value: Date) {
        return value.toISOString();
      },
      parseValue(value: string) {
        return new Date(value);
      },
    },

    JSON: {
      serialize(value: any) {
        return value;
      },
      parseValue(value: any) {
        return value;
      },
    },
  };

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => ({
        userId: req.headers['x-user-id'],
        token: req.headers.authorization,
      }),
    })
  );

  console.log('GraphQL server ready at /graphql');
}
