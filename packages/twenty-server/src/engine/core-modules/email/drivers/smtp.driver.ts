import { Logger } from '@nestjs/common';

import {
  createTransport,
  type SendMailOptions,
  type Transporter,
} from 'nodemailer';

import { type EmailDriverInterface } from 'src/engine/core-modules/email/drivers/interfaces/email-driver.interface';

import type SMTPConnection from 'nodemailer/lib/smtp-connection';

export class SmtpDriver implements EmailDriverInterface {
  private readonly logger = new Logger(SmtpDriver.name);
  private transport: Transporter;

  constructor(
    options: SMTPConnection.Options,
    // Growth OS CRM: default Reply-To for system mail (EMAIL_REPLY_TO).
    private readonly defaultReplyTo?: string,
  ) {
    this.transport = createTransport({ ...options, pool: true });
  }

  close(): void {
    this.transport.close();
  }

  async send(sendMailOptions: SendMailOptions): Promise<void> {
    const options =
      this.defaultReplyTo && !sendMailOptions.replyTo
        ? { ...sendMailOptions, replyTo: this.defaultReplyTo }
        : sendMailOptions;

    await this.transport.sendMail(options).catch((err) => {
      this.logger.error(`sending email to '${sendMailOptions.to}': ${err}`);

      throw err;
    });

    this.logger.log(`Email to '${sendMailOptions.to}' successfully sent`);
  }
}
