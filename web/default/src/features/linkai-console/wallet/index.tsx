/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { Wallet } from '@/features/wallet'

import './linkai-wallet.css'

export function LinkAiWallet(props: { initialShowHistory?: boolean }) {
  return (
    <Wallet initialShowHistory={props.initialShowHistory} variant='linkai' />
  )
}
