import { useSelectFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useSelectFieldDisplay';
import { SelectDisplay } from 'twenty-ui/data-display';
import { isDefined } from 'twenty-shared/utils';

export const SelectFieldDisplay = () => {
  const { fieldValue, fieldDefinition } = useSelectFieldDisplay();

  const selectedOption = fieldDefinition.metadata.options?.find(
    (option) => option.value === fieldValue,
  );

  if (!isDefined(selectedOption)) {
    return <></>;
  }

  // Growth OS: stage chips use DS color.stage (growth-os-shell.css §10).
  const isStage = fieldDefinition.metadata.fieldName === 'stage';

  return (
    <span
      className="growth-os-select"
      data-growth-os-stage-value={isStage ? String(fieldValue) : undefined}
    >
      <SelectDisplay color={selectedOption.color} label={selectedOption.label} />
    </span>
  );
};
