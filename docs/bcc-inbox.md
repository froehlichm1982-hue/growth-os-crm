# BCC inbox (Growth and Scale)

Each workspace on Growth or Scale (including the 14-day Growth trial) can create one
unique logging address:

    log-<12 hex>@<INBOUND_EMAIL_DOMAIN>

Users BCC or forward a message to this address and the thread is logged on the
timeline of the matching people and companies. In-app copy:
"BCC this address to log the thread in the CRM."
Starter does not get the inbox. The server refuses to create it, and mail sent to an
existing address is dropped while the workspace is on Starter or read-only.

## Which option we chose (AGPL)

Upstream Twenty marks part of its "email group / forwarding address" feature
`@license Enterprise` (`email-group-access.service.ts`). Upstream
`createEmailGroupChannel` also calls `ensureEmailingDomain`, which reaches that
Enterprise stub. **We use neither.** Growth OS ships a small AGPL alternative:

- `GrowthOsBccInboxService` (`engine/core-modules/growth-os/bcc-inbox/`) creates the
  address. It sets up a workspace-visible `EMAIL_GROUP` connected account and a
  message channel whose handle is the address. Contact auto-creation is set to
  sent and received.
- Inbound mail reuses the upstream AGPL import pipeline
  (`MessagingInboundEmailImportJob`, then `InboundEmailImportService`, then
  `saveMessagesAndEnqueueContactCreation`). That pipeline matches the envelope
  recipient to the channel handle and links participants to people and companies.
- New message source `GROWTH_OS_WEBHOOK`. Raw MIME is held in the Redis cache
  (`growth-os-inbound:<sha256>`, 24h TTL) so message bodies never land in job
  payloads or logs.
- Plan gate inside the import: when a channel is found but the workspace lacks
  `emailCalendarSync` or is read-only, the message is discarded and the outcome
  is `plan_blocked`.

## Inbound providers

`GROWTH_OS_INBOUND_PROVIDER` selects the provider:

| value | path | needs |
|---|---|---|
| `webhook` (default) | `POST /webhooks/growth-os-inbound` | `INBOUND_EMAIL_DOMAIN`, `GROWTH_OS_INBOUND_WEBHOOK_SECRET` |
| `resend` | upstream Resend Inbound `/webhooks/messaging/resend` | `INBOUND_EMAIL_DOMAIN`, `RESEND_API_KEY`, Resend webhook secret |

If the provider is not configured, Settings → Accounts shows "not set up on this
server" instead of the create button.

### Webhook contract

```
POST /webhooks/growth-os-inbound
X-Growth-OS-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>
Content-Type: application/json

{ "recipients": ["log-3f2a…@in.example.com"], "raw": "<base64 RFC 5322 message>" }
```

- Returns `202 { received: true, reference: <sha256> }`.
- Returns `401` on a bad or old signature, `400` on a malformed body, and `413`
  above 10 MB.
- Any MX or forwarding service that can POST raw MIME can sit in front of it
  (for example a small Cloudflare Email Worker, Mailgun routes or Postmark
  inbound), as long as it posts in this format.

## DNS and forwarding (production, not done yet)

1. Pick a dedicated subdomain, e.g. `in.<product domain>`, and set
   `INBOUND_EMAIL_DOMAIN` to it.
2. Point its MX record at the chosen inbound provider (Resend Inbound, or the
   relay in front of the webhook). Do not reuse the apex domain's MX.
3. Configure the provider to POST to `https://<app host>/webhooks/growth-os-inbound`
   (or the Resend webhook) with the shared secret.
4. Outbound SPF/DKIM for Resend is already confirmed. Inbound needs only the MX
   record.

No production DNS changes are part of this work.

## Local testing (no real mail)

```
# growth-os.env (local only, never committed)
INBOUND_EMAIL_DOMAIN=in.growthos.localhost
GROWTH_OS_INBOUND_WEBHOOK_SECRET=<any local value>

npx tsx scripts/growth-os-inbound-mail-mock.ts --to log-…@in.growthos.localhost \
  --from "Katrin Vogel <katrin@kestrel-logistics.example>" --subject "Renewal"
```

The mock builds a MIME message, signs it, and posts it to `127.0.0.1:3000`.
The worker imports the message and it appears on the timeline of the matching
person and company.
