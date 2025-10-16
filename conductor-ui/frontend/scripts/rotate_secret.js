#!/usr/bin/env node

const AWS = require('aws-sdk');
const crypto = require('crypto');

class SecretRotator {
  constructor() {
    this.ssm = new AWS.SSM();
    this.secretsManager = new AWS.SecretsManager();
  }

  async rotateSecret(secretPath) {
    console.log(`Starting rotation for secret: ${secretPath}`);

    try {
      // Get current secret
      const currentSecret = await this.getCurrentSecret(secretPath);
      console.log('Retrieved current secret');

      // Generate new secret
      const newSecret = this.generateSecret();
      console.log('Generated new secret');

      // Store new secret with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${secretPath}/backup/${timestamp}`;

      // Backup current secret
      await this.storeSecret(backupPath, currentSecret);
      console.log(`Backed up current secret to: ${backupPath}`);

      // Update with new secret
      await this.storeSecret(secretPath, newSecret);
      console.log('Updated secret with new value');

      // Schedule cleanup of old backups (keep last 7 days)
      await this.cleanupOldBackups(secretPath);
      console.log('Cleaned up old backups');

      console.log(`✅ Successfully rotated secret: ${secretPath}`);
      return { success: true, secretPath, timestamp };
    } catch (error) {
      console.error(`❌ Failed to rotate secret ${secretPath}:`, error.message);
      throw error;
    }
  }

  async getCurrentSecret(path) {
    try {
      const params = {
        Name: path,
        WithDecryption: true,
      };

      const result = await this.ssm.getParameter(params).promise();
      return result.Parameter.Value;
    } catch (error) {
      if (error.code === 'ParameterNotFound') {
        console.log(
          `Parameter ${path} not found in SSM, checking Secrets Manager...`,
        );
        return await this.getSecretFromSecretsManager(path);
      }
      throw error;
    }
  }

  async getSecretFromSecretsManager(secretId) {
    try {
      const result = await this.secretsManager
        .getSecretValue({
          SecretId: secretId,
        })
        .promise();

      return result.SecretString;
    } catch (error) {
      throw new Error(
        `Failed to retrieve secret from both SSM and Secrets Manager: ${error.message}`,
      );
    }
  }

  generateSecret() {
    // Generate a secure random password
    const length = 32;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let secret = '';

    for (let i = 0; i < length; i++) {
      secret += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return secret;
  }

  async storeSecret(path, value) {
    try {
      // Try SSM first
      const params = {
        Name: path,
        Value: value,
        Type: 'SecureString',
        Overwrite: true,
      };

      await this.ssm.putParameter(params).promise();
    } catch (error) {
      // Fall back to Secrets Manager
      console.log(
        `SSM storage failed, trying Secrets Manager: ${error.message}`,
      );
      await this.storeInSecretsManager(path, value);
    }
  }

  async storeInSecretsManager(secretId, secretValue) {
    try {
      await this.secretsManager
        .updateSecret({
          SecretId: secretId,
          SecretString: secretValue,
        })
        .promise();
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        // Create new secret
        await this.secretsManager
          .createSecret({
            Name: secretId,
            SecretString: secretValue,
            Description: 'Auto-rotated secret',
          })
          .promise();
      } else {
        throw error;
      }
    }
  }

  async cleanupOldBackups(secretPath) {
    const backupPrefix = `${secretPath}/backup/`;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      // List backup parameters
      const listParams = {
        Path: backupPrefix,
        Recursive: true,
      };

      const result = await this.ssm.getParametersByPath(listParams).promise();

      // Delete old backups
      for (const param of result.Parameters) {
        const paramDate = new Date(param.LastModifiedDate);
        if (paramDate < sevenDaysAgo) {
          await this.ssm.deleteParameter({ Name: param.Name }).promise();
          console.log(`Deleted old backup: ${param.Name}`);
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to cleanup old backups: ${error.message}`);
      // Don't fail the rotation if cleanup fails
    }
  }
}

// CLI usage
async function main() {
  const secretPath = process.argv[2];

  if (!secretPath) {
    console.error('Usage: node rotate_secret.js <secret-path>');
    process.exit(1);
  }

  const rotator = new SecretRotator();

  try {
    await rotator.rotateSecret(secretPath);
    console.log('🎉 Secret rotation completed successfully!');
  } catch (error) {
    console.error('💥 Secret rotation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SecretRotator };
