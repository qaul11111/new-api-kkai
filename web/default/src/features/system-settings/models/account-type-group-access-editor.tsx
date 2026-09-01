import { useCallback, useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ACCOUNT_TYPE_OPTIONS, type AccountType } from '@/lib/account-type'

import {
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { safeJsonParse } from '../utils/json-parser'
import type { GroupFormValues } from './group-ratio-form'

type AccountTypeGroupAccessEditorProps = {
  form: UseFormReturn<GroupFormValues>
  editMode: 'visual' | 'json'
  groupNames: string[]
}

export function AccountTypeGroupAccessEditor(
  props: AccountTypeGroupAccessEditorProps
) {
  const { t } = useTranslation()
  const usableGroups = props.form.watch('UserUsableGroups')
  const usableGroupDescriptions = useMemo(
    () =>
      safeJsonParse<Record<string, string>>(usableGroups, {
        fallback: {},
        silent: true,
      }),
    [usableGroups]
  )
  const accountTypeGroupMapping = safeJsonParse<
    Record<AccountType, Record<string, string>>
  >(props.form.watch('AccountTypeGroupMapping'), {
    fallback: { consumer: {}, business: {} },
    silent: true,
  })

  const setAccountTypeGroup = useCallback(
    (accountType: AccountType, group: string, enabled: boolean) => {
      const current = safeJsonParse<
        Record<AccountType, Record<string, string>>
      >(props.form.getValues('AccountTypeGroupMapping'), {
        fallback: { consumer: {}, business: {} },
        silent: true,
      })
      const next = {
        consumer: { ...current.consumer },
        business: { ...current.business },
      }
      if (enabled) {
        next[accountType][group] = usableGroupDescriptions[group] || group
      } else {
        delete next[accountType][group]
      }
      props.form.setValue(
        'AccountTypeGroupMapping',
        JSON.stringify(next, null, 2),
        { shouldDirty: true, shouldValidate: true }
      )
    },
    [props.form, usableGroupDescriptions]
  )

  return (
    <div className='space-y-4 rounded-lg border p-4'>
      <FormField
        control={props.form.control}
        name='AccountTypeSegmentationEnabled'
        render={({ field }) => (
          <SettingsSwitchItem>
            <SettingsSwitchContent>
              <FormLabel>{t('Account-type model access')}</FormLabel>
              <FormDescription>
                {t(
                  'When enabled, each account type can use only the selected model groups. Empty selections deny all model access.'
                )}
              </FormDescription>
            </SettingsSwitchContent>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </SettingsSwitchItem>
        )}
      />

      {props.editMode === 'visual' ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <div key={option.value} className='rounded-lg border p-4'>
              <div className='text-sm font-medium'>{t(option.labelKey)}</div>
              <div className='text-muted-foreground mt-1 text-xs'>
                {t('Allowed model groups')}
              </div>
              {props.groupNames.length > 0 ? (
                <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                  {props.groupNames.map((group) => (
                    <label
                      key={group}
                      className='flex items-center gap-2 rounded-md border px-3 py-2 text-sm'
                    >
                      <Checkbox
                        checked={Boolean(
                          accountTypeGroupMapping[option.value]?.[group]
                        )}
                        onCheckedChange={(checked) =>
                          setAccountTypeGroup(
                            option.value,
                            group,
                            checked === true
                          )
                        }
                      />
                      <span className='truncate'>{group}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className='text-muted-foreground mt-3 text-xs'>
                  {t(
                    'No model groups are configured yet. Add groups under selectable groups first.'
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <FormField
          control={props.form.control}
          name='AccountTypeGroupMapping'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Allowed model groups')}</FormLabel>
              <FormControl>
                <Textarea rows={10} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
