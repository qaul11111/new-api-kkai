/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TelegramLoginWidget } from '@/features/auth/components/telegram-login-widget'
import type { TelegramAuthPayload } from '@/features/auth/types'

import { bindTelegramAccount } from '../../api'

// ============================================================================
// Telegram Bind Dialog Component
// ============================================================================

interface TelegramBindDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  botName: string
  onSuccess: () => void
}

export function TelegramBindDialog({
  open,
  onOpenChange,
  botName,
  onSuccess,
}: TelegramBindDialogProps) {
  const { t } = useTranslation()
  const [isBinding, setIsBinding] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setIsBinding(false)
    onOpenChange(nextOpen)
  }

  const handleTelegramAuth = async (payload: TelegramAuthPayload) => {
    if (isBinding) return
    setIsBinding(true)
    try {
      const res = await bindTelegramAccount(payload)
      if (res.success) {
        toast.success(t('Telegram account bound successfully'))
        handleOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || t('Failed to bind Telegram account'))
      }
    } catch {
      toast.error(t('Failed to bind Telegram account'))
    } finally {
      setIsBinding(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('Bind Telegram Account')}
      description={t('Click the button below to bind your Telegram account')}
      contentClassName='sm:max-w-md'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
      <div className='space-y-4 py-4'>
        <Alert>
          <Send className='h-4 w-4' />
          <AlertDescription>
            {t(
              'Authorize the bot with your Telegram account to complete the binding.'
            )}
          </AlertDescription>
        </Alert>

        <div className='flex flex-col items-center justify-center gap-4 rounded-lg border p-6'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900'>
            <Send className='h-6 w-6 text-blue-600 dark:text-blue-400' />
          </div>

          <div className='text-center'>
            <p className='text-muted-foreground text-sm'>
              {t('Bot:')}{' '}
              <span className='font-mono font-semibold'>@{botName}</span>
            </p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {t(
                "After clicking the button, you'll be asked to authorize the bot"
              )}
            </p>
          </div>

          <div className='relative flex min-h-[40px] items-center justify-center'>
            {isBinding && (
              <Loader2 className='text-muted-foreground absolute h-5 w-5 animate-spin' />
            )}
            <div className={isBinding ? 'opacity-40' : undefined}>
              <TelegramLoginWidget
                botName={botName}
                onAuth={(payload) => void handleTelegramAuth(payload)}
              />
            </div>
          </div>
        </div>

        <p className='text-muted-foreground text-center text-xs'>
          {t('The binding will complete automatically after authorization')}
        </p>
      </div>
    </Dialog>
  )
}
