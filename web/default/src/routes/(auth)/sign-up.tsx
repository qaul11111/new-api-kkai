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
import { createFileRoute, redirect } from '@tanstack/react-router'
import z from 'zod'

import { LinkAiSignUpPage } from '@/features/linkai-auth/sign-up'
import { useAuthStore } from '@/stores/auth-store'

const signUpSearchSchema = z.object({
  account_type: z.enum(['consumer', 'business']).optional().catch(undefined),
  aff: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/(auth)/sign-up')({
  validateSearch: signUpSearchSchema,
  component: SignUpRoute,
  beforeLoad: async () => {
    const { auth } = useAuthStore.getState()

    // 如果已经有用户信息，说明已登录，注册页对其无意义，跳转到 dashboard
    if (auth.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
})

function SignUpRoute() {
  const search = Route.useSearch()
  return <LinkAiSignUpPage initialAccountType={search.account_type} />
}
