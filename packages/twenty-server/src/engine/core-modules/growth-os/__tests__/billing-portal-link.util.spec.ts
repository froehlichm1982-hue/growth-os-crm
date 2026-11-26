import { buildBillingPortalLink } from 'src/engine/core-modules/growth-os/utils/billing-portal-link.util';

describe('buildBillingPortalLink', () => {
  it('matches the billing-service test vector', () => {
    const link = buildBillingPortalLink('acc_1', {
      module: 'connect',
      secret: 'unit-test-connect-secret',
      nowSeconds: 2000000000 - 7 * 86400,
    });
    const url = new URL(link);

    expect(url.host).toBe('billing.scalepoint-ventures.com');
    expect(url.searchParams.get('exp')).toBe('2000000000');
    expect(url.searchParams.get('sig')).toBe(
      '8f9447d0fb3a84b42e10210ccd4d6cd1096cd4674d2a4805258fc4ad748a4deb',
    );
  });

  it('refuses to build a link without a secret', () => {
    expect(() => buildBillingPortalLink('acc_1', { secret: '' })).toThrow();
  });
});
