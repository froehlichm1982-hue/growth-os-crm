export type InboundEmailImportOutcome =
  | { kind: 'imported'; workspaceId: string; messageChannelId: string }
  | { kind: 'unmatched'; recipient: string | null }
  | { kind: 'unconfigured' }
  // Growth OS: the workspace plan does not include the BCC inbox
  | { kind: 'plan_blocked'; workspaceId: string };
