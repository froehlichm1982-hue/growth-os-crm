// Growth OS CRM: host presets for IMAP/SMTP/CalDAV with an app password.
// Values are the providers' published settings (checked 2026-11).
export type GrowthOsMailPreset = {
  id: string;
  label: string;
  imap: { host: string; port: number; connectionSecurity: 'SSL_TLS' | 'STARTTLS' };
  smtp: { host: string; port: number; connectionSecurity: 'SSL_TLS' | 'STARTTLS' };
  caldav: { host: string } | null;
  note: string;
};

export const GROWTH_OS_MAIL_PRESETS: GrowthOsMailPreset[] = [
  {
    id: 'google',
    label: 'Google Workspace / Gmail',
    imap: { host: 'imap.gmail.com', port: 993, connectionSecurity: 'SSL_TLS' },
    smtp: { host: 'smtp.gmail.com', port: 587, connectionSecurity: 'STARTTLS' },
    caldav: null,
    note: 'Use an app password. Google Calendar does not accept app passwords over CalDAV, so calendar sync for Google comes with Google sign-in later.',
  },
  {
    id: 'microsoft',
    label: 'Microsoft 365 / Outlook',
    imap: {
      host: 'outlook.office365.com',
      port: 993,
      connectionSecurity: 'SSL_TLS',
    },
    smtp: {
      host: 'smtp.office365.com',
      port: 587,
      connectionSecurity: 'STARTTLS',
    },
    caldav: null,
    note: 'Many Microsoft 365 tenants have password sign-in for IMAP and SMTP turned off. If the test fails, ask your admin, or use the BCC inbox until Microsoft sign-in is available.',
  },
  {
    id: 'mailbox-org',
    label: 'mailbox.org',
    imap: { host: 'imap.mailbox.org', port: 993, connectionSecurity: 'SSL_TLS' },
    smtp: { host: 'smtp.mailbox.org', port: 465, connectionSecurity: 'SSL_TLS' },
    caldav: { host: 'https://dav.mailbox.org/caldav/' },
    note: 'Create an app password under Settings → Security if two-factor sign-in is on.',
  },
  {
    id: 'ionos',
    label: 'IONOS',
    imap: { host: 'imap.ionos.de', port: 993, connectionSecurity: 'SSL_TLS' },
    smtp: { host: 'smtp.ionos.de', port: 587, connectionSecurity: 'STARTTLS' },
    caldav: null,
    note: 'Use your mailbox password. Outside Germany the hosts may be imap.ionos.com / smtp.ionos.com.',
  },
];
