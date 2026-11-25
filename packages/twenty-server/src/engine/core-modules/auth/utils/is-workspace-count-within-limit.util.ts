// Growth OS CRM: 0, undefined or a non-finite value means "no limit".
export const isWorkspaceCountWithinLimit = ({
  workspaceCount,
  maxWorkspaces,
}: {
  workspaceCount: number;
  maxWorkspaces: number | undefined;
}): boolean => {
  if (
    maxWorkspaces === undefined ||
    !Number.isFinite(maxWorkspaces) ||
    maxWorkspaces <= 0
  ) {
    return true;
  }

  return workspaceCount < maxWorkspaces;
};
