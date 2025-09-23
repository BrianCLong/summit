type Artifact = {
  id: string
  kind: string
  version: string
  checksum: string
  signed: boolean
  createdAt: string
  biasReport?: string
}

const artifacts: Artifact[] = []

export const resolvers = {
  Query: {
    modelArtifacts: (_: any, { kind }: { kind: string }) => artifacts.filter((a) => a.kind === kind)
  },
  Mutation: {
    registerModel: (_: any, args: any) => {
      const art: Artifact = {
        ...args,
        id: `${args.kind}:${args.version}`,
        createdAt: new Date().toISOString()
      }
      artifacts.push(art)
      return art
    },
    promoteModel: (_: any, { id }: { id: string }) => artifacts.some((a) => a.id === id),
    rollbackModel: (_: any, { kind, toVersion }: { kind: string; toVersion: string }) =>
      artifacts.some((a) => a.kind === kind && a.version === toVersion)
  }
}
