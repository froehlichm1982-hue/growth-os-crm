// Growth OS CRM (AGPL-3.0): inert value returned by stubs of removed
// Enterprise front-end modules. Any property access or call yields the same
// inert value; iteration yields nothing; it is never thenable.
const handler: ProxyHandler<() => void> = {
  get: (_target, key) => {
    if (key === Symbol.iterator) return function* () {};
    if (key === Symbol.toPrimitive) return () => '';
    if (key === 'then') return undefined;
    if (key === 'length') return 0;
    return inert;
  },
  apply: () => inert,
};

const inert: any = new Proxy(() => undefined, handler);

export const enterpriseStubValue = (): any => inert;
