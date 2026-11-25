import { useLingui } from '@lingui/react/macro';

import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { GrowthOsEmptyState } from '~/growth-os/states/GrowthOsStates';

type GraphQLLikeError = {
  errors?: { extensions?: { code?: string } }[];
  graphQLErrors?: { extensions?: { code?: string } }[];
  cause?: unknown;
};

// True when the server refused the request for permission reasons (HTTP 403 / FORBIDDEN).
export const isGrowthOsForbiddenError = (error: unknown): boolean => {
  if (error === null || typeof error !== 'object') return false;
  const candidate = error as GraphQLLikeError & { statusCode?: number };

  if (candidate.statusCode === 403) return true;
  const list = [...(candidate.errors ?? []), ...(candidate.graphQLErrors ?? [])];

  if (list.some((entry) => entry?.extensions?.code === 'FORBIDDEN')) return true;

  return candidate.cause !== undefined && candidate.cause !== error
    ? isGrowthOsForbiddenError(candidate.cause)
    : false;
};

// Growth OS CRM: in-app 403 (kit state, keeps the app shell around it).
export const GrowthOsForbiddenState = ({
  title,
  description,
  width,
}: {
  title?: string;
  description?: string;
  width?: number;
}) => {
  const { t } = useLingui();

  return (
    <GrowthOsEmptyState
      testId="growth-os-forbidden"
      icon="lock"
      badge="lock"
      title={title ?? t`You don’t have access to this`}
      description={
        description ??
        t`Your role doesn’t include this area. Ask a workspace admin to give you access. Nothing is wrong with your data.`
      }
      primary={{ label: t`Go to your workspace`, onClick: () => window.location.assign('/') }}
      secondary={{
        label: t`Contact support`,
        onClick: () => window.location.assign(`mailto:${GROWTH_OS_BRAND.supportEmail}`),
      }}
      width={width}
    />
  );
};
