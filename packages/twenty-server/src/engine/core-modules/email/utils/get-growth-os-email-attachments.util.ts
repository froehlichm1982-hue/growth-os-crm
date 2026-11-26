import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { type SendMailOptions } from 'nodemailer';

// Growth OS mail base v3 (DS v2.8): the header art travels
// inside the mail as inline attachments (Content-ID), so nothing has to be
// hosted. The HTML refers to cid:header-crm-{light,dark}@crm.scalepoint.
const CID_FILES: Record<string, string> = {
  'header-crm-light@crm.scalepoint': 'email-header-crm-light@2x.png',
  'header-crm-dark@crm.scalepoint': 'email-header-crm-dark@2x.png',
};

const getAssetDir = () =>
  process.env.EMAIL_ASSET_DIR ??
  join(__dirname, '../../../../front/images/growth-os');

export const getGrowthOsEmailAttachments = (
  sendMailOptions: SendMailOptions,
): NonNullable<SendMailOptions['attachments']> => {
  const html =
    typeof sendMailOptions.html === 'string' ? sendMailOptions.html : '';
  const existing = (sendMailOptions.attachments ?? []) as Array<{
    cid?: string;
  }>;

  return Object.entries(CID_FILES)
    .filter(([cid]) => html.includes(`cid:${cid}`))
    .filter(([cid]) => !existing.some((attachment) => attachment.cid === cid))
    .flatMap(([cid, file]) => {
      const path = join(getAssetDir(), file);

      return existsSync(path)
        ? [
            {
              filename: file,
              content: readFileSync(path),
              contentType: 'image/png',
              contentDisposition: 'inline' as const,
              cid,
            },
          ]
        : [];
    });
};
