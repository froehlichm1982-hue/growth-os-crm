import {
  BadRequestException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';

import { MessageChannelType } from 'twenty-shared/types';

import {
  buildGrowthOsBccAddress,
  getGrowthOsInboundProvider,
  isGrowthOsBccAddress,
  isGrowthOsInboundConfigured,
  normalizeEnvelopeRecipient,
} from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-bcc-inbox.utils';
import {
  GROWTH_OS_INBOUND_MAX_RAW_BYTES,
  GrowthOsInboundWebhookController,
} from 'src/engine/core-modules/growth-os/bcc-inbox/growth-os-inbound-webhook.controller';
import { signGrowthOsPayload } from 'src/engine/core-modules/growth-os/utils/growth-os-signature.util';
import { INBOUND_EMAIL_MESSAGE_SOURCE } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/constants/inbound-email-message-source.constant';
import { InboundEmailImportService } from 'src/modules/messaging/message-import-manager/drivers/inbound-email/services/inbound-email-import.service';

const SECRET = 'unit-test-inbound-secret';
const DOMAIN = 'in.growthos.test';

const withEnv = (env: Record<string, string | undefined>, run: () => void) => {
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );

  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

describe('BCC inbox address utils', () => {
  it('builds a unique log- address on the inbound domain', () => {
    const first = buildGrowthOsBccAddress('IN.GrowthOS.test');
    const second = buildGrowthOsBccAddress(DOMAIN);

    expect(first).toMatch(/^log-[0-9a-f]{12}@in\.growthos\.test$/);
    expect(first).not.toEqual(second);
    expect(isGrowthOsBccAddress(` ${first.toUpperCase()} `, DOMAIN)).toBe(true);
    expect(isGrowthOsBccAddress('sales@in.growthos.test', DOMAIN)).toBe(false);
    expect(isGrowthOsBccAddress('log-abc@other.test', DOMAIN)).toBe(false);
  });

  it('normalizes "Name <addr>" envelope recipients', () => {
    expect(normalizeEnvelopeRecipient('Log <LOG-ABC@In.Test>')).toBe(
      'log-abc@in.test',
    );
    expect(normalizeEnvelopeRecipient(' log-abc@in.test ')).toBe(
      'log-abc@in.test',
    );
  });

  it('is configured only with a domain and the provider secret', () => {
    withEnv(
      {
        INBOUND_EMAIL_DOMAIN: DOMAIN,
        GROWTH_OS_INBOUND_PROVIDER: undefined,
        GROWTH_OS_INBOUND_WEBHOOK_SECRET: SECRET,
      },
      () => {
        expect(getGrowthOsInboundProvider()).toBe('webhook');
        expect(isGrowthOsInboundConfigured()).toBe(true);
      },
    );
    withEnv(
      { INBOUND_EMAIL_DOMAIN: '', GROWTH_OS_INBOUND_WEBHOOK_SECRET: SECRET },
      () => expect(isGrowthOsInboundConfigured()).toBe(false),
    );
    withEnv(
      {
        INBOUND_EMAIL_DOMAIN: DOMAIN,
        GROWTH_OS_INBOUND_PROVIDER: 'resend',
        RESEND_API_KEY: undefined,
      },
      () => {
        expect(getGrowthOsInboundProvider()).toBe('resend');
        expect(isGrowthOsInboundConfigured()).toBe(false);
      },
    );
  });
});

describe('GrowthOsInboundWebhookController', () => {
  const raw = Buffer.from(
    'From: Katrin <katrin@kestrel.example>\r\nTo: Lena <lena@nordlicht.example>\r\nSubject: Hi\r\n\r\nBody\r\n',
  );

  const setup = () => {
    const messageQueueService = { add: jest.fn().mockResolvedValue(undefined) };
    const source = { storeRawMessage: jest.fn().mockResolvedValue(undefined) };
    const controller = new GrowthOsInboundWebhookController(
      messageQueueService as never,
      source as never,
    );

    const call = (body: unknown, signature?: string) => {
      const rawBody = typeof body === 'string' ? body : JSON.stringify(body);

      return controller.handle({
        rawBody: Buffer.from(rawBody),
        headers: {
          'x-growth-os-signature':
            signature ?? signGrowthOsPayload(SECRET, rawBody),
        },
      } as never);
    };

    return { messageQueueService, source, call };
  };

  beforeEach(() => {
    process.env.GROWTH_OS_INBOUND_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.GROWTH_OS_INBOUND_WEBHOOK_SECRET;
  });

  it('rejects a bad signature without storing anything', async () => {
    const { call, source, messageQueueService } = setup();

    await expect(
      call(
        { recipients: ['log-a@in.test'], raw: raw.toString('base64') },
        signGrowthOsPayload('wrong-secret', '{}'),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(source.storeRawMessage).not.toHaveBeenCalled();
    expect(messageQueueService.add).not.toHaveBeenCalled();
  });

  it('rejects when the secret is not configured', async () => {
    const { call } = setup();

    delete process.env.GROWTH_OS_INBOUND_WEBHOOK_SECRET;
    await expect(
      call({ recipients: ['log-a@in.test'], raw: raw.toString('base64') }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed bodies', async () => {
    const { call } = setup();

    await expect(call('not json')).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      call({ recipients: [], raw: raw.toString('base64') }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      call({ recipients: ['log-a@in.test'], raw: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects messages above the size limit', async () => {
    const { call } = setup();
    const big = Buffer.alloc(GROWTH_OS_INBOUND_MAX_RAW_BYTES + 1, 97);

    await expect(
      call({ recipients: ['log-a@in.test'], raw: big.toString('base64') }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('stores the raw message by sha256 and queues one import job', async () => {
    const { call, source, messageQueueService } = setup();

    const result = await call({
      recipients: ['BCC <LOG-A@In.Test>', 42],
      raw: raw.toString('base64'),
    });

    expect(result.received).toBe(true);
    expect(result.reference).toMatch(/^[0-9a-f]{64}$/);
    expect(source.storeRawMessage).toHaveBeenCalledWith(result.reference, raw);
    expect(messageQueueService.add).toHaveBeenCalledWith(
      'MessagingInboundEmailImportJob',
      {
        source: INBOUND_EMAIL_MESSAGE_SOURCE.GROWTH_OS_WEBHOOK,
        reference: result.reference,
        envelopeRecipients: ['log-a@in.test'],
      },
      { id: `growth-os-inbound-${result.reference}` },
    );
  });
});

describe('InboundEmailImportService plan gate', () => {
  const channel = {
    id: 'channel-1',
    workspaceId: 'ws-1',
    connectedAccountId: 'account-1',
    handle: `log-abc@${DOMAIN}`,
    type: MessageChannelType.EMAIL_GROUP,
  };

  const setup = (entitlement: { enabled: boolean; readOnly: boolean }) => {
    const messageSource = {
      isConfigured: () => true,
      fetchMessage: jest.fn(),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };
    const service = new InboundEmailImportService(
      { get: () => DOMAIN } as never,
      { resolve: () => messageSource } as never,
      { executeInWorkspaceContext: jest.fn() } as never,
      { saveMessagesAndEnqueueContactCreation: jest.fn() } as never,
      { findOne: jest.fn().mockResolvedValue(channel) } as never,
      { findOne: jest.fn().mockResolvedValue(null) } as never,
    );

    Object.assign(service, {
      growthOsEntitlementService: {
        isFeatureEnabled: jest.fn().mockResolvedValue(entitlement.enabled),
        getEntitlement: jest
          .fn()
          .mockResolvedValue({ isReadOnly: entitlement.readOnly }),
      },
    });

    return { service, messageSource };
  };

  const params = {
    messageReference: {
      source: INBOUND_EMAIL_MESSAGE_SOURCE.GROWTH_OS_WEBHOOK,
      reference: 'sha',
    },
    envelopeRecipients: [`log-abc@${DOMAIN}`],
  };

  it('drops mail for a Starter workspace (no emailCalendarSync)', async () => {
    const { service, messageSource } = setup({
      enabled: false,
      readOnly: false,
    });

    await expect(
      service.importInboundMessage(params as never),
    ).resolves.toEqual({ kind: 'plan_blocked', workspaceId: 'ws-1' });
    expect(messageSource.cleanup).toHaveBeenCalledWith('sha');
    expect(messageSource.fetchMessage).not.toHaveBeenCalled();
  });

  it('drops mail for a read-only workspace', async () => {
    const { service, messageSource } = setup({ enabled: true, readOnly: true });

    await expect(
      service.importInboundMessage(params as never),
    ).resolves.toEqual({ kind: 'plan_blocked', workspaceId: 'ws-1' });
    expect(messageSource.fetchMessage).not.toHaveBeenCalled();
  });

  it('lets Growth workspaces through to the import', async () => {
    const { service, messageSource } = setup({
      enabled: true,
      readOnly: false,
    });

    messageSource.fetchMessage.mockResolvedValue({ externalId: 'x' });

    // The connected account lookup returns null in this unit setup, so the
    // service gets past the plan gate and fails on the missing account.
    await expect(service.importInboundMessage(params as never)).rejects.toThrow(
      'has no connected account',
    );
    expect(messageSource.fetchMessage).toHaveBeenCalledWith('sha');
  });
});
