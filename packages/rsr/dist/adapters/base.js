

export  class BasePolicyAdapter  {
  
  


  async evaluate(context) {
    const applies = await this.shouldApply(context);
    if (!applies) {
      return null;
    }
    return this.apply(context);
  }
}
