import { type APP_LOCALES } from 'twenty-shared/translations';
import {
  KitButton,
  KitDealCard,
  KitEmail,
  KitFallbackLink,
  KitText,
  kitI18n,
} from 'src/components/kit/KitEmail';

// Growth OS CRM: a deal moved to another stage (DS mail base v3 deal card with
// the stage meter). Preview and component for the pipeline notification; it
// has no server trigger yet.
export type CrmDealMovedEmailProps = {
  userName: string;
  actorName: string;
  dealName: string;
  companyName: string;
  fromStage: 0 | 1 | 2 | 3;
  toStage: 0 | 1 | 2 | 3;
  value: string;
  owner: string;
  closeDate: string;
  link: string;
  // Previews only: labels the card as demo data.
  isDemo?: boolean;
  locale: keyof typeof APP_LOCALES;
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const CrmDealMovedEmail = ({ userName, actorName, dealName, companyName, fromStage, toStage, value, owner, closeDate, link, isDemo, locale }: CrmDealMovedEmailProps) => {
  const i18n = kitI18n(locale);
  const steps = [i18n._('Lead'), i18n._('Qualified'), i18n._('Proposal'), i18n._('Won')];
  const stage = steps[toStage];

  return (
    <KitEmail
      locale={locale}
      title={i18n._('{dealName} moved to {stage}', { dealName, stage })}
      preheader={i18n._('{actorName} moved the deal in your pipeline.', { actorName })}
      eyebrow={i18n._('Deal')}
      heading={i18n._('Deal moved to {stage}', { stage })}
      reason="product"
    >
      <KitText>
        {userName ? i18n._('Hi {userName},', { userName }) : i18n._('Hi,')}{' '}
        {i18n._('{actorName} moved {dealName} from {fromStage} to {stage}.', { actorName, dealName, fromStage: steps[fromStage], stage })}
      </KitText>
      <KitDealCard
        initials={initialsOf(companyName)}
        deal={dealName}
        company={companyName}
        stage={stage}
        steps={steps}
        active={toStage}
        rows={[[i18n._('Value'), value], [i18n._('Owner'), owner], [i18n._('Close date'), closeDate]]}
        demo={isDemo ? i18n._('Demo data · test only, not a customer') : undefined}
      />
      <KitButton href={link} label={i18n._('Open deal')} />
      <KitFallbackLink href={link} i18n={i18n} />
    </KitEmail>
  );
};

CrmDealMovedEmail.PreviewProps = {
  userName: 'Lena',
  actorName: 'Jonas Becker',
  dealName: 'Annual platform licence',
  companyName: 'Nordlicht Analytics',
  fromStage: 1,
  toStage: 2,
  value: '€24,000',
  owner: 'Lena Hartmann',
  closeDate: '18 Dec 2026',
  link: 'https://crm.scalepoint-ventures.com/object/opportunity/demo',
  isDemo: true,
  locale: 'en',
} as CrmDealMovedEmailProps;

export default CrmDealMovedEmail;
