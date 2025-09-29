export interface SamlConfig {
  metadataUrl: string;
  roles: Record<string, string[]>;
}

export class SAMLProvider {
  constructor(private config: SamlConfig) {}

  validateMetadata(xml: string) {
    if (!xml.includes('<EntityDescriptor')) {
      throw new Error('invalid metadata');
    }
  }

  mapRoles(attrs: Record<string, string>) {
    const mapped: string[] = [];
    for (const [attr, roles] of Object.entries(this.config.roles)) {
      if (attrs[attr]) mapped.push(...roles);
    }
    return mapped;
  }
}
