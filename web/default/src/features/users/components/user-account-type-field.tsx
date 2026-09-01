import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/account-type'

import type { UserFormValues } from '../lib'

type UserAccountTypeFieldProps = {
  form: UseFormReturn<UserFormValues>
}

export function UserAccountTypeField(props: UserAccountTypeFieldProps) {
  const { t } = useTranslation()

  return (
    <FormField
      control={props.form.control}
      name='account_type'
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('Account type')}</FormLabel>
          <Select
            items={ACCOUNT_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            onValueChange={field.onChange}
            value={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t('Select account type')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormDescription>
            {t('Controls which model groups this user can access')}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
