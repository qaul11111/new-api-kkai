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

import { ResetPasswordConfirm } from '@/features/auth/reset-password-confirm'

const resetSearchSchema = z.object({
  email: z.string().optional().catch(undefined),
  token: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/(auth)/reset')({
  validateSearch: resetSearchSchema,
  beforeLoad: ({ search }) => {
    // Legacy `/reset` doubles as the "start password recovery" entry point:
    // only a complete email+token pair renders the confirmation form.
    if (!search.email || !search.token) {
      throw redirect({ to: '/forgot-password', replace: true })
    }
  },
  component: ResetPassword,
})

function ResetPassword() {
  const { email, token } = Route.useSearch()
  return <ResetPasswordConfirm email={email} token={token} />
}
