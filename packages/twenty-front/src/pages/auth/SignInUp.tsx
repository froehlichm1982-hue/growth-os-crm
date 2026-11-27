import { growthOsResetSentState } from '~/growth-os/auth/growthOsAuthAlertState';
import { GrowthOsResetSentCard } from '~/growth-os/auth/GrowthOsResetSent';
import { signInUpModeState } from '@/auth/states/signInUpModeState';
import { SignInUpMode } from '@/auth/types/signInUpMode';
import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { useSignInUpForm } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { isCreatingWorkspaceState } from '@/auth/states/isCreatingWorkspaceState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { styled } from '@linaria/react';

import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

import { EmailVerificationSent } from '@/auth/sign-in-up/components/EmailVerificationSent';
import { SignInUpGlobalScopeForm } from '@/auth/sign-in-up/components/SignInUpGlobalScopeForm';
import { SignInUpStandardContent } from '@/auth/sign-in-up/components/SignInUpStandardContent';
import { SignInUpWorkspaceScopeForm } from '@/auth/sign-in-up/components/SignInUpWorkspaceScopeForm';
import { SignInUpSsoIdentityProviderSelection } from '@/auth/sign-in-up/components/internal/SignInUpSsoIdentityProviderSelection';
import { OnboardingLayout } from '@/onboarding/components/OnboardingLayout';
import { StyledOnboardingStepPage } from '@/onboarding/components/StyledOnboardingStepPage';
import { SignInUpWorkspaceCreationForm } from '@/auth/sign-in-up/components/internal/SignInUpWorkspaceCreationForm';
import { SignInUpWorkspaceScopeFormEffect } from '@/auth/sign-in-up/components/internal/SignInUpWorkspaceScopeFormEffect';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { useGetPublicWorkspaceDataByDomain } from '@/domain-manager/hooks/useGetPublicWorkspaceDataByDomain';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { useEffect, useMemo } from 'react';

import { SignInUpGlobalScopeFormEffect } from '@/auth/sign-in-up/components/internal/SignInUpGlobalScopeFormEffect';
import { SignInUpSsoExchangeTokenEffect } from '@/auth/sign-in-up/components/internal/SignInUpSsoExchangeTokenEffect';
import { SignInUpTwoFactorAuthenticationProvision } from '@/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationProvision';
import { SignInUpTOTPVerification } from '@/auth/sign-in-up/components/internal/SignInUpTwoFactorAuthenticationVerification';
import { useWorkspaceFromInviteHash } from '@/auth/sign-in-up/hooks/useWorkspaceFromInviteHash';
import { clientConfigApiStatusState } from '@/client-config/states/clientConfigApiStatusState';
import { useLingui } from '@lingui/react/macro';
import { useSearchParams } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { Loader } from 'twenty-ui/feedback';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { GrowthOsAuthShell } from '~/growth-os/GrowthOsAuthShell';

const StyledLoaderContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  margin-bottom: ${themeCssVariables.spacing[8]};
  margin-top: ${themeCssVariables.spacing[8]};
  width: 100%;
`;

export const SignInUp = () => {
  const growthOsResetSent = useAtomStateValue(growthOsResetSentState);
  const { t } = useLingui();
  const setSignInUpStep = useSetAtomState(signInUpStepState);
  const clientConfigApiStatus = useAtomStateValue(clientConfigApiStatusState);
  const isCreatingWorkspace = useAtomStateValue(isCreatingWorkspaceState);

  const { form } = useSignInUpForm();
  const [signInUpMode, setSignInUpModeFromUrl] = useAtomState(signInUpModeState);
  const [modeSearchParams] = useSearchParams();
  const modeParam = modeSearchParams.get('mode');

  // Growth OS: /welcome?mode=signup opens the trial sign-up directly.
  useEffect(() => {
    if (modeParam === 'signup') setSignInUpModeFromUrl(SignInUpMode.SignUp);
    if (modeParam === 'signin') setSignInUpModeFromUrl(SignInUpMode.SignIn);
  }, [modeParam, setSignInUpModeFromUrl]);
  const { signInUpStep } = useSignInUp(form);
  const { isDefaultDomain } = useIsCurrentLocationOnDefaultDomain();
  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const { loading: getPublicWorkspaceDataLoading } =
    useGetPublicWorkspaceDataByDomain();
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const { workspaceInviteHash, workspace: workspaceFromInviteHash } =
    useWorkspaceFromInviteHash();

  const [searchParams, setSearchParams] = useSearchParams();

  const onClickOnLogo = () => {
    setSignInUpStep(SignInUpStep.Init);
  };

  const onBackFromWorkspaceCreation = () => {
    if (searchParams.has('action')) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('action');
      setSearchParams(nextSearchParams, { replace: true });
    }

    setSignInUpStep(SignInUpStep.WorkspaceSelection);
  };

  const isGlobalScope = isDefaultDomain && isMultiWorkspaceEnabled;

  const title = useMemo(() => {
    if (isDefined(workspaceInviteHash)) {
      const workspaceName = workspaceFromInviteHash?.displayName ?? '';
      return t`Join ${workspaceName}`;
    }

    if (signInUpStep === SignInUpStep.WorkspaceSelection) {
      return t`Choose a Workspace`;
    }

    if (signInUpStep === SignInUpStep.WorkspaceCreation) {
      return t`Create your workspace`;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationProvision) {
      return t`Set up two-step sign-in`;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationVerification) {
      return t`Enter your authenticator code`;
    }

    // Growth OS CRM: kit auth headings; the mode is the person's choice.
    if (signInUpMode === SignInUpMode.SignUp) {
      return t`Start your 14-day trial`;
    }

    return t`Welcome back`;
  }, [
    workspaceInviteHash,
    signInUpStep,
    workspacePublicData?.displayName,
    signInUpMode,
    t,
    workspaceFromInviteHash?.displayName,
  ]);

  const subtitle = useMemo(() => {
    if (isDefined(workspaceInviteHash)) {
      return t`You’re invited to this workspace. Continue with Google, Microsoft or your work email.`;
    }

    if (signInUpStep === SignInUpStep.Password) {
      return signInUpMode === SignInUpMode.SignUp
        ? t`No card needed. Choose a password to get started.`
        : t`Enter your password to continue.`;
    }

    if (signInUpStep === SignInUpStep.WorkspaceSelection) {
      return t`Pick the workspace you want to open.`;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationVerification) {
      return t`Open your authenticator app and enter the 6-digit code for Growth OS.`;
    }

    if (
      signInUpStep === SignInUpStep.Init ||
      signInUpStep === SignInUpStep.Email
    ) {
      return signInUpMode === SignInUpMode.SignUp
        ? t`No card needed. Start with your work email.`
        : t`Sign in to your Growth OS workspace.`;
    }

    return undefined;
  }, [workspaceInviteHash, signInUpStep, signInUpMode, t]);

  const signInUpForm = useMemo(() => {
    if (getPublicWorkspaceDataLoading || !clientConfigApiStatus.isLoadedOnce) {
      return (
        <StyledLoaderContainer>
          <Loader color="gray" />
        </StyledLoaderContainer>
      );
    }

    // The workspace creation form is shared by both multi-workspace and
    // single-workspace self-host, so it must render regardless of domain or
    // workspace scope.
    if (signInUpStep === SignInUpStep.WorkspaceCreation) {
      return <SignInUpWorkspaceCreationForm />;
    }

    if (isDefaultDomain && isMultiWorkspaceEnabled) {
      return (
        <>
          <SignInUpSsoExchangeTokenEffect />
          <SignInUpGlobalScopeFormEffect />
          <SignInUpGlobalScopeForm />
        </>
      );
    }

    if (
      isOnAWorkspace &&
      signInUpStep === SignInUpStep.SsoIdentityProviderSelection
    ) {
      return <SignInUpSsoIdentityProviderSelection />;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationProvision) {
      return <SignInUpTwoFactorAuthenticationProvision />;
    }

    if (signInUpStep === SignInUpStep.TwoFactorAuthenticationVerification) {
      return <SignInUpTOTPVerification />;
    }

    if (isDefined(workspacePublicData) && isOnAWorkspace) {
      return (
        <>
          <SignInUpWorkspaceScopeFormEffect />
          <SignInUpWorkspaceScopeForm />
        </>
      );
    }

    return (
      <>
        <SignInUpSsoExchangeTokenEffect />
        <SignInUpGlobalScopeFormEffect />
        <SignInUpGlobalScopeForm />
      </>
    );
  }, [
    clientConfigApiStatus.isLoadedOnce,
    isDefaultDomain,
    isMultiWorkspaceEnabled,
    isOnAWorkspace,
    getPublicWorkspaceDataLoading,
    signInUpStep,
    workspacePublicData,
  ]);

  return signInUpStep === SignInUpStep.WorkspaceCreation ? (
    <OnboardingLayout
      onBack={!isCreatingWorkspace ? onBackFromWorkspaceCreation : undefined}
    >
      <StyledOnboardingStepPage>{signInUpForm}</StyledOnboardingStepPage>
    </OnboardingLayout>
  ) : (
    <GrowthOsAuthShell>
      {isDefined(growthOsResetSent) ? (
        <GrowthOsResetSentCard />
      ) : signInUpStep === SignInUpStep.EmailVerification ? (
        <EmailVerificationSent email={searchParams.get('email')} />
      ) : (
        <SignInUpStandardContent
          workspacePublicData={workspacePublicData}
          signInUpForm={signInUpForm}
          signInUpStep={signInUpStep}
          title={title}
          subtitle={subtitle}
          onClickOnLogo={onClickOnLogo}
        />
      )}
    </GrowthOsAuthShell>
  );
};
