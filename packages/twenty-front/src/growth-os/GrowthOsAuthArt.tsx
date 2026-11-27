import { useLingui } from '@lingui/react/macro';

// Auth art panel product cards (Pipeline column + Timeline), Nordlicht Analytics demo data.
// Live DOM instead of the DS raster crops (assets/auth/r-col, r-time): the crops cut text at the
// card edge ("11:00 AM", "Alpenglow Energy") and the tag sat on the first row. Here every string is
// short enough for its row, nothing is truncated or ellipsised, and the tag has its own clearance
// above the content. Values scale with the card (container query units) so the 440px short-window
// stage (growth-os-auth.css) stays whole. The inner wrapper is fixed to the light theme because the
// DS card surface stays light in dark mode. Decorative: the whole art section is aria-hidden.

const Avatar = ({ letter, tone }: { letter: string; tone: 'a' | 'b' | 'c' }) => (
  <span className={`growth-os-art-av growth-os-art-av--${tone}`}>{letter}</span>
);

const Deal = ({ letter, tone, title, amount, owner, date, company }: { letter: string; tone: 'a' | 'b'; title: string; amount: string; owner: string; date: string; company: string }) => (
  <div className="growth-os-art-deal">
    <div className="growth-os-art-row growth-os-art-row--title"><Avatar letter={letter} tone={tone} />{title}</div>
    <div className="growth-os-art-row growth-os-art-row--muted">{amount}</div>
    <div className="growth-os-art-row"><Avatar letter="L" tone="c" />{owner}</div>
    <div className="growth-os-art-row growth-os-art-row--muted">{date}</div>
    <div className="growth-os-art-row"><span className="growth-os-art-chip">{company}</span></div>
  </div>
);

export const GrowthOsArtPipelineCard = ({ style }: { style: React.CSSProperties }) => {
  const { t } = useLingui();

  return (
    <div className="gos-auth-card" data-m="crm" style={style}>
      <div className="growth-os-art-ui growth-os-art-ui--col" data-theme="light">
        <div className="growth-os-art-head">
          <span className="growth-os-art-stage">{t`Meeting`}</span>
          <span className="growth-os-art-count">51.8k</span>
        </div>
        <Deal letter="A" tone="a" title="Alpenglow expansion" amount="€ 25.9k" owner="Lena Hartmann" date="Feb 12, 2027" company="Alpenglow Energy" />
        <Deal letter="K" tone="b" title="Kestrel fleet add-on" amount="€ 11.5k" owner="Lena Hartmann" date="Jan 8, 2027" company="Kestrel Logistics" />
      </div>
      <span className="tag"><i />{t`Pipeline · Meeting`}</span>
    </div>
  );
};

export const GrowthOsArtTimelineCard = ({ style }: { style: React.CSSProperties }) => {
  const { t } = useLingui();

  return (
    <div className="gos-auth-card" data-m="crm" style={style}>
      <div className="growth-os-art-ui growth-os-art-ui--time" data-theme="light">
        <div className="growth-os-art-date">{t`November 2026`}</div>
        <div className="growth-os-art-event"><span className="growth-os-art-dot" />{t`Task linked`} <u>{t`Send pricing`}</u></div>
        <div className="growth-os-art-event"><span className="growth-os-art-dot" />{t`Note linked`} <u>{t`Discovery call`}</u></div>
        <div className="growth-os-art-event"><span className="growth-os-art-dot" />{t`3 fields updated`}</div>
        <div className="growth-os-art-box">
          <div><span>{t`Owner`}</span> <Avatar letter="L" tone="c" />Lena Hartmann</div>
          <div><span>{t`Annual revenue`}</span> € 48m</div>
        </div>
      </div>
      <span className="tag"><i />{t`Timeline`}</span>
    </div>
  );
};
