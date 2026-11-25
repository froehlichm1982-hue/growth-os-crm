import { type I18n } from '@lingui/core';
import { Column, Container, Row } from 'react-email';
import { Link } from 'src/components/Link';
import { ShadowText } from 'src/components/ShadowText';
import { GROWTH_OS_BRAND } from 'twenty-shared/i18n';

// Growth OS CRM email footer: ScalePoint legal links + AGPL-3.0 source offer.
const footerContainerStyle = {
  marginTop: '12px',
};

type FooterProps = {
  i18n: I18n;
};

export const Footer = ({ i18n }: FooterProps) => {
  return (
    <Container style={footerContainerStyle}>
      <Row>
        <Column>
          <ShadowText>
            <Link
              href={GROWTH_OS_BRAND.marketingUrl}
              value={i18n._('Website')}
            />
          </ShadowText>
        </Column>
        <Column>
          <ShadowText>
            <Link
              href={GROWTH_OS_BRAND.legal.terms}
              value={i18n._('Terms')}
            />
          </ShadowText>
        </Column>
        <Column>
          <ShadowText>
            <Link
              href={GROWTH_OS_BRAND.legal.privacy}
              value={i18n._('Privacy')}
            />
          </ShadowText>
        </Column>
        <Column>
          <ShadowText>
            <Link
              href={`mailto:${GROWTH_OS_BRAND.supportEmail}`}
              value={i18n._('Support')}
            />
          </ShadowText>
        </Column>
      </Row>
      <ShadowText>
        <>
          {GROWTH_OS_BRAND.productName} · {GROWTH_OS_BRAND.companyLegalName}
          <br />
          <Link
            href={GROWTH_OS_BRAND.legal.notice}
            value={i18n._('Legal notice')}
          />
          {' · '}
          <Link
            href={GROWTH_OS_BRAND.upstreamUrl}
            value={`Built on ${GROWTH_OS_BRAND.upstreamName}`}
          />
          {' · '}
          <Link
            href={GROWTH_OS_BRAND.sourceCodeUrl}
            value={i18n._('Source code (AGPL-3.0)')}
          />
        </>
      </ShadowText>
    </Container>
  );
};
