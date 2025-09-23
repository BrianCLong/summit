import crypto from 'crypto'

export type ModelArtifact = {
  id: string
  kind: string
  version: string
  checksum: string
  signed: boolean
  biasReport?: string
}

export class ModelRegistry {
  private store: ModelArtifact[] = []

  register(art: Omit<ModelArtifact, 'id'>): ModelArtifact {
    const id = `${art.kind}:${art.version}`
    const expected = crypto.createHash('sha256').update(art.kind + art.version).digest('hex')
    if (expected !== art.checksum) throw new Error('checksum_mismatch')
    if (!art.signed) throw new Error('unsigned')
    const item: ModelArtifact = { ...art, id }
    this.store.push(item)
    return item
  }

  list(kind: string): ModelArtifact[] {
    return this.store.filter((a) => a.kind === kind)
  }
}
