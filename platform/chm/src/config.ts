export interface ChmConfig {
  port: number;
  databaseUrl: string;
  residencyAllowList: string[];
  licenseAllowList: string[];
}

export const loadConfig = (): ChmConfig => {
  return {
    port: Number(process.env.CHM_PORT || 4070),
    databaseUrl: process.env.CHM_DATABASE_URL || 'postgres://localhost:5432/chm',
    residencyAllowList: (process.env.CHM_RESIDENCY_ALLOW || 'US,CA,EU').split(','),
    licenseAllowList: (process.env.CHM_LICENSE_ALLOW || 'ITAR,ECCN99,EAR99').split(',')
  };
};
