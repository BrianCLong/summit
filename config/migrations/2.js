module.exports = {
  up: (config) => {
    const migrated = { ...config };
    migrated.features = migrated.features || {};
    migrated.features.enableNewDashboard = migrated.features.enableNewDashboard ?? false;
    migrated.features.enableExperimentalFeatures =
      migrated.features.enableExperimentalFeatures ?? false;

    const existingSecurity = migrated.security || {};
    migrated.security = {
      ...existingSecurity,
      secrets: {
        providerPreference: existingSecurity.secrets?.providerPreference || [
          "vault",
          "awsSecretsManager",
          "environment",
          "file",
        ],
        cacheTtlSeconds: existingSecurity.secrets?.cacheTtlSeconds ?? 300,
        rotation: existingSecurity.secrets?.rotation ?? { enabled: true, intervalSeconds: 600 },
        encryptionKeyEnv: existingSecurity.secrets?.encryptionKeyEnv || "CONFIG_ENCRYPTION_KEY",
        auditLogPath: existingSecurity.secrets?.auditLogPath || "./logs/config-audit.log",
        fileBasePath: existingSecurity.secrets?.fileBasePath || "./",
        vault: existingSecurity.secrets?.vault || {
          address: "http://localhost:8200",
          tokenEnv: "VAULT_TOKEN",
          kvMountPath: "secret",
        },
        aws: existingSecurity.secrets?.aws || { region: "us-east-1" },
      },
    };

    migrated.version = 2;
    return migrated;
  },
  down: (config) => {
    const rolledBack = { ...config };
    delete rolledBack.security;
    rolledBack.version = 1;
    return rolledBack;
  },
};
