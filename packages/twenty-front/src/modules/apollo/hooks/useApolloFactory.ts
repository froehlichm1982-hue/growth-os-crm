import { t } from '@lingui/core/macro';
import { growthOsAuthAlertState } from '~/growth-os/auth/growthOsAuthAlertState';
import { growthOsSessionExpiredState } from '~/growth-os/session/growthOsSessionExpiredState';
import { InMemoryCache } from '@apollo/client';
import { useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ApolloFactory, type Options } from '@/apollo/services/apollo.factory';
import { ONGOING_USER_CREATION_PATHS } from '@/auth/constants/OngoingUserCreationPaths';
import { currentUserState } from '@/auth/states/currentUserState';
import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import { currentUserWorkspaceState } from '@/auth/states/currentUserWorkspaceState';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { returnToPathState } from '@/auth/states/returnToPathState';
import { clearSessionGeneration } from '@/auth/utils/clearSessionGeneration';
import { isValidReturnToPath } from '@/auth/utils/isValidReturnToPath';
import { appVersionState } from '@/client-config/states/appVersionState';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { useUpdateEffect } from '~/hooks/useUpdateEffect';
import { isMatchingLocation } from '~/utils/isMatchingLocation';

export const useApolloFactory = (options: Partial<Options> = {}) => {
  const setGrowthOsAuthAlert = useSetAtomState(growthOsAuthAlertState);
  // oxlint-disable-next-line twenty/no-state-useref
  const apolloRef = useRef<ApolloFactory | null>(null);

  const navigate = useNavigate();
  const setIsCookieAuthActive = useSetAtomState(isCookieAuthActiveState);
  const [currentWorkspace, setCurrentWorkspace] = useAtomState(
    currentWorkspaceState,
  );
  const appVersion = useAtomStateValue(appVersionState);
  const [currentWorkspaceMember, setCurrentWorkspaceMember] = useAtomState(
    currentWorkspaceMemberState,
  );
  const [currentUser, setCurrentUser] = useAtomState(currentUserState);
  const setGrowthOsSessionExpired = useSetAtomState(growthOsSessionExpiredState);
  // Growth OS: who was signed in when a request came back unauthenticated
  // (the Apollo client is created once, so read through a ref).
  // oxlint-disable-next-line twenty/no-state-useref
  const signedInEmailRef = useRef<string | null>(null);
  signedInEmailRef.current =
    isDefined(currentWorkspaceMember) && isDefined(currentUser?.email)
      ? currentUser.email
      : null;
  const setCurrentUserWorkspace = useSetAtomState(currentUserWorkspaceState);

  const setReturnToPath = useSetAtomState(returnToPathState);
  const location = useLocation();
  // oxlint-disable-next-line twenty/no-state-useref
  const locationRef = useRef(location);
  locationRef.current = location;

  const { enqueueErrorSnackBar } = useSnackBar();

  const apolloClient = useMemo(() => {
    apolloRef.current = new ApolloFactory({
      uri: `${REACT_APP_SERVER_BASE_URL}/graphql`,
      cache: new InMemoryCache({
        typePolicies: {
          RemoteTable: {
            keyFields: ['name'],
          },
        },
      }),

      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network',
        },
      },
      devtools: { enabled: process.env.IS_DEBUG_MODE === 'true' },
      currentWorkspaceMember: currentWorkspaceMember,
      currentWorkspace: currentWorkspace,
      appVersion,
      onUnauthenticatedError: () => {
        // Growth OS (§4 session expired): mid-session, keep the page and ask
        // for the password in a modal instead of navigating away.
        if (
          isDefined(signedInEmailRef.current) &&
          ![...ONGOING_USER_CREATION_PATHS, AppPath.ResetPassword].some(
            (path) => isMatchingLocation(locationRef.current, path),
          )
        ) {
          setGrowthOsSessionExpired({ email: signedInEmailRef.current });

          return;
        }
        clearSessionGeneration();
        setIsCookieAuthActive(false);
        setCurrentUser(null);
        setCurrentWorkspaceMember(null);
        setCurrentWorkspace(null);
        setCurrentUserWorkspace(null);
        if (
          ![...ONGOING_USER_CREATION_PATHS, AppPath.ResetPassword].some(
            (path) => isMatchingLocation(locationRef.current, path),
          )
        ) {
          const path = `${locationRef.current.pathname}${locationRef.current.search}${locationRef.current.hash}`;

          if (isValidReturnToPath(path)) {
            setReturnToPath(path);
          }
          // Growth OS: say why the user is back on sign-in (kit session-expired state).
          setGrowthOsAuthAlert({
            tone: 'warn',
            message: t`Your session expired. Sign in again to pick up where you left off.`,
          });
          navigate(AppPath.SignInUp);
        }
      },
      onAppVersionMismatch: (message) => {
        enqueueErrorSnackBar({
          message,
          options: {
            dedupeKey: 'app-version-mismatch',
          },
        });
      },
      onPayloadTooLarge: (message) => {
        enqueueErrorSnackBar({
          message,
          options: {
            dedupeKey: 'payload-too-large',
          },
        });
      },
      extraLinks: [],
      isDebugMode: process.env.IS_DEBUG_MODE === 'true',
      ...options,
    });

    return apolloRef.current.getClient();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    setCurrentUser,
    setCurrentWorkspaceMember,
    setCurrentWorkspace,
    setReturnToPath,
    enqueueErrorSnackBar,
  ]);

  useUpdateEffect(() => {
    if (isDefined(apolloRef.current)) {
      apolloRef.current.updateWorkspaceMember(currentWorkspaceMember);
    }
  }, [currentWorkspaceMember]);

  useUpdateEffect(() => {
    if (isDefined(apolloRef.current)) {
      apolloRef.current.updateCurrentWorkspace(currentWorkspace);
    }
  }, [currentWorkspace]);

  useUpdateEffect(() => {
    if (isDefined(apolloRef.current)) {
      apolloRef.current.updateAppVersion(appVersion);
    }
  }, [appVersion]);

  return apolloClient;
};
