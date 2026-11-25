// Growth OS CRM: exposes a field's type as a data attribute so the shell CSS can
// right-align amounts and use tabular numbers in tables.
export const growthOsFieldTypeById = (
  objectMetadataItem: { fields: { id: string; type: string }[] },
  fieldMetadataItemId: string,
): string | undefined =>
  objectMetadataItem.fields.find((field) => field.id === fieldMetadataItemId)
    ?.type;
