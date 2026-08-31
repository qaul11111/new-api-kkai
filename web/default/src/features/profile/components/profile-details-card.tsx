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
import { Loader2, UserRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { useAuthStore } from '@/stores/auth-store'

import type { UpdateUserRequest, UserProfile } from '../types'

type ProfileDetailsCardProps = {
  profile: UserProfile | null
  loading: boolean
  updating: boolean
  onUpdate: (data: UpdateUserRequest) => Promise<boolean>
}

export function ProfileDetailsCard({
  profile,
  loading,
  updating,
  onUpdate,
}: ProfileDetailsCardProps) {
  if (loading) {
    return (
      <div className='linkai-profile-form-skeleton space-y-5'>
        <Skeleton className='h-6 w-36' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-11 w-24' />
      </div>
    )
  }

  if (!profile) return null

  return (
    <ProfileDetailsForm
      key={`${profile.id}:${profile.display_name}`}
      profile={profile}
      updating={updating}
      onUpdate={onUpdate}
    />
  )
}

function ProfileDetailsForm(props: {
  profile: UserProfile
  updating: boolean
  onUpdate: (data: UpdateUserRequest) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const currentUser = useAuthStore((state) => state.auth.user)
  const setUser = useAuthStore((state) => state.auth.setUser)
  const [displayName, setDisplayName] = useState(
    props.profile.display_name || ''
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextDisplayName = displayName.trim()
    const updated = await props.onUpdate({ display_name: nextDisplayName })

    if (updated && currentUser) {
      setUser({ ...currentUser, display_name: nextDisplayName })
    }
  }

  const savedDisplayName = props.profile.display_name || ''
  const hasChanges = displayName.trim() !== savedDisplayName

  return (
    <TitledCard
      title={t('Basic Information')}
      description={t('Personal settings and profile management.')}
      icon={<UserRound className='h-4 w-4' />}
      iconTone='info'
      disableHoverEffect
    >
      <form className='linkai-profile-edit-form' onSubmit={handleSubmit}>
        <div className='linkai-profile-field'>
          <Label htmlFor='profile-username'>{t('Username')}</Label>
          <Input
            id='profile-username'
            value={props.profile.username}
            readOnly
            aria-readonly='true'
          />
        </div>

        <div className='linkai-profile-field'>
          <Label htmlFor='profile-display-name'>{t('Display Name')}</Label>
          <Input
            id='profile-display-name'
            value={displayName}
            maxLength={20}
            autoComplete='nickname'
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>

        <div className='linkai-profile-form-actions'>
          <Button type='submit' disabled={props.updating || !hasChanges}>
            {props.updating && <Loader2 className='h-4 w-4 animate-spin' />}
            {props.updating ? t('Saving...') : t('Save Changes')}
          </Button>
        </div>
      </form>
    </TitledCard>
  )
}
