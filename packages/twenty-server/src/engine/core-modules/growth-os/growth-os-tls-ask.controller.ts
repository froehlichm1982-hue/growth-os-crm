import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';

import { type Request } from 'express';

import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// Caddy `on_demand_tls { ask ... }` endpoint: Caddy asks before it requests a certificate for a
// host name it has not seen yet. 200 = issue it, anything else = refuse. Only the apex host
// (FRONTEND_URL) and `<subdomain>.<apex>` of an existing, not deleted workspace get a 200, so
// nobody can make the server order certificates for arbitrary names.
//
// Reachable only by Caddy: Caddy calls it directly (no X-Forwarded-* headers); a request that
// came through the public reverse proxy carries them and is refused. The Caddy site must also
// block `/internal/*` for outside traffic (see CUTOVER-PLAN.md).
const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export const growthOsBaseHost = () => {
  try {
    return new URL(process.env.FRONTEND_URL ?? '').hostname.toLowerCase();
  } catch {
    return null;
  }
};

@Controller('internal')
export class GrowthOsTlsAskController {
  constructor(
    private readonly growthOsEntitlementService: GrowthOsEntitlementService,
  ) {}

  @Get('tls-ask')
  @HttpCode(200)
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async ask(
    @Query('domain') domain: string | undefined,
    @Req() request: Request,
  ) {
    if (request.headers['x-forwarded-for'] || request.headers['x-forwarded-host']) {
      throw new NotFoundException();
    }

    const base = growthOsBaseHost();
    const host = (domain ?? '').trim().toLowerCase().replace(/\.$/, '');

    if (!base || !host) throw new NotFoundException();
    if (host === base) return { ok: true, kind: 'apex' };
    if (!host.endsWith(`.${base}`)) throw new NotFoundException();

    const subdomain = host.slice(0, -(base.length + 1));

    if (!LABEL.test(subdomain)) throw new NotFoundException();

    let exists: boolean;

    try {
      exists = await this.growthOsEntitlementService.subdomainExists(subdomain);
    } catch {
      // Database not ready: Caddy treats this as "no certificate now" and asks again on the next handshake.
      throw new ServiceUnavailableException();
    }
    if (!exists) throw new NotFoundException();

    return { ok: true, kind: 'workspace' };
  }
}
