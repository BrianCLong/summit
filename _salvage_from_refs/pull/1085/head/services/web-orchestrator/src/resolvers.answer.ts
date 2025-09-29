// services/web-orchestrator/src/resolvers.answer.ts
import { v4 as uuid } from 'uuid'
import { domainCandidates } from './db'
import { CtxBandit } from '../../src/bandit_contextual'
import { publishFetch } from './publisher'
import { gatherResults } from './resultsConsumer'  // subscribe to web.fetch.completed
import { synthesize } from './synthService'        // calls Python synth via gRPC/HTTP

interface OrchestratedAnswerArgs {
  question: string;
  contextId: string;
}

export const resolversAnswer = {
  Mutation: {
    orchestratedAnswer: async (_: unknown, { question, contextId }: OrchestratedAnswerArgs, _ctx: unknown) => {
      const id = 'ans_' + uuid()
      const domains = await domainCandidates('qna')
      const bandit = new CtxBandit(domains)
      // naive plan: choose 3 domains
      const picks = Array.from(new Set([bandit.choose(), bandit.choose(), bandit.choose()]))
      // enqueue jobs for relevant paths derived by a simple router (placeholder)
      for (const d of picks){
        await publishFetch({ id: 'wf_'+uuid(), target:d, path:'/', purpose:'qna', authorityId:'auth_public', licenseId:'lic_docs', extractor:'article_v2' })
      }
      const results = await gatherResults({ contextId, max: picks.length, timeoutMs: 4000 })
      const out = await synthesize({ question, results, contextId })
      return { id, ...out }
    }
  }
}
