import { styled } from '@linaria/react';
import { type ReactNode } from 'react';

const StyledFieldContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
`;

export const StopPropagationContainer = ({
  children,
  growthOsFieldType,
  growthOsFieldName,
}: {
  children: ReactNode;
  growthOsFieldType?: string;
  growthOsFieldName?: string;
}) => (
  <StyledFieldContainer
    className="growth-os-board-card-field"
    data-growth-os-field-type={growthOsFieldType}
    data-growth-os-field-name={growthOsFieldName}
    onClick={(e) => {
      e.stopPropagation();
    }}
  >
    {children}
  </StyledFieldContainer>
);
