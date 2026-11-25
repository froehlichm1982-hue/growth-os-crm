import { Injectable } from '@nestjs/common';

import { type EmailDriverInterface } from 'src/engine/core-modules/email/drivers/interfaces/email-driver.interface';

import { LoggerDriver } from 'src/engine/core-modules/email/drivers/logger.driver';
import { SmtpDriver } from 'src/engine/core-modules/email/drivers/smtp.driver';
import { getGrowthOsEmailReplyTo } from 'src/engine/core-modules/email/utils/get-growth-os-email-reply-to.util';
import { EmailDriver } from 'src/engine/core-modules/email/enums/email-driver.enum';
import { DriverFactoryBase } from 'src/engine/core-modules/twenty-config/dynamic-factory.base';
import { ConfigVariablesGroup } from 'src/engine/core-modules/twenty-config/enums/config-variables-group.enum';
import { ConfigGroupHashService } from 'src/engine/core-modules/twenty-config/services/config-group-hash.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class EmailDriverFactory extends DriverFactoryBase<EmailDriverInterface> {
  constructor(
    twentyConfigService: TwentyConfigService,
    configGroupHashService: ConfigGroupHashService,
  ) {
    super(twentyConfigService, configGroupHashService);
  }

  protected buildConfigKey(): string {
    const driver = this.twentyConfigService.get('EMAIL_DRIVER');

    if (driver === EmailDriver.LOGGER) {
      return 'logger';
    }

    if (driver === EmailDriver.SMTP) {
      const emailConfigHash = this.configGroupHashService.computeHash(
        ConfigVariablesGroup.EMAIL_SETTINGS,
      );

      return `smtp|${emailConfigHash}`;
    }

    throw new Error(`Unsupported email driver: ${driver}`);
  }

  protected createDriver(): EmailDriverInterface {
    const driver = this.twentyConfigService.get('EMAIL_DRIVER');

    switch (driver) {
      case EmailDriver.LOGGER:
        return new LoggerDriver(getGrowthOsEmailReplyTo());

      case EmailDriver.SMTP: {
        const host = this.twentyConfigService.get('EMAIL_SMTP_HOST');
        const port = this.twentyConfigService.get('EMAIL_SMTP_PORT');
        // Growth OS CRM: Resend over plain SMTP (no SDK). RESEND_API_KEY is
        // the SMTP password, the user defaults to 'resend'.
        const resendApiKey = process.env.RESEND_API_KEY?.trim();
        const user =
          this.twentyConfigService.get('EMAIL_SMTP_USER') ||
          (resendApiKey ? 'resend' : undefined);
        const pass =
          this.twentyConfigService.get('EMAIL_SMTP_PASSWORD') || resendApiKey;
        const noTLS = this.twentyConfigService.get('EMAIL_SMTP_NO_TLS');

        if (!host || !port) {
          throw new Error('SMTP driver requires host and port to be defined');
        }

        const options: {
          host: string;
          port: number;
          auth?: { user: string; pass: string };
          secure?: boolean;
          ignoreTLS?: boolean;
          requireTLS?: boolean;
        } = { host, port };

        if (user && pass) {
          options.auth = { user, pass };
        }

        if (noTLS) {
          options.secure = false;
          options.ignoreTLS = true;
        } else if (port === 465) {
          // Implicit TLS (e.g. smtp.resend.com:465); 587 uses STARTTLS.
          options.secure = true;
        }

        return new SmtpDriver(options, getGrowthOsEmailReplyTo());
      }

      default:
        throw new Error(`Invalid email driver: ${driver}`);
    }
  }

  protected disposeDriver(driver: EmailDriverInterface): void {
    driver.close?.();
  }
}
