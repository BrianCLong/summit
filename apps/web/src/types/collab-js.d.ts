/**
 * Type declarations for @intelgraph/collab-js
 * Temporary stub until workspace dependency is properly configured
 */

declare module '@intelgraph/collab-js' {
  export class CollabClient {
    constructor(config?: any)
    connect(): Promise<void>
    disconnect(): void
    on(event: string, handler: (...args: any[]) => void): void
    off(event: string, handler?: (...args: any[]) => void): void
    emit(event: string, ...args: any[]): void
  }
}
