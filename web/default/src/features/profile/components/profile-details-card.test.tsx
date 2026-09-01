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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import type { UserProfile } from '../types'
import { ProfileDetailsCard } from './profile-details-card'

const profile: UserProfile = {
  id: 2,
  username: 'ui-user',
  display_name: 'UI User',
  role: 1,
  group: 'default',
  quota: 0,
  used_quota: 0,
  request_count: 0,
  status: 1,
  aff_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  created_time: 1_725_000_000,
}

describe('ProfileDetailsCard', () => {
  test('keeps the username read-only and saves a changed display name', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(true)

    render(
      <ProfileDetailsCard
        profile={profile}
        loading={false}
        updating={false}
        onUpdate={onUpdate}
      />
    )

    expect(screen.getByLabelText('Username')).toHaveAttribute('readonly')
    const displayName = screen.getByLabelText('Display Name')
    const saveButton = screen.getByRole('button', { name: 'Save Changes' })
    expect(saveButton).toBeDisabled()

    await user.clear(displayName)
    await user.type(displayName, '  LinkAI User  ')
    expect(saveButton).toBeEnabled()
    await user.click(saveButton)

    expect(onUpdate).toHaveBeenCalledWith({ display_name: 'LinkAI User' })
  })
})
