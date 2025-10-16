import React, { createContext, useContext, useEffect, useState } from 'react';
const Ctx = createContext<{ flags: any }>({ flags: {} });
export function FlagsProvider({ children }: { children: any }) {
  const [flags, setFlags] = useState<any>({});
  useEffect(() => {
    fetch('/ops/flags.json')
      .then((r) => r.json())
      .then(setFlags)
      .catch(() => setFlags({}));
  }, []);
  return <Ctx.Provider value={{ flags }}>{children}</Ctx.Provider>;
}
export function useFlag(name: string) {
  const { flags } = useContext(Ctx);
  return !!flags?.[name]?.enabled;
}
