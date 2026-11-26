import { GOS_MAIL_CRM } from 'src/gos/emailBaseV3.generated';

// Port of design-system/email/components/components.mjs (mail base v3, DS v2.8):
// bulletproof table cards with the dark-mode classes of base.html and a plain
// text twin. One change: `title` is optional, so a rows-only card is possible.

export const escapeMailHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const esc = escapeMailHtml;
const F = "Geist,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MOD = GOS_MAIL_CRM;
// Plain-text twin: html-to-text joins table cells, so a hidden ': ' keeps `label: value` rows.
const TWIN_COLON = '<span style="display:none;mso-hide:all">: </span>';
const TWIN_BREAK = '<br style="display:none">';

export type MailChipTone = 'success' | 'warning' | 'danger' | 'neutral' | 'module';

const TONES: Record<Exclude<MailChipTone, 'module'>, [string, string]> = {
  success: ['#E1F5EA', '#0F6B47'],
  warning: ['#FFF3D6', '#835000'],
  danger: ['#FDECEA', '#B42318'],
  neutral: ['#EEF2F7', '#3C4656'],
};

export const mailChip = (label: string, tone: MailChipTone = 'neutral') => {
  const [bg, fg] = tone === 'module' ? [MOD.soft, MOD.ink] : TONES[tone];

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;display:inline-table"><tr><td class="chip-${tone}" bgcolor="${bg}" style="background:${bg};color:${fg};border-radius:999px;padding:4px 10px;font-family:${F};font-size:12px;line-height:16px;font-weight:600;white-space:nowrap">&#9679;&nbsp;${esc(label)}</td></tr></table>`;
};

export type MailCardSpec = {
  initials?: string;
  title?: string;
  sub?: string;
  chip?: { label: string; tone: MailChipTone };
  rows?: Array<[string, string]>;
  meter?: { steps: string[]; active: number };
  total?: [string, string];
  note?: string;
  demo?: string;
};

export const mailProductCard = (spec: MailCardSpec) => {
  const L: string[] = [];

  L.push(
    '<table role="presentation" class="pc" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8FAFD" style="background:#F8FAFD;border:1px solid #DCE3EC;border-radius:12px;border-collapse:separate">',
  );

  if (spec.title) {
    const lead = spec.initials
      ? `<td width="44" valign="middle" style="width:44px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr><td class="av" width="44" height="44" align="center" valign="middle" bgcolor="${MOD.soft}" style="background:${MOD.soft};border-radius:22px;color:${MOD.ink};font-family:${F};font-size:15px;line-height:44px;font-weight:700;width:44px;height:44px">${esc(spec.initials)}</td></tr></table></td>`
      : '';

    L.push(
      `<tr><td class="pcp" style="padding:16px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${lead}` +
        `<td valign="middle" style="${spec.initials ? 'padding-left:14px;' : ''}font-family:${F};font-size:13px;line-height:19px;font-weight:400;color:#4A5566" class="mu"><b class="tx" style="display:block;font-family:${F};font-size:16px;line-height:22px;font-weight:600;color:#111E32">${esc(spec.title)}</b>${spec.sub ? `${TWIN_BREAK}${esc(spec.sub)}` : ''}</td>` +
        (spec.chip
          ? `<td align="right" valign="middle" style="padding-left:10px">${mailChip(spec.chip.label, spec.chip.tone)}</td>`
          : '') +
        '</tr></table></td></tr>',
    );
  }

  if (spec.meter) {
    const { steps, active } = spec.meter;
    const width = Math.floor(100 / steps.length);
    const bars = steps
      .map((step, i) => {
        const on = i <= active;
        const fill = on ? MOD.fill : '#DCE3EC';

        return `<td width="${width}%" style="padding:0 ${i < steps.length - 1 ? 4 : 0}px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="${on ? 'mt-on' : 'mt-off'}" height="6" bgcolor="${fill}" style="height:6px;line-height:6px;font-size:6px;border-radius:3px;background:${fill}">&nbsp;</td></tr><tr><td class="${i === active ? 'tx' : 'mu'}" style="padding-top:6px;font-family:${F};font-size:12px;line-height:16px;font-weight:${i === active ? 600 : 400};color:${i === active ? '#111E32' : '#4A5566'}">${esc(step)}</td></tr></table></td>`;
      })
      .join('');

    L.push(
      `<tr><td class="pcr" style="padding:0 18px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${bars}</tr></table></td></tr>`,
    );
  }

  const rows = spec.rows ?? [];

  if (spec.title && (rows.length > 0 || spec.total)) {
    L.push(
      '<tr><td class="pcr" style="padding:0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="ln" height="1" bgcolor="#DCE3EC" style="height:1px;line-height:1px;font-size:1px;background:#DCE3EC">&nbsp;</td></tr></table></td></tr>',
    );
  }

  rows.forEach(([key, value], i) => {
    const top = i === 0 ? (spec.title ? 12 : 14) : 4;
    const bottom = i === rows.length - 1 && !spec.total ? 14 : 4;

    L.push(
      `<tr><td class="pcr" style="padding:${top}px 18px ${bottom}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="mu" valign="top" style="font-family:${F};font-size:14px;line-height:21px;font-weight:400;color:#4A5566;padding-right:12px">${esc(key)}${TWIN_COLON}</td><td class="tx" align="right" valign="top" style="font-family:${F};font-size:14px;line-height:21px;font-weight:500;color:#111E32">${esc(value)}${TWIN_BREAK}</td></tr></table></td></tr>`,
    );
  });

  if (spec.total) {
    L.push(
      `<tr><td class="pcr" style="padding:8px 18px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="ln" colspan="2" height="1" bgcolor="#DCE3EC" style="height:1px;line-height:1px;font-size:1px;background:#DCE3EC">&nbsp;</td></tr><tr><td class="tx" style="padding-top:10px;font-family:${F};font-size:15px;line-height:22px;font-weight:600;color:#111E32">${esc(spec.total[0])}${TWIN_COLON}</td><td class="tx" align="right" style="padding-top:10px;font-family:${F};font-size:15px;line-height:22px;font-weight:700;color:#111E32">${esc(spec.total[1])}${TWIN_BREAK}</td></tr></table></td></tr>`,
    );
  }

  if (spec.note) {
    L.push(
      `<tr><td class="pcr mu" style="padding:0 18px 14px;font-family:${F};font-size:13px;line-height:19px;font-weight:400;color:#4A5566">${esc(spec.note)}</td></tr>`,
    );
  }

  L.push('</table>');

  if (spec.demo) {
    L.push(
      `<p class="mu" style="margin:6px 2px 0;font-family:${F};font-size:12px;line-height:16px;font-weight:400;color:#4A5566">${esc(spec.demo)}</p>`,
    );
  }

  return L.join('');
};
