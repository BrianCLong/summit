import { GenerativeInterface } from '../genui/schema/interface.schema';

export interface AgentOutput {
  text: string;
  interface?: GenerativeInterface;
}
