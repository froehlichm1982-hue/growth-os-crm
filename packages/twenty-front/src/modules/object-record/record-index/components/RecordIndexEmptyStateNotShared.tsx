import { type NonReadableViewFieldInfo } from '@/object-record/record-index/hooks/useHasCurrentViewNonReadableFields';
import { getNonReadableViewFieldSubTitle } from '@/object-record/record-index/utils/getNonReadableViewFieldSubTitle';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { GrowthOsForbiddenState } from '~/growth-os/states/GrowthOsForbiddenState';

const StyledEmptyPlaceholderOuterContainer = styled.div`
  height: 100%;
  width: 100%;
`;

type RecordIndexEmptyStateNotSharedProps = {
  nonReadableViewFieldInfo?: NonReadableViewFieldInfo;
};

// Growth OS: kit 403 state.
export const RecordIndexEmptyStateNotShared = ({
  nonReadableViewFieldInfo,
}: RecordIndexEmptyStateNotSharedProps) => {
  return (
    <StyledEmptyPlaceholderOuterContainer>
      <GrowthOsForbiddenState
        title={isDefined(nonReadableViewFieldInfo) ? t`This view isn’t shared with you` : undefined}
        description={
          isDefined(nonReadableViewFieldInfo)
            ? getNonReadableViewFieldSubTitle(nonReadableViewFieldInfo)
            : undefined
        }
      />
    </StyledEmptyPlaceholderOuterContainer>
  );
};
