import { Operation, OperationalTransform } from './operationalTransform';
import logger from '../../utils/logger';

interface DocumentState {
  version: number;
  content: string; // Or graph structure
  history: Operation[];
}

export class CollaborationManager {
  private documents: Map<string, DocumentState> = new Map();

  constructor() {
    // Initialize
  }

  createDocument(docId: string, initialContent: string = '') {
    this.documents.set(docId, {
      version: 0,
      content: initialContent,
      history: []
    });
  }

  applyOperation(docId: string, op: Operation, clientVersion: number): { appliedOp: Operation, version: number } {
    const doc = this.documents.get(docId);
    if (!doc) {
      throw new Error(`Document ${docId} not found`);
    }

    if (clientVersion < 0 || clientVersion > doc.version) {
       throw new Error('Invalid version');
    }

    // Transform operation against all operations that happened since clientVersion
    let transformedOp = op;
    const concurrentOps = doc.history.slice(clientVersion);

    for (const pastOp of concurrentOps) {
      [transformedOp, ] = OperationalTransform.transform(transformedOp, pastOp);
    }

    // Apply to state (simplified for text)
    if (op.type === 'insert' && op.text && op.position !== undefined) {
      doc.content = doc.content.slice(0, transformedOp.position) + transformedOp.text + doc.content.slice(transformedOp.position);
    } else if (op.type === 'delete' && op.count && op.position !== undefined) {
      doc.content = doc.content.slice(0, transformedOp.position) + doc.content.slice(transformedOp.position + transformedOp.count);
    }

    doc.history.push(transformedOp);
    doc.version++;

    logger.debug(`Applied op to ${docId} v${doc.version}: ${JSON.stringify(transformedOp)}`);
    return { appliedOp: transformedOp, version: doc.version };
  }

  getDocument(docId: string) {
    return this.documents.get(docId);
  }
}

export const collaborationManager = new CollaborationManager();
