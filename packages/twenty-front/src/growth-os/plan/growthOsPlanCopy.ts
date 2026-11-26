import { msg } from '@lingui/core/macro';
import { type MessageDescriptor } from '@lingui/core';

// Growth OS: translatable plan card copy. Keys mirror GROWTH_OS_PRICING
// (twenty-shared) so the card text follows the UI language.
export const GROWTH_OS_PLAN_COPY: Record<
  'starter' | 'growth' | 'scale',
  { tagline: MessageDescriptor; highlights: MessageDescriptor[] }
> = {
  starter: {
    tagline: msg`One pipeline for a solo operator or a team of up to 3.`,
    highlights: [
      msg`Up to 3 users`,
      msg`1 pipeline, 10 custom fields per object`,
      msg`Views, CSV import and export`,
    ],
  },
  growth: {
    tagline: msg`Everything a growing sales team needs.`,
    highlights: [
      msg`Up to 25 users`,
      msg`Email & calendar sync`,
      msg`Workflows, custom objects and roles`,
      msg`Unlimited pipelines, API & webhooks`,
    ],
  },
  scale: {
    tagline: msg`Unlimited users, AI and higher API limits.`,
    highlights: [
      msg`Unlimited users`,
      msg`Everything in Growth`,
      msg`AI assistant (monthly allowance)`,
      msg`Higher API rate limits`,
    ],
  },
};
