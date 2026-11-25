/* Growth OS CRM AGPL override
 * (scripts/enterprise-overrides). Custom domains / Cloudflare hostnames are not
 * part of Growth OS CRM: lookups report "not configured", cleanup calls are
 * no-ops (so workspace deletion and domain removal never fail), and attempts
 * to register a hostname fail with a clear message. */

import { Injectable, Logger } from '@nestjs/common';

import { type DomainValidRecords } from 'src/engine/core-modules/dns-manager/dtos/domain-valid-records';

type DnsManagerOptions = {
  isPublicDomain?: boolean;
};

const CUSTOM_DOMAINS_UNAVAILABLE =
  'Custom domains are not available in Growth OS CRM.';

@Injectable()
export class DnsManagerService {
  private readonly logger = new Logger(DnsManagerService.name);

  isConfigured(): boolean {
    return false;
  }

  async registerHostname(
    _customDomain: string,
    _options?: DnsManagerOptions,
  ): Promise<void> {
    throw new Error(CUSTOM_DOMAINS_UNAVAILABLE);
  }

  async getHostnameWithRecords(
    _domain: string,
    _options?: DnsManagerOptions,
  ): Promise<DomainValidRecords | undefined> {
    return undefined;
  }

  async updateHostname(
    _fromHostname: string,
    _toHostname: string,
    _options?: DnsManagerOptions,
  ): Promise<void> {
    throw new Error(CUSTOM_DOMAINS_UNAVAILABLE);
  }

  async refreshHostname(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<DomainValidRecords | undefined> {
    return undefined;
  }

  async deleteHostnameSilently(
    hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<void> {
    this.logger.log(`No DNS provider configured, nothing to delete for ${hostname}`);
  }

  async isHostnameWorking(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<boolean> {
    return false;
  }

  async getHostnameId(
    _hostname: string,
    _options?: DnsManagerOptions,
  ): Promise<string | undefined> {
    return undefined;
  }

  async deleteHostname(
    _customHostnameId: string,
    _options?: DnsManagerOptions,
  ): Promise<void> {
    return;
  }
}
