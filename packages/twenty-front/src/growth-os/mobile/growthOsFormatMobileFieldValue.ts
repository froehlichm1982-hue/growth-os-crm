import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type AnyRecord = Record<string, unknown>;

const asRecord = (value: unknown): AnyRecord | null =>
  typeof value === 'object' && value !== null ? (value as AnyRecord) : null;

const nonEmpty = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const fullName = (value: unknown) => {
  const name = asRecord(value);

  if (!name) {
    return null;
  }

  return nonEmpty(
    [name.firstName, name.lastName]
      .filter((part) => typeof part === 'string')
      .join(' '),
  );
};

// Display name of a related record: companies have a text `name`, people a
// FULL_NAME object, most others a `name` or `title`.
const relatedRecordLabel = (value: unknown) => {
  const related = asRecord(value);

  if (!related) {
    return null;
  }

  return (
    nonEmpty(related.name) ?? fullName(related.name) ?? nonEmpty(related.title)
  );
};

// Compact, read-only text for the 390px record list. Returns null for empty
// values and for types that do not read well in one short line.
export const growthOsFormatMobileFieldValue = (
  field: Pick<FieldMetadataItem, 'type' | 'options'>,
  value: unknown,
  locale?: string,
): string | null => {
  if (!isDefined(value)) {
    return null;
  }

  switch (field.type) {
    case FieldMetadataType.TEXT:
    case FieldMetadataType.UUID:
      return nonEmpty(value);
    case FieldMetadataType.NUMBER:
    case FieldMetadataType.NUMERIC:
      return typeof value === 'number' || typeof value === 'string'
        ? new Intl.NumberFormat(locale).format(Number(value))
        : null;
    case FieldMetadataType.BOOLEAN:
      return value === true ? 'Yes' : null;
    case FieldMetadataType.SELECT: {
      const option = field.options?.find((item) => item.value === value);

      return option?.label ?? nonEmpty(value);
    }
    case FieldMetadataType.MULTI_SELECT:
      return Array.isArray(value) && value.length > 0
        ? value
            .map(
              (item) =>
                field.options?.find((option) => option.value === item)
                  ?.label ?? String(item),
            )
            .join(', ')
        : null;
    case FieldMetadataType.CURRENCY: {
      const currency = asRecord(value);
      const micros = currency?.amountMicros;
      const code = nonEmpty(currency?.currencyCode);

      if (!isDefined(micros) || micros === '' || !code) {
        return null;
      }

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(Number(micros) / 1_000_000);
    }
    case FieldMetadataType.DATE:
    case FieldMetadataType.DATE_TIME: {
      const date = typeof value === 'string' ? new Date(value) : null;

      return date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).format(date)
        : null;
    }
    case FieldMetadataType.LINKS:
      return (
        nonEmpty(asRecord(value)?.primaryLinkUrl)
          ?.replace(/^https?:\/\//, '')
          .replace(/\/$/, '') ?? null
      );
    case FieldMetadataType.EMAILS:
      return nonEmpty(asRecord(value)?.primaryEmail);
    case FieldMetadataType.PHONES: {
      const phone = asRecord(value);
      const number = nonEmpty(phone?.primaryPhoneNumber);

      return number
        ? [nonEmpty(phone?.primaryPhoneCallingCode), number]
            .filter(Boolean)
            .join(' ')
        : null;
    }
    case FieldMetadataType.FULL_NAME:
      return fullName(value);
    case FieldMetadataType.ADDRESS: {
      const address = asRecord(value);

      return (
        [nonEmpty(address?.addressCity), nonEmpty(address?.addressCountry)]
          .filter(Boolean)
          .join(', ') || null
      );
    }
    case FieldMetadataType.RELATION:
      return relatedRecordLabel(value);
    default:
      return null;
  }
};
