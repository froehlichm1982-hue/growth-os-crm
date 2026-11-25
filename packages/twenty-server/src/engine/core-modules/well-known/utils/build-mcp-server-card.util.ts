import { GROWTH_OS_BRAND } from 'twenty-shared/i18n';

import { MCP_PROTOCOL_VERSION } from 'src/engine/api/mcp/constants/mcp-protocol-version.const';

type BuildMcpServerCardArgs = {
  baseUrl: string;
  version: string;
};

export const buildMcpServerCard = ({
  baseUrl,
  version,
}: BuildMcpServerCardArgs) => ({
  $schema:
    'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
  name: 'com.scalepoint-ventures/growth-os-crm',
  version,
  title: GROWTH_OS_BRAND.productName,
  description:
    'Read and write your Growth OS CRM data - companies, people, opportunities, tasks, notes and any custom objects - from AI assistants. Tools are discovered at runtime and scoped to the authenticated workspace.',
  websiteUrl: GROWTH_OS_BRAND.marketingUrl,
  // Repository is only advertised once SOURCE_CODE_URL is configured.
  ...(GROWTH_OS_BRAND.sourceCodeUrl
    ? { repository: { url: GROWTH_OS_BRAND.sourceCodeUrl, source: 'github' } }
    : {}),
  remotes: [
    {
      type: 'streamable-http',
      url: `${baseUrl}/mcp`,
      supportedProtocolVersions: [MCP_PROTOCOL_VERSION],
      headers: [
        {
          name: 'Authorization',
          description:
            "Optional. Bearer <api-key> for static API-key auth. Omit to use OAuth 2.1, auto-discovered from this host's /.well-known/oauth-protected-resource and /.well-known/oauth-authorization-server.",
          isRequired: false,
          isSecret: true,
        },
      ],
    },
  ],
});
