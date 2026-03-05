import { GenerativeInterface, UIBlock } from '../schema/interface.schema';

export class InterfaceBuilder {
  build(id: string, blocks: UIBlock[]): GenerativeInterface {
    return {
      id,
      blocks,
    };
  }
}
