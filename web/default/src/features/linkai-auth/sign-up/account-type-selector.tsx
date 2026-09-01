import { Building2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  ACCOUNT_TYPE,
  ACCOUNT_TYPE_OPTIONS,
  type AccountType,
} from '@/lib/account-type'
import { cn } from '@/lib/utils'

type LinkAiAccountTypeSelectorProps = {
  value: AccountType
  onChange: (value: AccountType) => void
}

export function LinkAiAccountTypeSelector(
  props: LinkAiAccountTypeSelectorProps
) {
  const { t } = useTranslation()

  return (
    <fieldset className='mt-6'>
      <legend className='mb-2 text-sm font-medium text-white'>
        {t('Choose account type')}
      </legend>
      <div className='grid grid-cols-2 gap-3' role='radiogroup'>
        {ACCOUNT_TYPE_OPTIONS.map((option) => {
          const selected = props.value === option.value
          const Icon =
            option.value === ACCOUNT_TYPE.BUSINESS ? Building2 : UserRound

          return (
            <button
              key={option.value}
              type='button'
              role='radio'
              aria-checked={selected}
              onClick={() => props.onChange(option.value)}
              className={cn(
                'flex min-h-[66px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-[#7258ce] focus-visible:outline-none',
                selected
                  ? 'border-[#7258ce] bg-[#211a31] shadow-[0_0_0_1px_rgba(114,88,206,0.25)]'
                  : 'border-[#2a2a2a] bg-[#151515] hover:border-[#4a3d70]'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  selected
                    ? 'bg-[#7258ce] text-white'
                    : 'bg-[#242424] text-[#aaa]'
                )}
              >
                <Icon className='h-4 w-4' aria-hidden='true' />
              </span>
              <span className='min-w-0'>
                <span className='block text-sm font-medium text-white'>
                  {t(option.labelKey)}
                </span>
                <span className='mt-0.5 block text-xs leading-4 text-[#929292]'>
                  {t(option.descriptionKey)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
