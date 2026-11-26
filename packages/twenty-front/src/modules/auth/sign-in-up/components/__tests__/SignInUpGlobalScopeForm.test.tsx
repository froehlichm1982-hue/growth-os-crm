import { MockedProvider } from '@apollo/client/testing/react';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { ThemeProvider } from 'twenty-ui/theme-constants';

import { SignInUpGlobalScopeForm } from '@/auth/sign-in-up/components/SignInUpGlobalScopeForm';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import { authProvidersState } from '@/client-config/states/authProvidersState';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const buildWorkspaceUrlMock = jest.fn();
const signOutMock = jest.fn();
const createWorkspaceMock = jest.fn();
const handleResetPasswordMock = jest.fn();
const resetPasswordClickMock = jest.fn();

jest.mock('@/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: signOutMock,
  }),
}));

jest.mock('@/domain-manager/hooks/useBuildWorkspaceUrl', () => ({
  useBuildWorkspaceUrl: () => ({
    buildWorkspaceUrl: buildWorkspaceUrlMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignUpInNewWorkspace', () => ({
  useSignUpInNewWorkspace: () => ({
    createWorkspace: createWorkspaceMock,
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useSignInUpForm', () => ({
  useSignInUpForm: () => ({
    form: {
      getValues: () => 'person@example.com',
    },
  }),
}));

jest.mock('@/auth/sign-in-up/hooks/useHandleResetPassword', () => ({
  useHandleResetPassword: () => ({
    handleResetPassword: handleResetPasswordMock,
  }),
}));

jest.mock(
  '@/auth/sign-in-up/components/internal/SignInUpWithCredentials',
  () => ({
    SignInUpWithCredentials: () => <div>credentials-form</div>,
  }),
);

jest.mock('@/auth/sign-in-up/components/internal/SignInUpWithGoogle', () => ({
  SignInUpWithGoogle: () => null,
}));

jest.mock(
  '@/auth/sign-in-up/components/internal/SignInUpWithMicrosoft',
  () => ({
    SignInUpWithMicrosoft: () => null,
  }),
);

dynamicActivate(SOURCE_LOCALE);

describe('SignInUpGlobalScopeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    handleResetPasswordMock.mockReturnValue(resetPasswordClickMock);
  });

  // Growth OS: "Forgot password?" moved onto the password label row inside
  // SignInUpWithCredentials (kit), so the form no longer renders its own link.
  it('renders the credentials form without the legacy forgot-password link', () => {
    jotaiStore.set(signInUpStepState.atom, SignInUpStep.Password);
    jotaiStore.set(authProvidersState.atom, {
      google: false,
      magicLink: false,
      microsoft: false,
      password: true,
      sso: [],
    });

    render(
      <MockedProvider mocks={[]}>
        <JotaiProvider store={jotaiStore}>
          <ThemeProvider colorScheme="light">
            <I18nProvider i18n={i18n}>
              <SignInUpGlobalScopeForm />
            </I18nProvider>
          </ThemeProvider>
        </JotaiProvider>
      </MockedProvider>,
    );

    expect(screen.getByText('credentials-form')).toBeInTheDocument();
    expect(screen.queryByText('Forgot your password?')).not.toBeInTheDocument();
  });
});
