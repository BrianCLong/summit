import { gql } from '@apollo/client';
import type {
  DashboardInitializePayload,
  DashboardWidget,
  DashboardWidgetPosition,
} from '../../../store/slices/dashboard';

export interface DashboardWidgetGraphQL {
  id: string;
  type: string;
  title: string;
  position: DashboardWidgetPosition;
  config?: Record<string, unknown> | null;
  dataSource?: Record<string, unknown> | null;
  refreshInterval?: number | null;
}

export interface DashboardConfigurationGraphQL {
  id: string;
  name: string;
  description?: string | null;
  layout: 'grid' | 'freeform';
  settings?: Record<string, unknown> | null;
  updatedAt: string;
  widgets: DashboardWidgetGraphQL[];
}

export interface MaestroDashboardConfigurationQuery {
  dashboardConfiguration: DashboardConfigurationGraphQL | null;
}

export interface MaestroDashboardConfigurationQueryVariables {
  id?: string | null;
}

export interface SaveDashboardWidgetInput {
  id?: string | null;
  type: string;
  title: string;
  position: DashboardWidgetPosition;
  config?: Record<string, unknown> | null;
  dataSource?: Record<string, unknown> | null;
  refreshInterval?: number | null;
}

export interface SaveDashboardConfigurationInput {
  id?: string | null;
  name: string;
  description?: string | null;
  layout: 'grid' | 'freeform';
  settings?: Record<string, unknown> | null;
  widgets: SaveDashboardWidgetInput[];
}

export interface SaveDashboardConfigurationMutation {
  saveDashboardConfiguration: DashboardConfigurationGraphQL;
}

export interface SaveDashboardConfigurationMutationVariables {
  input: SaveDashboardConfigurationInput;
}

export const DASHBOARD_CONFIGURATION_QUERY = gql`
  query MaestroDashboardConfiguration($id: ID) {
    dashboardConfiguration(id: $id) {
      id
      name
      description
      layout
      settings
      updatedAt
      widgets {
        id
        type
        title
        position {
          x
          y
          w
          h
        }
        config
        dataSource
        refreshInterval
      }
    }
  }
`;

export const SAVE_DASHBOARD_CONFIGURATION_MUTATION = gql`
  mutation SaveDashboardConfiguration($input: SaveDashboardConfigurationInput!) {
    saveDashboardConfiguration(input: $input) {
      id
      name
      description
      layout
      settings
      updatedAt
      widgets {
        id
        type
        title
        position {
          x
          y
          w
          h
        }
        config
        dataSource
        refreshInterval
      }
    }
  }
`;

export function mapGraphQLWidgetToState(widget: DashboardWidgetGraphQL): DashboardWidget {
  return {
    id: widget.id,
    type: widget.type,
    title: widget.title,
    position: widget.position,
    config: widget.config ?? null,
    dataSource: widget.dataSource ?? null,
    refreshInterval: widget.refreshInterval ?? null,
  };
}

export function mapDashboardResponseToState(
  config: DashboardConfigurationGraphQL,
): DashboardInitializePayload {
  return {
    id: config.id,
    name: config.name,
    description: config.description ?? null,
    layout: config.layout,
    widgets: config.widgets.map(mapGraphQLWidgetToState),
    settings: config.settings ?? null,
    updatedAt: config.updatedAt,
  };
}

export function mapStateWidgetToInput(widget: DashboardWidget): SaveDashboardWidgetInput {
  return {
    id: widget.id,
    type: widget.type,
    title: widget.title,
    position: widget.position,
    config: widget.config ?? null,
    dataSource: widget.dataSource ?? null,
    refreshInterval: widget.refreshInterval ?? null,
  };
}
