import { isSubdomainValid } from 'src/engine/core-modules/domain/subdomain-manager/utils/is-subdomain-valid.util';

describe('GROWTH_OS_RESERVED_SUBDOMAINS', () => {
  const saved = process.env.GROWTH_OS_RESERVED_SUBDOMAINS;

  afterEach(() => {
    if (saved === undefined) delete process.env.GROWTH_OS_RESERVED_SUBDOMAINS;
    else process.env.GROWTH_OS_RESERVED_SUBDOMAINS = saved;
  });

  it('is empty by default: nothing extra is reserved', () => {
    delete process.env.GROWTH_OS_RESERVED_SUBDOMAINS;
    expect(isSubdomainValid('portal')).toBe(true);
  });

  it('reserves the listed names (case and spaces ignored) and nothing else', () => {
    process.env.GROWTH_OS_RESERVED_SUBDOMAINS = 'spv, Portal ,oldorff';
    expect(isSubdomainValid('spv')).toBe(false);
    expect(isSubdomainValid('PORTAL')).toBe(false);
    expect(isSubdomainValid('oldorff')).toBe(false);
    expect(isSubdomainValid('acme')).toBe(true);
  });
});
