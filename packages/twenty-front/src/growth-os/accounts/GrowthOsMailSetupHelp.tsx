import { styled } from '@linaria/react';
import { useFormContext } from 'react-hook-form';

import { type ConnectionFormData } from '@/settings/accounts/hooks/useImapSmtpCaldavConnectionForm';
import { useState } from 'react';
import { EmailConnectionSecurity } from '~/generated-metadata/graphql';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import {
  GROWTH_OS_MAIL_PRESETS,
  type GrowthOsMailPreset,
} from '~/growth-os/accounts/growthOsMailPresets';
import { GrowthOsSyncPlanNotice } from '~/growth-os/accounts/GrowthOsSyncPlanNotice';

const StyledPresets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledPreset = styled.button<{ isActive: boolean }>`
  background: ${({ isActive }) =>
    isActive ? 'rgba(58,120,114,0.12)' : themeCssVariables.background.primary};
  border: 1px solid
    ${({ isActive }) =>
      isActive ? 'var(--c-link)' : themeCssVariables.border.color.medium};
  border-radius: 6px;
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
`;

const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: ${themeCssVariables.spacing[2]} 0 0;
`;

const StyledHelp = styled.details`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: 8px;
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin-top: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};

  summary {
    color: ${themeCssVariables.font.color.primary};
    cursor: pointer;
    font-weight: ${themeCssVariables.font.weight.medium};
  }

  h4 {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: ${themeCssVariables.spacing[3]} 0 ${themeCssVariables.spacing[1]};
  }

  ol {
    margin: 0;
    padding-left: 18px;
  }
`;

const toSecurity = (value: 'SSL_TLS' | 'STARTTLS') =>
  value === 'SSL_TLS'
    ? EmailConnectionSecurity.SSL_TLS
    : EmailConnectionSecurity.STARTTLS;

// Growth OS CRM: presets + app-password help next to the IMAP/SMTP/CalDAV form.
export const GrowthOsMailSetupHelp = () => {
  const { setValue } = useFormContext<ConnectionFormData>();
  const [activePreset, setActivePreset] = useState<GrowthOsMailPreset | null>(
    null,
  );

  const applyPreset = (preset: GrowthOsMailPreset) => {
    setActivePreset(preset);
    setValue('IMAP.host', preset.imap.host, { shouldDirty: true });
    setValue('IMAP.port', preset.imap.port, { shouldDirty: true });
    setValue('IMAP.connectionSecurity', toSecurity(preset.imap.connectionSecurity), {
      shouldDirty: true,
    });
    setValue('SMTP.host', preset.smtp.host, { shouldDirty: true });
    setValue('SMTP.port', preset.smtp.port, { shouldDirty: true });
    setValue('SMTP.connectionSecurity', toSecurity(preset.smtp.connectionSecurity), {
      shouldDirty: true,
    });
    setValue('CALDAV.host', preset.caldav?.host ?? '', { shouldDirty: true });
  };

  return (
    <Section>
      <GrowthOsSyncPlanNotice />
      <H2Title
        title="Your mail provider"
        description="Pick a provider to fill in the servers, then enter your email address and an app password."
      />
      <StyledPresets data-testid="growth-os-mail-presets">
        {GROWTH_OS_MAIL_PRESETS.map((preset) => (
          <StyledPreset
            key={preset.id}
            type="button"
            isActive={activePreset?.id === preset.id}
            onClick={() => applyPreset(preset)}
            data-testid={`growth-os-mail-preset-${preset.id}`}
          >
            {preset.label}
          </StyledPreset>
        ))}
      </StyledPresets>
      {activePreset && <StyledNote>{activePreset.note}</StyledNote>}
      <StyledHelp data-testid="growth-os-app-password-help">
        <summary>How do I create an app password?</summary>
        <h4>Google Workspace / Gmail</h4>
        <ol>
          <li>Turn on 2-Step Verification for your Google account.</li>
          <li>
            Open myaccount.google.com/apppasswords and create a password named
            “Growth OS CRM”.
          </li>
          <li>
            Paste the 16-character password into the IMAP and SMTP password
            fields below.
          </li>
        </ol>
        <h4>Microsoft 365</h4>
        <ol>
          <li>
            Open mysignins.microsoft.com/security-info → Add sign-in method →
            App password (only shown if your admin allows it).
          </li>
          <li>Name it “Growth OS CRM” and paste it into both password fields.</li>
        </ol>
        <h4>Good to know</h4>
        <ol>
          <li>
            Some companies turn off IMAP or app passwords. Your admin can turn
            them on, or you can log mail with the BCC inbox instead.
          </li>
          <li>
            Google and Microsoft sign-in (no app password) will follow later.
          </li>
          <li>
            Passwords are encrypted at rest and only used to sync this mailbox.
          </li>
        </ol>
      </StyledHelp>
    </Section>
  );
};
