import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { type JSX } from 'react';
import { GrowthOsStateIcon } from '~/growth-os/auth/GrowthOsResetSent';
import { type PublicWorkspaceData } from '~/generated-metadata/graphql';

type SignInUpStandardContentProps = {
  workspacePublicData?: PublicWorkspaceData | null;
  signInUpForm: JSX.Element | null;
  signInUpStep: SignInUpStep;
  title: string;
  subtitle?: string;
  onClickOnLogo?: () => void;
};

// Growth OS (DS v2.9 auth kit): heading block `.head` (h1 + `.sub`) and the form
// inside the shell's `.gos-auth-form`. The upstream workspace logo is not shown.
export const SignInUpStandardContent = ({
  signInUpForm,
  signInUpStep,
  title,
  subtitle,
}: SignInUpStandardContentProps) => {
  if (signInUpStep === SignInUpStep.TwoFactorAuthenticationVerification) {
    return (
      <div className="gos-auth-status">
        <GrowthOsStateIcon kind="shield" />
        <div className="head">
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
        {signInUpForm}
      </div>
    );
  }

  return (
    <>
      <div className="head">
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {signInUpForm}
      {signInUpStep === SignInUpStep.WorkspaceSelection && (
        <WorkspaceSelectionFooter />
      )}
    </>
  );
};
