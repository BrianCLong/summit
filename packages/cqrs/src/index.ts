/**
 * @intelgraph/cqrs
 *
 * CQRS (Command Query Responsibility Segregation) implementation
 */

export { CommandBus } from './command/CommandBus.js';
export type {
  Command,
  CommandMetadata,
  CommandResult,
  CommandHandler,
  CommandValidator,
  CommandMiddleware,
  CommandHandlerRegistration,
  CommandValidationResult
} from './command/types.js';

export { QueryBus } from './query/QueryBus.js';
export type {
  Query,
  QueryMetadata,
  QueryResult,
  QueryHandler,
  QueryHandlerRegistration,
  ReadModel
} from './query/types.js';

export { ProjectionManager } from './projection/ProjectionManager.js';
export type {
  Projection,
  ProjectionEventHandler,
  ProjectionState,
  ProjectionStatus,
  ProjectionOptions,
  ProjectionStats
} from './projection/types.js';
