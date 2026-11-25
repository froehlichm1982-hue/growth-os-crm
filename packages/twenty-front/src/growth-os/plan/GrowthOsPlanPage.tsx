import { styled } from '@linaria/react';
import { useMutation } from '@apollo/client/react';
import { useState } from 'react';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';

import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { GROWTH_OS_PRICING } from 'twenty-shared/i18n';
import {
  GROWTH_OS_BILLING_SESSION_MUTATION,
  type GrowthOsPlanData,
  type GrowthOsPlanName,
} from '~/growth-os/plan/growthOsPlanGraphql';
import {
  formatGrowthOsDate,
  getGrowthOsStatusLine,
  GROWTH_OS_PLAN_LABELS,
  useGrowthOsPlan,
} from '~/growth-os/plan/useGrowthOsPlan';

// Settings → Plan & Billing (Growth OS CRM). Plain English copy: the product
// is English-only and new Lingui ids are not in the compiled catalogs.

const StyledCurrent = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledCurrentHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledPlanName = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-family: var(--spv-font-display);
  font-size: 24px;
  line-height: 1.1;
`;

const StyledBadge = styled.span<{ tone: 'ok' | 'warn' | 'danger' }>`
  background: ${({ tone }) =>
    tone === 'ok' ? 'rgba(70,145,137,0.14)' : tone === 'warn' ? 'rgba(217,149,40,0.16)' : 'rgba(220,64,64,0.14)'};
  border-radius: 999px;
  color: ${({ tone }) =>
    tone === 'ok' ? '#3A7872' : tone === 'warn' ? '#9a5f00' : '#b42318'};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 2px 10px;
`;

const StyledMeters = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
`;

const StyledMeter = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};

  strong {
    color: ${themeCssVariables.font.color.primary};
    display: block;
    font-size: ${themeCssVariables.font.size.lg};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledNote = styled.div<{ tone?: 'warn' | 'danger' }>`
  background: ${({ tone }) =>
    tone === 'danger' ? 'rgba(220,64,64,0.08)' : 'rgba(217,149,40,0.10)'};
  border-radius: 6px;
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.5;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledToggle = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: 8px;
  display: inline-flex;
  gap: 2px;
  margin-bottom: ${themeCssVariables.spacing[3]};
  padding: 2px;

  button {
    background: transparent;
    border: none;
    border-radius: 6px;
    color: ${themeCssVariables.font.color.secondary};
    cursor: pointer;
    font: inherit;
    font-size: ${themeCssVariables.font.size.sm};
    padding: 6px 12px;
  }

  button[aria-pressed='true'] {
    background: ${themeCssVariables.background.primary};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
  }
`;

const StyledPlans = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const StyledPlanCard = styled.div<{ highlighted: boolean }>`
  background: ${themeCssVariables.background.primary};
  border: ${({ highlighted }) =>
    highlighted ? '2px solid #469189' : `1px solid var(--t-border-color-medium)`};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[4]};
  position: relative;
`;

const StyledRibbon = styled.span`
  background: #469189;
  border-radius: 999px;
  color: #ffffff;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  padding: 2px 8px;
  position: absolute;
  right: 12px;
  text-transform: uppercase;
  top: -10px;
`;

const StyledPrice = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: 28px;
  font-weight: ${themeCssVariables.font.weight.semiBold};

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    font-weight: ${themeCssVariables.font.weight.regular};
  }
`;

const StyledList = styled.ul`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0;
  padding-left: 18px;
  flex: 1;
`;

const StyledFine = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  margin: ${themeCssVariables.spacing[3]} 0 0;
`;

const PLAN_RANK: Record<GrowthOsPlanName, number> = {
  starter: 0,
  growth: 1,
  scale: 2,
};

const toneFor = (plan: GrowthOsPlanData) =>
  plan.isReadOnly
    ? 'danger'
    : plan.status === 'active' || plan.status === 'trialing'
      ? 'ok'
      : 'warn';

const formatLimit = (value: number | null, unit: string) =>
  value === null ? `Unlimited ${unit}` : `${value} ${unit}`;

export const GrowthOsPlanPage = () => {
  const { plan, refetch } = useGrowthOsPlan();
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [requestSession, { loading }] = useMutation<{
    growthOsBillingSessionUrl: string;
  }>(GROWTH_OS_BILLING_SESSION_MUTATION);
  const { enqueueErrorSnackBar } = useSnackBar();

  const openSession = async (
    kind: 'checkout' | 'portal',
    targetPlan?: GrowthOsPlanName,
  ) => {
    try {
      const result = await requestSession({
        variables: {
          kind,
          plan: targetPlan,
          interval,
          returnUrl: window.location.href,
        },
      });
      const url = result.data?.growthOsBillingSessionUrl;

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        await refetch();
      }
    } catch (error) {
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? error.message
            : 'Could not open billing. Please try again.',
      });
    }
  };

  const isPaying = plan?.status === 'active' || plan?.status === 'past_due';

  return (
    <SettingsPageLayout
      title="Plan & Billing"
      links={[
        { children: 'Workspace', href: getSettingsPath(SettingsPath.General) },
        { children: 'Plan & Billing' },
      ]}
    >
      <SettingsPageContainer>
        {plan && (
          <Section>
            <H2Title
              title="Current plan"
              description="What your workspace can use right now."
            />
            <StyledCurrent data-testid="growth-os-current-plan">
              <StyledCurrentHeader>
                <StyledPlanName>
                  {plan.isTrial
                    ? `${GROWTH_OS_PLAN_LABELS[plan.effectivePlan]} trial`
                    : plan.status === 'active' || plan.status === 'past_due'
                      ? GROWTH_OS_PLAN_LABELS[plan.plan]
                      : `${GROWTH_OS_PLAN_LABELS[plan.effectivePlan]} (no active plan)`}
                </StyledPlanName>
                <StyledBadge tone={toneFor(plan)}>
                  {getGrowthOsStatusLine(plan)}
                </StyledBadge>
              </StyledCurrentHeader>
              {plan.isTrial && (
                <StyledNote>
                  You are trying every Growth feature free until{' '}
                  {formatGrowthOsDate(plan.trialEndsAt)}. No card needed. Pick
                  a plan before then to keep email sync, workflows and more
                  than 3 users.
                </StyledNote>
              )}
              {!plan.isTrial && plan.effectivePlan !== plan.plan && !plan.isReadOnly && (
                <StyledNote>
                  Paid features are paused and nothing has been deleted. Your
                  workspace uses Starter limits until{' '}
                  {formatGrowthOsDate(plan.graceEndsAt)}, then becomes
                  read-only (view and export only).
                </StyledNote>
              )}
              {plan.status === 'past_due' && !plan.isReadOnly && (
                <StyledNote>
                  The last payment failed. Update your payment method by{' '}
                  {formatGrowthOsDate(plan.graceEndsAt)} to avoid read-only
                  mode.
                </StyledNote>
              )}
              {plan.isReadOnly && (
                <StyledNote tone="danger">
                  This workspace is read-only. You can still view and export
                  all data. Choose a plan to edit again. Nothing has been
                  deleted.
                </StyledNote>
              )}
              <StyledMeters>
                <StyledMeter>
                  <strong>
                    {plan.seatsUsed}
                    {plan.seatsAllowed === null ? '' : ` / ${plan.seatsAllowed}`}
                  </strong>
                  Users{plan.pendingInvitations > 0 ? ` (+${plan.pendingInvitations} invited)` : ''}
                </StyledMeter>
                <StyledMeter>
                  <strong>
                    {plan.pipelines}
                    {plan.maxPipelines === null ? '' : ` / ${plan.maxPipelines}`}
                  </strong>
                  Pipelines
                </StyledMeter>
                <StyledMeter>
                  <strong>
                    {plan.features.emailCalendarSync ? 'On' : 'Off'}
                  </strong>
                  Email & calendar sync
                </StyledMeter>
                <StyledMeter>
                  <strong>{plan.features.workflows ? 'On' : 'Off'}</strong>
                  Workflows
                </StyledMeter>
                <StyledMeter>
                  <strong>
                    {plan.apiRequestsPerMinute > 0
                      ? `${plan.apiRequestsPerMinute}/min`
                      : 'Off'}
                  </strong>
                  API
                </StyledMeter>
              </StyledMeters>
              <StyledActions>
                {isPaying ? (
                  <Button
                    title="Manage billing"
                    variant="primary"
                    accent="blue"
                    disabled={loading}
                    onClick={() => openSession('portal')}
                  />
                ) : (
                  <Button
                    title="Upgrade to Growth"
                    variant="primary"
                    accent="blue"
                    disabled={loading}
                    onClick={() => openSession('checkout', 'growth')}
                  />
                )}
              </StyledActions>
            </StyledCurrent>
          </Section>
        )}
        <Section>
          <H2Title
            title="Plans"
            description="Net prices per user and month, excl. VAT. Yearly billing = 2 months free."
          />
          <StyledToggle role="group" aria-label="Billing interval">
            <button
              type="button"
              aria-pressed={interval === 'month'}
              onClick={() => setInterval('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={interval === 'year'}
              onClick={() => setInterval('year')}
            >
              Yearly · 2 months free
            </button>
          </StyledToggle>
          <StyledPlans>
            {GROWTH_OS_PRICING.plans.map((entry) => {
              const isCurrent = isPaying && plan?.plan === entry.plan;
              const isUpgrade =
                !plan || !isPaying || PLAN_RANK[entry.plan] > PLAN_RANK[plan.plan];
              const monthly =
                interval === 'year'
                  ? entry.priceYearlyEur / 12
                  : entry.priceMonthlyEur;

              return (
                <StyledPlanCard
                  key={entry.plan}
                  highlighted={entry.plan === 'growth'}
                  data-testid={`growth-os-plan-${entry.plan}`}
                >
                  {entry.plan === 'growth' && (
                    <StyledRibbon>Recommended</StyledRibbon>
                  )}
                  <H2Title title={entry.label} description={entry.tagline} />
                  <StyledPrice>
                    €{Number.isInteger(monthly) ? monthly : monthly.toFixed(2)}
                    <span>
                      {' '}
                      / user / month
                      {interval === 'year'
                        ? ` · €${entry.priceYearlyEur} billed yearly`
                        : ''}
                    </span>
                  </StyledPrice>
                  <StyledList>
                    {entry.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </StyledList>
                  <Button
                    fullWidth
                    title={
                      isCurrent
                        ? 'Current plan'
                        : isUpgrade
                          ? `Choose ${entry.label}`
                          : `Switch to ${entry.label}`
                    }
                    variant={entry.plan === 'growth' ? 'primary' : 'secondary'}
                    accent={entry.plan === 'growth' ? 'blue' : 'default'}
                    disabled={isCurrent || loading}
                    onClick={() =>
                      openSession(isPaying ? 'portal' : 'checkout', entry.plan)
                    }
                  />
                </StyledPlanCard>
              );
            })}
          </StyledPlans>
          <StyledFine>
            {GROWTH_OS_PRICING.trialDays}-day Growth trial, no card required.
            After the trial, unpaid workspaces keep Starter limits for 7 days
            and then become read-only; data is never deleted automatically and
            can always be exported. Billed by ScalePoint Ventures Oy.
          </StyledFine>
        </Section>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
