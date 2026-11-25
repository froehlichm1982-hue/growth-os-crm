import { type I18n } from '@lingui/core';
import { GROWTH_OS_BRAND } from 'twenty-shared/i18n';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';

type WhatIsTwentyProps = {
  i18n: I18n;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const WhatIsTwenty = ({ i18n: _i18n }: WhatIsTwentyProps) => {
  return (
    <>
      {/* Growth OS CRM: product copy is English-only (brand decision). */}
      <SubTitle value={`What is ${GROWTH_OS_BRAND.productName}?`} />
      <MainText>
        {`A B2B CRM by ${GROWTH_OS_BRAND.companyName} for your companies, people and pipelines, in your own isolated workspace hosted in Europe.`}
      </MainText>
    </>
  );
};
