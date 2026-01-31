import { RCRSession } from './session';
export interface Planner {
    execute(query: string, session: RCRSession): Promise<string>;
}
export declare class SimplePlanner implements Planner {
    execute(query: string, session: RCRSession): Promise<string>;
}
