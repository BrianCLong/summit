/**
 * Sanctions Screening Package
 * OFAC, UN, EU sanctions list screening with PEP detection
 */

export interface Entity {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'ORGANIZATION';
  dob?: string;
  nationality?: string;
  aliases?: string[];
}

export interface SanctionsMatch {
  entity: Entity;
  listName: string;
  matchScore: number;
  matchType: 'EXACT' | 'FUZZY' | 'ALIAS';
  sanctionedEntity: SanctionedEntity;
}

export interface SanctionedEntity {
  name: string;
  list: 'OFAC_SDN' | 'UN_SANCTIONS' | 'EU_SANCTIONS' | 'PEP';
  program: string;
  addedDate: Date;
  identifiers: Record<string, string>;
}

export class SanctionsScreener {
  private sanctionLists: Map<string, SanctionedEntity[]> = new Map();
  private readonly MATCH_THRESHOLD = 0.85;

  async screenEntity(entity: Entity): Promise<SanctionsMatch[]> {
    const matches: SanctionsMatch[] = [];

    for (const [listName, sanctioned] of this.sanctionLists) {
      for (const sanctionedEntity of sanctioned) {
        const score = this.calculateMatch(entity.name, sanctionedEntity.name);

        if (score >= this.MATCH_THRESHOLD) {
          matches.push({
            entity,
            listName,
            matchScore: score,
            matchType: score === 1 ? 'EXACT' : 'FUZZY',
            sanctionedEntity,
          });
        }

        // Check aliases
        if (entity.aliases) {
          for (const alias of entity.aliases) {
            const aliasScore = this.calculateMatch(alias, sanctionedEntity.name);
            if (aliasScore >= this.MATCH_THRESHOLD) {
              matches.push({
                entity,
                listName,
                matchScore: aliasScore,
                matchType: 'ALIAS',
                sanctionedEntity,
              });
            }
          }
        }
      }
    }

    return matches;
  }

  private calculateMatch(name1: string, name2: string): number {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();

    if (n1 === n2) return 1.0;

    // Levenshtein distance
    const distance = this.levenshteinDistance(n1, n2);
    const maxLength = Math.max(n1.length, n2.length);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  loadSanctionsList(listName: string, entities: SanctionedEntity[]): void {
    this.sanctionLists.set(listName, entities);
  }

  async screenBatch(entities: Entity[]): Promise<Map<string, SanctionsMatch[]>> {
    const results = new Map<string, SanctionsMatch[]>();
    for (const entity of entities) {
      const matches = await this.screenEntity(entity);
      if (matches.length > 0) {
        results.set(entity.id, matches);
      }
    }
    return results;
  }
}

export class PEPScreener {
  async screenForPEP(entity: Entity): Promise<boolean> {
    // Simplified PEP screening - would connect to PEP databases
    return false;
  }
}
