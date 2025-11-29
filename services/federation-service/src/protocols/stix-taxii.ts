/**
 * STIX/TAXII Protocol Mapping
 *
 * Provides interoperability with STIX 2.1 and TAXII 2.1 standards.
 * Maps IntelGraph objects to STIX Domain Objects (SDOs).
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  SharedObject,
  ShareableObjectType,
  SharePackage,
  ClassificationLevel,
} from '../models/types.js';

const logger = pino({ name: 'stix-taxii' });

/**
 * STIX 2.1 Object
 */
export interface StixObject {
  type: string;
  spec_version: '2.1';
  id: string;
  created: string;
  modified?: string;
  created_by_ref?: string;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: StixExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: StixGranularMarking[];
  [key: string]: unknown;
}

/**
 * STIX External Reference
 */
export interface StixExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  external_id?: string;
}

/**
 * STIX Granular Marking
 */
export interface StixGranularMarking {
  marking_ref: string;
  selectors: string[];
  lang?: string;
}

/**
 * STIX Indicator
 */
export interface StixIndicator extends StixObject {
  type: 'indicator';
  pattern: string;
  pattern_type: string;
  valid_from: string;
  valid_until?: string;
  indicator_types?: string[];
}

/**
 * STIX Bundle
 */
export interface StixBundle {
  type: 'bundle';
  id: string;
  objects: StixObject[];
}

/**
 * TAXII Collection
 */
export interface TaxiiCollection {
  id: string;
  title: string;
  description?: string;
  can_read: boolean;
  can_write: boolean;
  media_types: string[];
}

/**
 * TAXII Envelope
 */
export interface TaxiiEnvelope {
  more: boolean;
  objects: StixObject[];
}

/**
 * STIX/TAXII Mapper
 */
export class StixTaxiiMapper {
  /**
   * Convert SharedObject to STIX object
   */
  toStix(obj: SharedObject): StixObject {
    logger.debug(
      {
        objectId: obj.id,
        objectType: obj.type,
      },
      'Converting to STIX'
    );

    const stixId = `${this.getStixType(obj.type)}--${uuidv4()}`;

    const base: StixObject = {
      type: this.getStixType(obj.type),
      spec_version: '2.1',
      id: stixId,
      created: obj.createdAt.toISOString(),
      modified: obj.modifiedAt?.toISOString() || obj.createdAt.toISOString(),
      labels: this.getLabels(obj),
      external_references: [
        {
          source_name: 'IntelGraph',
          external_id: obj.originalId,
          description: `Original ID: ${obj.originalId}`,
        },
      ],
      object_marking_refs: this.getMarkingRefs(obj),
    };

    // Add type-specific fields
    switch (obj.type) {
      case ShareableObjectType.IOC:
        return this.toStixIndicator(obj, base);
      case ShareableObjectType.ENTITY:
        return this.toStixIdentity(obj, base);
      case ShareableObjectType.RELATIONSHIP:
        return this.toStixRelationship(obj, base);
      default:
        // Generic mapping
        return {
          ...base,
          ...obj.data,
        };
    }
  }

  /**
   * Convert to STIX Indicator
   */
  private toStixIndicator(obj: SharedObject, base: StixObject): StixIndicator {
    const data = obj.data as any;

    return {
      ...base,
      type: 'indicator',
      pattern: data.pattern || `[file:hashes.MD5 = '${data.hash || 'unknown'}']`,
      pattern_type: data.patternType || 'stix',
      valid_from: data.validFrom || obj.createdAt.toISOString(),
      valid_until: data.validUntil,
      indicator_types: data.indicatorTypes || ['malicious-activity'],
      name: data.name,
      description: data.description,
    } as StixIndicator;
  }

  /**
   * Convert to STIX Identity
   */
  private toStixIdentity(obj: SharedObject, base: StixObject): StixObject {
    const data = obj.data as any;

    return {
      ...base,
      type: 'identity',
      name: data.name || 'Unknown',
      identity_class: data.identityClass || 'individual',
      sectors: data.sectors,
      contact_information: data.contactInfo,
    };
  }

  /**
   * Convert to STIX Relationship
   */
  private toStixRelationship(obj: SharedObject, base: StixObject): StixObject {
    const data = obj.data as any;

    return {
      ...base,
      type: 'relationship',
      relationship_type: data.relationshipType || 'related-to',
      source_ref: data.sourceRef || 'unknown',
      target_ref: data.targetRef || 'unknown',
      description: data.description,
    };
  }

  /**
   * Map IntelGraph object type to STIX type
   */
  private getStixType(type: ShareableObjectType): string {
    const mapping: Record<string, string> = {
      [ShareableObjectType.IOC]: 'indicator',
      [ShareableObjectType.ENTITY]: 'identity',
      [ShareableObjectType.RELATIONSHIP]: 'relationship',
      [ShareableObjectType.ALERT]: 'incident',
      [ShareableObjectType.CASE]: 'incident',
      [ShareableObjectType.DOCUMENT]: 'note',
      [ShareableObjectType.ANALYSIS]: 'report',
    };

    return mapping[type] || 'x-custom-object';
  }

  /**
   * Get STIX labels from object
   */
  private getLabels(obj: SharedObject): string[] {
    const labels: string[] = [];

    labels.push(`classification:${obj.classification.toLowerCase()}`);
    labels.push(`jurisdiction:${obj.jurisdiction.toLowerCase()}`);
    labels.push(`license:${obj.license.toLowerCase()}`);

    if (obj.redactedFields && obj.redactedFields.length > 0) {
      labels.push('redacted');
    }

    return labels;
  }

  /**
   * Get STIX marking refs from object
   */
  private getMarkingRefs(obj: SharedObject): string[] {
    const refs: string[] = [];

    // Map classification to TLP
    switch (obj.classification) {
      case ClassificationLevel.UNCLASSIFIED:
        refs.push('marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9'); // TLP:WHITE
        break;
      case ClassificationLevel.CUI:
        refs.push('marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da'); // TLP:GREEN
        break;
      case ClassificationLevel.CONFIDENTIAL:
      case ClassificationLevel.SECRET:
        refs.push('marking-definition--f88d31f6-486f-44da-b317-01333bde0b82'); // TLP:AMBER
        break;
      case ClassificationLevel.TOP_SECRET:
        refs.push('marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed'); // TLP:RED
        break;
    }

    return refs;
  }

  /**
   * Convert SharePackage to STIX Bundle
   */
  toStixBundle(pkg: SharePackage): StixBundle {
    logger.info(
      {
        packageId: pkg.id,
        objectCount: pkg.objects.length,
      },
      'Converting package to STIX bundle'
    );

    const stixObjects = pkg.objects.map((obj) => this.toStix(obj));

    const bundle: StixBundle = {
      type: 'bundle',
      id: `bundle--${uuidv4()}`,
      objects: stixObjects,
    };

    return bundle;
  }

  /**
   * Convert STIX object to SharedObject
   */
  fromStix(stixObj: StixObject): SharedObject {
    logger.debug(
      {
        stixId: stixObj.id,
        stixType: stixObj.type,
      },
      'Converting from STIX'
    );

    // Extract original ID from external references
    const originalId =
      stixObj.external_references?.find((ref) => ref.source_name === 'IntelGraph')
        ?.external_id || stixObj.id;

    // Parse labels
    const labels = stixObj.labels || [];
    const classification = this.parseClassificationFromLabels(labels);
    const jurisdiction = this.parseJurisdictionFromLabels(labels);
    const license = this.parseLicenseFromLabels(labels);

    // Map STIX type to IntelGraph type
    const objectType = this.fromStixType(stixObj.type);

    const sharedObj: SharedObject = {
      id: uuidv4(),
      type: objectType,
      data: this.extractData(stixObj),
      classification,
      jurisdiction,
      license,
      originalId,
      sourceOrganization: 'external',
      createdAt: new Date(stixObj.created),
      modifiedAt: stixObj.modified ? new Date(stixObj.modified) : undefined,
      redactedFields: labels.includes('redacted') ? ['unknown'] : undefined,
      transformationApplied: labels.includes('redacted'),
    };

    return sharedObj;
  }

  /**
   * Map STIX type to IntelGraph type
   */
  private fromStixType(stixType: string): ShareableObjectType {
    const mapping: Record<string, ShareableObjectType> = {
      indicator: ShareableObjectType.IOC,
      identity: ShareableObjectType.ENTITY,
      relationship: ShareableObjectType.RELATIONSHIP,
      incident: ShareableObjectType.ALERT,
      note: ShareableObjectType.DOCUMENT,
      report: ShareableObjectType.ANALYSIS,
    };

    return mapping[stixType] || ShareableObjectType.ENTITY;
  }

  /**
   * Extract data from STIX object
   */
  private extractData(stixObj: StixObject): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Copy all non-standard fields
    const standardFields = [
      'type',
      'spec_version',
      'id',
      'created',
      'modified',
      'created_by_ref',
      'labels',
      'confidence',
      'lang',
      'external_references',
      'object_marking_refs',
      'granular_markings',
    ];

    for (const [key, value] of Object.entries(stixObj)) {
      if (!standardFields.includes(key)) {
        data[key] = value;
      }
    }

    return data;
  }

  /**
   * Parse classification from labels
   */
  private parseClassificationFromLabels(labels: string[]): ClassificationLevel {
    const classLabel = labels.find((l) => l.startsWith('classification:'));
    if (classLabel) {
      const level = classLabel.split(':')[1].toUpperCase();
      return (level as ClassificationLevel) || ClassificationLevel.UNCLASSIFIED;
    }
    return ClassificationLevel.UNCLASSIFIED;
  }

  /**
   * Parse jurisdiction from labels
   */
  private parseJurisdictionFromLabels(labels: string[]): any {
    const jurisdictionLabel = labels.find((l) => l.startsWith('jurisdiction:'));
    if (jurisdictionLabel) {
      return jurisdictionLabel.split(':')[1].toUpperCase();
    }
    return 'GLOBAL';
  }

  /**
   * Parse license from labels
   */
  private parseLicenseFromLabels(labels: string[]): any {
    const licenseLabel = labels.find((l) => l.startsWith('license:'));
    if (licenseLabel) {
      return licenseLabel.split(':')[1].toUpperCase();
    }
    return 'TLP:WHITE';
  }

  /**
   * Create TAXII envelope
   */
  createTaxiiEnvelope(objects: StixObject[], more: boolean = false): TaxiiEnvelope {
    return {
      more,
      objects,
    };
  }
}

export const stixTaxiiMapper = new StixTaxiiMapper();
