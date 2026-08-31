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
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type WeChatLoginDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  qrCodeUrl: string
  isSubmitting: boolean
  onSubmit: (code: string) => void | Promise<void>
  disabled?: boolean
}

/**
 * WeChat QR-code login dialog: shows the configured official-account QR code
 * and submits the verification code the user received from it.
 */
export function WeChatLoginDialog({
  open,
  onOpenChange,
  qrCodeUrl,
  isSubmitting,
  onSubmit,
  disabled = false,
}: WeChatLoginDialogProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setCode('')
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    const trimmed = code.trim()
    if (!trimmed) {
      toast.error(t('Please enter the verification code'))
      return
    }
    void onSubmit(trimmed)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('WeChat sign in')}
      description={t(
        'Scan the QR code to follow the official account and reply with “验证码” to receive your verification code.'
      )}
      contentClassName='max-w-sm'
      headerClassName='text-left'
      contentHeight='auto'
      bodyClassName='space-y-4'
      footer={
        <>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('Cancel')}
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitting || !code.trim() || disabled}
            className='gap-2'
          >
            {isSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
            {t('Confirm')}
          </Button>
        </>
      }
    >
      {qrCodeUrl ? (
        <div className='flex justify-center'>
          <img
            src={qrCodeUrl}
            alt={t('WeChat login QR code')}
            className='h-40 w-40 rounded-md border object-contain'
          />
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>
          {t('QR code is not configured. Please contact support.')}
        </p>
      )}
      <div className='grid gap-2'>
        <Label htmlFor='wechat-login-code'>{t('Verification code')}</Label>
        <Input
          id='wechat-login-code'
          placeholder={t('Enter the verification code')}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete='one-time-code'
        />
      </div>
    </Dialog>
  )
}
