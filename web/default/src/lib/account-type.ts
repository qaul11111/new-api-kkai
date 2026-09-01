export const ACCOUNT_TYPE = {
  CONSUMER: 'consumer',
  BUSINESS: 'business',
} as const

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE]

export const ACCOUNT_TYPE_VALUES = [
  ACCOUNT_TYPE.CONSUMER,
  ACCOUNT_TYPE.BUSINESS,
] as const

export const ACCOUNT_TYPE_OPTIONS = [
  {
    value: ACCOUNT_TYPE.CONSUMER,
    labelKey: 'Personal account (C-side)',
    descriptionKey: 'For individual exploration and everyday use',
  },
  {
    value: ACCOUNT_TYPE.BUSINESS,
    labelKey: 'Business account (B-side)',
    descriptionKey: 'For professional, team, and business use',
  },
] as const

export function getAccountTypeLabelKey(accountType: AccountType) {
  return accountType === ACCOUNT_TYPE.BUSINESS
    ? 'Business account (B-side)'
    : 'Personal account (C-side)'
}
