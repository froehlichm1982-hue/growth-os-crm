import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { IconCopy, IconMail } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { GrowthOsSyncPlanNotice } from '~/growth-os/accounts/GrowthOsSyncPlanNotice';

export const GROWTH_OS_BCC_INBOX_QUERY = gql`
  query GrowthOsBccInbox {
    growthOsBccInbox {
      address
      isAvailable
      isConfigured
      messageChannelId
    }
  }
`;

export const GROWTH_OS_ENABLE_BCC_INBOX_MUTATION = gql`
  mutation GrowthOsEnableBccInbox {
    growthOsEnableBccInbox {
      address
      isAvailable
      isConfigured
      messageChannelId
    }
  }
`;

type GrowthOsBccInbox = {
  address: string | null;
  isAvailable: boolean;
  isConfigured: boolean;
  messageChannelId: string | null;
};

const StyledCard = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledAddressRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledAddress = styled.code`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: 6px;
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  overflow-wrap: anywhere;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledText = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: 0;
`;

// Growth OS CRM: one BCC / forwarding address per workspace (Growth & Scale).
export const GrowthOsBccInboxSection = () => {
  const { data, loading } = useQuery<{ growthOsBccInbox: GrowthOsBccInbox }>(
    GROWTH_OS_BCC_INBOX_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );
  const [enableInbox, { loading: enabling }] = useMutation<{
    growthOsEnableBccInbox: GrowthOsBccInbox;
  }>(GROWTH_OS_ENABLE_BCC_INBOX_MUTATION, {
    refetchQueries: [GROWTH_OS_BCC_INBOX_QUERY],
  });
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const inbox = data?.growthOsBccInbox;

  if (loading && !inbox) return null;

  const handleCreate = async () => {
    try {
      await enableInbox();
      enqueueSuccessSnackBar({ message: 'Your BCC address is ready.' });
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? error.message
            : 'Could not create the BCC address. Please try again.',
      });
    }
  };

  const handleCopy = async () => {
    if (!inbox?.address) return;
    await navigator.clipboard?.writeText(inbox.address);
    enqueueSuccessSnackBar({ message: 'Address copied.' });
  };

  return (
    <Section>
      <H2Title
        title="BCC inbox"
        description="Log emails without connecting a mailbox. One address for the whole workspace."
      />
      {inbox && !inbox.isAvailable && <GrowthOsSyncPlanNotice />}
      <StyledCard data-testid="growth-os-bcc-inbox">
        {inbox?.address ? (
          <>
            <StyledAddressRow>
              <StyledAddress data-testid="growth-os-bcc-address">
                {inbox.address}
              </StyledAddress>
              <Button
                Icon={IconCopy}
                title="Copy"
                size="small"
                variant="secondary"
                onClick={handleCopy}
              />
            </StyledAddressRow>
            <StyledText>
              BCC this address to log the thread in the CRM. You can also
              forward a thread to it. Each email lands on the timeline of the
              people and companies it mentions, matched by email address and
              domain. New contacts are created for unknown senders.
            </StyledText>
            {!inbox.isAvailable && (
              <StyledText>
                Mail sent to this address is not logged while sync is paused.
              </StyledText>
            )}
          </>
        ) : !inbox?.isConfigured ? (
          <StyledText>
            The BCC inbox is not set up on this server yet. Please contact
            support@scalepoint-ventures.com.
          </StyledText>
        ) : (
          <>
            <StyledText>
              Get a private address for this workspace. BCC it on any email to
              log the thread in the CRM.
            </StyledText>
            <div>
              <Button
                Icon={IconMail}
                title={enabling ? 'Creating…' : 'Create BCC address'}
                variant="primary"
                accent="blue"
                size="small"
                disabled={!inbox?.isAvailable || enabling}
                onClick={handleCreate}
                dataTestId="growth-os-create-bcc-address"
              />
            </div>
          </>
        )}
      </StyledCard>
    </Section>
  );
};
