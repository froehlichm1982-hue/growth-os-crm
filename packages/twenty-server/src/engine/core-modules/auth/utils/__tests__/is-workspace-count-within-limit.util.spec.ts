import { isWorkspaceCountWithinLimit } from 'src/engine/core-modules/auth/utils/is-workspace-count-within-limit.util';

describe('isWorkspaceCountWithinLimit', () => {
  it('allows a 6th and a 1000th workspace when unlimited (0 / unset)', () => {
    expect(isWorkspaceCountWithinLimit({ workspaceCount: 5, maxWorkspaces: 0 })).toBe(true);
    expect(isWorkspaceCountWithinLimit({ workspaceCount: 999, maxWorkspaces: undefined })).toBe(true);
  });

  it('allows creating below a high operator limit', () => {
    expect(isWorkspaceCountWithinLimit({ workspaceCount: 5, maxWorkspaces: 10000 })).toBe(true);
  });

  it('refuses once an operator-set low limit is reached', () => {
    expect(isWorkspaceCountWithinLimit({ workspaceCount: 2, maxWorkspaces: 3 })).toBe(true);
    expect(isWorkspaceCountWithinLimit({ workspaceCount: 3, maxWorkspaces: 3 })).toBe(false);
    expect(isWorkspaceCountWithinLimit({ workspaceCount: 7, maxWorkspaces: 3 })).toBe(false);
  });
});
