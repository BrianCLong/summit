interface PluginRec {
  name: string;
  version: string;
  signature: string;
  sbomDigest: string;
  enabled: boolean;
}

const plugins: PluginRec[] = [];

export default {
  Query: {
    plugins: () => plugins,
  },
  Mutation: {
    installPlugin: (_: any, { name, version, signature, sbomDigest }: PluginRec) => {
      const p = { name, version, signature, sbomDigest, enabled: false };
      plugins.push(p);
      return p;
    },
    enablePlugin: (_: any, { name }: { name: string }) => {
      const p = plugins.find((pl) => pl.name === name);
      if (!p) throw new Error('not found');
      p.enabled = true;
      return p;
    },
  },
};
