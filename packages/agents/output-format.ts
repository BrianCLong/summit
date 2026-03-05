import { GenerativeInterface } from '../genui/src/schema/interface.schema';

export interface AgentOutput {
  text: string;
  interface?: GenerativeInterface;
}
