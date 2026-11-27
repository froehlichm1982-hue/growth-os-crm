import { type Request } from 'express';

import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { GrowthOsTlsAskController } from 'src/engine/core-modules/growth-os/growth-os-tls-ask.controller';

const req = (headers: Record<string, string> = {}) => ({ headers }) as unknown as Request;

describe('GET /internal/tls-ask?domain= (Caddy on_demand ask)', () => {
  const saved = process.env.FRONTEND_URL;
  const known = new Set(['acme', 'spv']);
  const subdomainExists = jest.fn(async (s: string) => known.has(s));
  const controller = new GrowthOsTlsAskController({ subdomainExists } as unknown as GrowthOsEntitlementService);

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://crm.scalepoint-ventures.com';
    subdomainExists.mockClear();
  });
  afterAll(() => {
    if (saved === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = saved;
  });

  it('200 for the apex host and for the subdomain of an existing workspace (case and trailing dot ignored)', async () => {
    await expect(controller.ask('crm.scalepoint-ventures.com', req())).resolves.toMatchObject({ ok: true });
    await expect(controller.ask('acme.crm.scalepoint-ventures.com', req())).resolves.toMatchObject({ ok: true, kind: 'workspace' });
    await expect(controller.ask('ACME.crm.scalepoint-ventures.com.', req())).resolves.toMatchObject({ ok: true });
    expect(subdomainExists).toHaveBeenCalledWith('acme');
  });

  it('404 for an unknown workspace, a foreign host, a nested name, a bad label, no domain', async () => {
    for (const d of ['nobody.crm.scalepoint-ventures.com', 'acme.example.com', 'crm.scalepoint-ventures.com.evil.example', 'a.b.crm.scalepoint-ventures.com', '-x.crm.scalepoint-ventures.com', 'a_b.crm.scalepoint-ventures.com', '', undefined]) {
      await expect(controller.ask(d, req())).rejects.toMatchObject({ status: 404 });
    }
    expect(subdomainExists).toHaveBeenCalledTimes(1); // only the plausible 'nobody' reached the database
  });

  it('a request that came through the public reverse proxy (X-Forwarded-*) is refused', async () => {
    await expect(controller.ask('acme.crm.scalepoint-ventures.com', req({ 'x-forwarded-for': '203.0.113.7' }))).rejects.toMatchObject({ status: 404 });
    await expect(controller.ask('acme.crm.scalepoint-ventures.com', req({ 'x-forwarded-host': 'crm.scalepoint-ventures.com' }))).rejects.toMatchObject({ status: 404 });
  });

  it('503 (not 200) while the database is not reachable; 404 when FRONTEND_URL is not set', async () => {
    subdomainExists.mockRejectedValueOnce(new Error('db down'));
    await expect(controller.ask('acme.crm.scalepoint-ventures.com', req())).rejects.toMatchObject({ status: 503 });
    delete process.env.FRONTEND_URL;
    await expect(controller.ask('acme.crm.scalepoint-ventures.com', req())).rejects.toMatchObject({ status: 404 });
  });
});
