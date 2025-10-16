export function requireInvariant(
  check: (ctx: any) => { ok: boolean; msg?: string },
) {
  return (_: any, __: string, desc: PropertyDescriptor) => {
    const f = desc.value;
    desc.value = async function (...args: any[]) {
      const ctx = args[0] || {};
      const r = check(ctx);
      if (!r.ok)
        throw new Error(`InvariantViolation: ${r.msg || 'unspecified'}`);
      return f.apply(this, args);
    };
    return desc;
  };
}
