/**
 * Cryptographic Inventory
 * Tracks all cryptographic usage across the system
 */

import { CryptoInventory, CryptoInventoryItem, CryptoOperation } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CryptoInventoryImpl implements CryptoInventory {
  private items: Map<string, CryptoInventoryItem> = new Map();

  async scan(paths: string[]): Promise<CryptoInventoryItem[]> {
    const discovered: CryptoInventoryItem[] = [];

    for (const scanPath of paths) {
      const items = await this.scanPath(scanPath);
      discovered.push(...items);
    }

    // Add discovered items to inventory
    for (const item of discovered) {
      this.items.set(item.location, item);
    }

    return discovered;
  }

  add(item: CryptoInventoryItem): void {
    this.items.set(item.location, { ...item });
  }

  update(location: string, updates: Partial<CryptoInventoryItem>): void {
    const item = this.items.get(location);
    if (!item) {
      throw new Error(`Inventory item at ${location} not found`);
    }

    Object.assign(item, updates);
    item.lastUpdated = new Date();
  }

  getAll(): CryptoInventoryItem[] {
    return Array.from(this.items.values());
  }

  getByStatus(status: CryptoInventoryItem['migrationStatus']): CryptoInventoryItem[] {
    return this.getAll().filter(item => item.migrationStatus === status);
  }

  getHighPriority(): CryptoInventoryItem[] {
    return this.getAll().filter(item =>
      item.criticality === 'high' ||
      item.criticality === 'critical' ||
      item.dataClassification === 'secret' ||
      item.dataClassification === 'top-secret'
    );
  }

  private async scanPath(scanPath: string): Promise<CryptoInventoryItem[]> {
    const items: CryptoInventoryItem[] = [];

    try {
      const stats = await fs.stat(scanPath);

      if (stats.isFile()) {
        const fileItems = await this.scanFile(scanPath);
        items.push(...fileItems);
      } else if (stats.isDirectory()) {
        const entries = await fs.readdir(scanPath);
        for (const entry of entries) {
          const fullPath = path.join(scanPath, entry);
          const subItems = await this.scanPath(fullPath);
          items.push(...subItems);
        }
      }
    } catch (error) {
      console.error(`Error scanning ${scanPath}:`, error);
    }

    return items;
  }

  private async scanFile(filePath: string): Promise<CryptoInventoryItem[]> {
    const items: CryptoInventoryItem[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Scan for cryptographic patterns
      items.push(...this.detectRSA(filePath, content));
      items.push(...this.detectECDSA(filePath, content));
      items.push(...this.detectAES(filePath, content));
      items.push(...this.detectPQC(filePath, content));
    } catch (error) {
      // Skip files that can't be read as text
    }

    return items;
  }

  private detectRSA(filePath: string, content: string): CryptoInventoryItem[] {
    const patterns = [
      /RSA/i,
      /PKCS1/i,
      /generateKeyPair.*rsa/i,
      /createSign.*RSA/i,
    ];

    if (patterns.some(pattern => pattern.test(content))) {
      return [{
        location: filePath,
        operation: CryptoOperation.DIGITAL_SIGNATURE,
        algorithm: 'RSA',
        version: '1.0',
        lastUpdated: new Date(),
        criticality: 'high',
        dataClassification: 'confidential',
        migrationStatus: 'pending',
      }];
    }

    return [];
  }

  private detectECDSA(filePath: string, content: string): CryptoInventoryItem[] {
    const patterns = [
      /ECDSA/i,
      /secp256/i,
      /P-256/i,
      /elliptic.*curve/i,
    ];

    if (patterns.some(pattern => pattern.test(content))) {
      return [{
        location: filePath,
        operation: CryptoOperation.DIGITAL_SIGNATURE,
        algorithm: 'ECDSA',
        version: '1.0',
        lastUpdated: new Date(),
        criticality: 'high',
        dataClassification: 'confidential',
        migrationStatus: 'pending',
      }];
    }

    return [];
  }

  private detectAES(filePath: string, content: string): CryptoInventoryItem[] {
    const patterns = [
      /AES/i,
      /aes-256-gcm/i,
      /createCipheriv.*aes/i,
    ];

    if (patterns.some(pattern => pattern.test(content))) {
      return [{
        location: filePath,
        operation: CryptoOperation.ENCRYPTION,
        algorithm: 'AES-256-GCM',
        version: '1.0',
        lastUpdated: new Date(),
        criticality: 'medium',
        dataClassification: 'confidential',
        migrationStatus: 'not-applicable', // AES is quantum-resistant for symmetric encryption
      }];
    }

    return [];
  }

  private detectPQC(filePath: string, content: string): CryptoInventoryItem[] {
    const items: CryptoInventoryItem[] = [];

    // Kyber
    if (/kyber/i.test(content)) {
      items.push({
        location: filePath,
        operation: CryptoOperation.KEY_ENCAPSULATION,
        algorithm: 'Kyber',
        version: '3.0',
        lastUpdated: new Date(),
        criticality: 'low',
        dataClassification: 'internal',
        migrationStatus: 'completed',
      });
    }

    // Dilithium
    if (/dilithium/i.test(content)) {
      items.push({
        location: filePath,
        operation: CryptoOperation.DIGITAL_SIGNATURE,
        algorithm: 'Dilithium',
        version: '3.1',
        lastUpdated: new Date(),
        criticality: 'low',
        dataClassification: 'internal',
        migrationStatus: 'completed',
      });
    }

    return items;
  }

  exportReport(): string {
    const items = this.getAll();
    const summary = {
      total: items.length,
      byStatus: this.groupBy(items, 'migrationStatus'),
      byCriticality: this.groupBy(items, 'criticality'),
      byAlgorithm: this.groupBy(items, 'algorithm'),
      quantumVulnerable: items.filter(item =>
        item.algorithm === 'RSA' ||
        item.algorithm === 'ECDSA' ||
        item.algorithm === 'DH'
      ).length,
    };

    return JSON.stringify(summary, null, 2);
  }

  private groupBy<K extends keyof CryptoInventoryItem>(
    items: CryptoInventoryItem[],
    key: K
  ): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export function createCryptoInventory(): CryptoInventory {
  return new CryptoInventoryImpl();
}
