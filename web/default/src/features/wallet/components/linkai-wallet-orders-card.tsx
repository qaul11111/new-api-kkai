/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { ArrowRight, ReceiptText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface LinkAiWalletOrdersCardProps {
  onOpenBilling: () => void
}

export function LinkAiWalletOrdersCard({
  onOpenBilling,
}: LinkAiWalletOrdersCardProps) {
  const { t } = useTranslation()

  return (
    <Card data-card-hover='false' className='linkai-wallet-orders-card py-0'>
      <CardContent className='linkai-wallet-orders-content'>
        <div className='linkai-wallet-orders-copy'>
          <span className='linkai-wallet-orders-icon' aria-hidden='true'>
            <ReceiptText />
          </span>
          <div>
            <h3>{t('Billing & Payment')}</h3>
            <p>
              {t('View your topup transaction records and payment history')}
            </p>
          </div>
        </div>
        <Button variant='outline' onClick={onOpenBilling}>
          {t('Order History')}
          <ArrowRight aria-hidden='true' />
        </Button>
      </CardContent>
    </Card>
  )
}
