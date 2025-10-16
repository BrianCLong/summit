export function whenThen(
  when: (ctx: any) => boolean,
  then: (ctx: any) => boolean,
) {
  return (_: any, __: string, desc: PropertyDescriptor) => {
    const f = desc.value;
    desc.value = async function (ctx: any, ...rest: any[]) {
      if (when(ctx)) {
        const res = await f.apply(this, [ctx, ...rest]);
        if (!then({ ctx, res }))
          throw new Error('SpecLiveViolation: THEN failed');
        return res;
      } else {
        return f.apply(this, [ctx, ...rest]);
      }
    };
    return desc;
  };
}
