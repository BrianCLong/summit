/**
 * Tableau Integration Connector
 * Syncs metadata between Tableau and the data catalog
 */

import axios, { AxiosInstance } from 'axios';

export interface TableauConfig {
  serverUrl: string;
  siteName: string;
  username: string;
  password: string;
  apiVersion?: string;
}

export interface TableauWorkbook {
  id: string;
  name: string;
  description?: string;
  projectName: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
}

export interface TableauDatasource {
  id: string;
  name: string;
  type: string;
  connectionType: string;
  serverAddress?: string;
  databaseName?: string;
  tables: string[];
  certificationNote?: string;
  isCertified: boolean;
}

export class TableauConnector {
  private client: AxiosInstance;
  private authToken?: string;
  private siteId?: string;

  constructor(private config: TableauConfig) {
    this.client = axios.create({
      baseURL: `${config.serverUrl}/api/${config.apiVersion || '3.16'}`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Authenticate with Tableau Server
   */
  async authenticate(): Promise<void> {
    const response = await this.client.post('/auth/signin', {
      credentials: {
        name: this.config.username,
        password: this.config.password,
        site: {
          contentUrl: this.config.siteName,
        },
      },
    });

    this.authToken = response.data.credentials.token;
    this.siteId = response.data.credentials.site.id;

    // Set auth header for future requests
    this.client.defaults.headers.common['X-Tableau-Auth'] = this.authToken;
  }

  /**
   * Extract workbooks from Tableau
   */
  async extractWorkbooks(): Promise<TableauWorkbook[]> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const response = await this.client.get(`/sites/${this.siteId}/workbooks`);

    return response.data.workbooks.workbook.map((wb: any) => ({
      id: wb.id,
      name: wb.name,
      description: wb.description,
      projectName: wb.project?.name,
      owner: wb.owner?.name,
      createdAt: new Date(wb.createdAt),
      updatedAt: new Date(wb.updatedAt),
      viewCount: parseInt(wb.usage?.totalViewCount || '0', 10),
    }));
  }

  /**
   * Extract data sources from Tableau
   */
  async extractDatasources(): Promise<TableauDatasource[]> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const response = await this.client.get(`/sites/${this.siteId}/datasources`);

    return response.data.datasources.datasource.map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      connectionType: ds.connectionType,
      serverAddress: ds.serverAddress,
      databaseName: ds.databaseName,
      tables: [], // Would require additional API call to get connections
      certificationNote: ds.certificationNote,
      isCertified: ds.isCertified || false,
    }));
  }

  /**
   * Get data source connections
   */
  async getDatasourceConnections(datasourceId: string): Promise<any[]> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const response = await this.client.get(
      `/sites/${this.siteId}/datasources/${datasourceId}/connections`
    );

    return response.data.connections.connection;
  }

  /**
   * Update workbook description
   */
  async updateWorkbookDescription(workbookId: string, description: string): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }

    await this.client.put(`/sites/${this.siteId}/workbooks/${workbookId}`, {
      workbook: {
        description,
      },
    });
  }

  /**
   * Certify data source
   */
  async certifyDatasource(datasourceId: string, certificationNote: string): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }

    await this.client.put(`/sites/${this.siteId}/datasources/${datasourceId}`, {
      datasource: {
        isCertified: true,
        certificationNote,
      },
    });
  }

  /**
   * Get workbook usage statistics
   */
  async getWorkbookUsage(workbookId: string, startDate: Date, endDate: Date): Promise<any> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const response = await this.client.get(
      `/sites/${this.siteId}/workbooks/${workbookId}/views`,
      {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      }
    );

    return response.data;
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (this.authToken) {
      await this.client.post('/auth/signout');
      this.authToken = undefined;
      this.siteId = undefined;
    }
  }
}

/**
 * Tableau Sync Service
 * Synchronizes Tableau metadata with data catalog
 */
export class TableauSyncService {
  constructor(
    private connector: TableauConnector,
    private catalogService: any // ICatalogService
  ) {}

  /**
   * Sync workbooks to catalog
   */
  async syncWorkbooks(): Promise<void> {
    const workbooks = await this.connector.extractWorkbooks();

    for (const workbook of workbooks) {
      const asset = {
        type: 'DASHBOARD',
        name: workbook.name,
        displayName: workbook.name,
        description: workbook.description || '',
        fullyQualifiedName: `tableau.${workbook.projectName}.${workbook.name}`,
        status: 'ACTIVE',
        classification: 'INTERNAL',
        owner: workbook.owner,
        stewards: [],
        experts: [],
        tags: ['tableau', 'dashboard', workbook.projectName.toLowerCase()],
        collections: [],
        domain: workbook.projectName,
        trustIndicators: {
          certificationLevel: 'NONE',
          endorsementCount: 0,
          userRating: 0,
          usageCount: workbook.viewCount,
          lastVerified: null,
          verifiedBy: null,
          qualityScore: {
            overall: 0.8,
            completeness: 0.8,
            accuracy: 0.8,
            consistency: 0.8,
            timeliness: 0.8,
            validity: 0.8,
            uniqueness: 0.8,
          },
        },
        schema: null,
        properties: {
          tableauId: workbook.id,
          projectName: workbook.projectName,
          source: 'tableau',
        },
        statistics: {
          viewCount: workbook.viewCount,
        },
        upstreamAssets: [],
        downstreamAssets: [],
        documentation: null,
        sampleData: [],
        accessControlList: [],
      };

      // Create or update asset in catalog
      await this.catalogService.createAsset(asset);
    }
  }

  /**
   * Sync data sources to catalog
   */
  async syncDatasources(): Promise<void> {
    const datasources = await this.connector.extractDatasources();

    for (const datasource of datasources) {
      const asset = {
        type: 'DASHBOARD',
        name: datasource.name,
        displayName: datasource.name,
        description: datasource.certificationNote || '',
        fullyQualifiedName: `tableau.datasource.${datasource.name}`,
        status: 'ACTIVE',
        classification: 'INTERNAL',
        owner: 'tableau-admin',
        stewards: [],
        experts: [],
        tags: ['tableau', 'datasource', datasource.type.toLowerCase()],
        collections: [],
        domain: 'tableau',
        trustIndicators: {
          certificationLevel: datasource.isCertified ? 'GOLD' : 'NONE',
          endorsementCount: datasource.isCertified ? 1 : 0,
          userRating: datasource.isCertified ? 4.5 : 0,
          usageCount: 0,
          lastVerified: datasource.isCertified ? new Date() : null,
          verifiedBy: datasource.isCertified ? 'tableau' : null,
          qualityScore: {
            overall: datasource.isCertified ? 0.9 : 0.7,
            completeness: datasource.isCertified ? 0.9 : 0.7,
            accuracy: datasource.isCertified ? 0.9 : 0.7,
            consistency: datasource.isCertified ? 0.9 : 0.7,
            timeliness: datasource.isCertified ? 0.9 : 0.7,
            validity: datasource.isCertified ? 0.9 : 0.7,
            uniqueness: datasource.isCertified ? 0.9 : 0.7,
          },
        },
        schema: null,
        properties: {
          tableauId: datasource.id,
          connectionType: datasource.connectionType,
          serverAddress: datasource.serverAddress,
          databaseName: datasource.databaseName,
          source: 'tableau',
        },
        statistics: {},
        upstreamAssets: [],
        downstreamAssets: [],
        documentation: datasource.certificationNote || null,
        sampleData: [],
        accessControlList: [],
      };

      await this.catalogService.createAsset(asset);
    }
  }

  /**
   * Sync catalog metadata back to Tableau
   */
  async syncToTableau(assetId: string): Promise<void> {
    const asset = await this.catalogService.getAsset(assetId);

    if (asset.properties.source !== 'tableau') {
      return;
    }

    const tableauId = asset.properties.tableauId;

    if (asset.type === 'DASHBOARD') {
      // Update workbook description
      if (asset.documentation) {
        await this.connector.updateWorkbookDescription(tableauId, asset.documentation);
      }
    } else if (asset.properties.connectionType) {
      // Update datasource certification
      if (asset.trustIndicators.certificationLevel === 'GOLD' ||
          asset.trustIndicators.certificationLevel === 'PLATINUM') {
        await this.connector.certifyDatasource(tableauId, asset.documentation || 'Certified in data catalog');
      }
    }
  }
}
