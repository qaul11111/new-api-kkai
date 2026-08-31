/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { Bell, Link2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckinCalendarCard } from '@/features/profile/components/checkin-calendar-card'
import { LanguagePreferencesCard } from '@/features/profile/components/language-preferences-card'
import { PasskeyCard } from '@/features/profile/components/passkey-card'
import { ProfileDetailsCard } from '@/features/profile/components/profile-details-card'
import { ProfileHeader } from '@/features/profile/components/profile-header'
import { ProfileSecurityCard } from '@/features/profile/components/profile-security-card'
import { SidebarModulesCard } from '@/features/profile/components/sidebar-modules-card'
import { AccountBindingsTab } from '@/features/profile/components/tabs/account-bindings-tab'
import { NotificationTab } from '@/features/profile/components/tabs/notification-tab'
import { TwoFACard } from '@/features/profile/components/two-fa-card'
import { useProfile } from '@/features/profile/hooks'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

import './linkai-profile.css'

type ProfileSection =
  | 'bindings'
  | 'notifications'
  | 'profile'
  | 'security'
  | 'preferences'

function ProfilePanel(props: {
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className='linkai-profile-panel'>
      <header className='linkai-profile-panel-header'>
        <span className='linkai-profile-panel-icon'>{props.icon}</span>
        <div>
          <h2>{props.title}</h2>
          <p>{props.description}</p>
        </div>
      </header>
      <div className='linkai-profile-panel-body'>{props.children}</div>
    </section>
  )
}

export function LinkAiProfile() {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<ProfileSection>('bindings')
  const { profile, loading, updating, refreshProfile, updateProfile } =
    useProfile()
  const { status } = useStatus()
  const permissions = useAuthStore((state) => state.auth.user?.permissions)

  const checkinEnabled = status?.checkin_enabled === true
  const turnstileEnabled = !!(
    status?.turnstile_check && status?.turnstile_site_key
  )
  const turnstileSiteKey = status?.turnstile_site_key || ''
  const canConfigureSidebar = permissions?.sidebar_settings !== false

  const sections: {
    value: ProfileSection
    label: string
  }[] = [
    { value: 'bindings', label: t('Account Bindings') },
    { value: 'notifications', label: t('Notifications') },
    { value: 'profile', label: t('Profile') },
    { value: 'security', label: t('Security') },
    { value: 'preferences', label: t('Preferences') },
  ]

  return (
    <main className='linkai-console-profile min-h-0 flex-1 overflow-y-auto bg-black'>
      <div className='linkai-profile-page-content'>
        <h1 className='linkai-profile-heading'>{t('Profile')}</h1>

        <CardStaggerContainer className='linkai-profile-stack'>
          <CardStaggerItem>
            <ProfileHeader
              profile={profile}
              loading={loading}
              variant='linkai'
            />
          </CardStaggerItem>

          <CardStaggerItem>
            <Tabs
              value={activeSection}
              onValueChange={(value) =>
                setActiveSection(value as ProfileSection)
              }
              className='linkai-profile-tabs'
            >
              <div className='linkai-profile-tabs-scroll'>
                <TabsList aria-label={t('Profile')}>
                  {sections.map((section) => (
                    <TabsTrigger key={section.value} value={section.value}>
                      {section.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value='bindings'>
                <div className='linkai-profile-content-grid'>
                  <ProfilePanel
                    title={t('Account Bindings')}
                    description={t(
                      'Configure your account preferences and integrations'
                    )}
                    icon={<Link2 />}
                  >
                    <AccountBindingsTab
                      profile={profile}
                      onUpdate={refreshProfile}
                    />
                  </ProfilePanel>
                  <PasskeyCard loading={loading} />
                </div>
              </TabsContent>

              <TabsContent value='notifications'>
                <ProfilePanel
                  title={t('Notifications')}
                  description={t('Configure your account behavior preferences')}
                  icon={<Bell />}
                >
                  <NotificationTab
                    profile={profile}
                    onUpdate={refreshProfile}
                  />
                </ProfilePanel>
              </TabsContent>

              <TabsContent value='profile'>
                <ProfileDetailsCard
                  profile={profile}
                  loading={loading}
                  updating={updating}
                  onUpdate={updateProfile}
                />
              </TabsContent>

              <TabsContent value='security'>
                <div className='linkai-profile-content-grid'>
                  <div className='linkai-profile-content-column'>
                    <TwoFACard loading={loading} />
                  </div>
                  <div className='linkai-profile-content-column'>
                    <ProfileSecurityCard profile={profile} loading={loading} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='preferences'>
                <div className='linkai-profile-content-grid'>
                  <div className='linkai-profile-content-column'>
                    <LanguagePreferencesCard
                      profile={profile}
                      onProfileUpdate={refreshProfile}
                    />
                    {checkinEnabled && (
                      <CheckinCalendarCard
                        checkinEnabled={checkinEnabled}
                        turnstileEnabled={turnstileEnabled}
                        turnstileSiteKey={turnstileSiteKey}
                      />
                    )}
                  </div>
                  {canConfigureSidebar && (
                    <div className='linkai-profile-content-column'>
                      <SidebarModulesCard />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardStaggerItem>
        </CardStaggerContainer>
      </div>
    </main>
  )
}
