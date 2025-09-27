import { BasePolicyAdapter } from './base.js';


export class AllowAdapter extends BasePolicyAdapter {constructor(...args) { super(...args); AllowAdapter.prototype.__init.call(this); }
   __init() {this.name = 'allow'}

   shouldApply() {
    return true;
  }

   apply(context) {
    return {
      action: 'allow',
      explanation: 'Query passed all governance checks.',
      sanitizedSelectors: [...context.selectors],
    };
  }
}

export default AllowAdapter;
