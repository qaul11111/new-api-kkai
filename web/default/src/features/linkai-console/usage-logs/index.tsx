/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { NavGroup } from '@/components/layout/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CacheStatsDialog } from '@/features/system-settings/general/channel-affinity/cache-stats-dialog'
import { CommonLogsStats } from '@/features/usage-logs/components/common-logs-stats'
import { UserInfoDialog } from '@/features/usage-logs/components/dialogs/user-info-dialog'
import {
  type LogsViewScope,
  UsageLogsProvider,
  useLogsViewScope,
  useUsageLogsContext,
} from '@/features/usage-logs/components/usage-logs-provider'
import { UsageLogsTable } from '@/features/usage-logs/components/usage-logs-table'
import {
  isUsageLogsSectionId,
  USAGE_LOGS_DEFAULT_SECTION,
  type UsageLogsSectionId,
} from '@/features/usage-logs/section-registry'
import { useSidebarConfig } from '@/hooks/use-sidebar-config'

import './linkai-usage-logs.css'

const route = getRouteApi('/_authenticated/usage-logs/$section')
const TASK_LOG_SECTIONS = ['drawing', 'task'] as const

const SECTION_META: Record<UsageLogsSectionId, { titleKey: string }> = {
  common: { titleKey: 'Common Logs' },
  drawing: { titleKey: 'Drawing Logs' },
  task: { titleKey: 'Task Logs' },
}

function LinkAiUsageLogsContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = route.useParams()
  const activeCategory: UsageLogsSectionId =
    params.section && isUsageLogsSectionId(params.section)
      ? params.section
      : USAGE_LOGS_DEFAULT_SECTION
  const {
    selectedUserId,
    userInfoDialogOpen,
    setUserInfoDialogOpen,
    affinityTarget,
    affinityDialogOpen,
    setAffinityDialogOpen,
  } = useUsageLogsContext()
  const { canManageScope, viewScope, setViewScope } = useLogsViewScope()
  const tabNavGroups = useMemo<NavGroup[]>(
    () => [
      {
        title: 'Task Logs',
        items: TASK_LOG_SECTIONS.map((section) => ({
          title: SECTION_META[section].titleKey,
          url: `/usage-logs/${section}`,
        })),
      },
    ],
    []
  )
  const filteredTabGroups = useSidebarConfig(tabNavGroups)
  const visibleSections = useMemo(
    () =>
      (filteredTabGroups[0]?.items ?? [])
        .map((item) => {
          if (!('url' in item) || typeof item.url !== 'string') return null
          return item.url.split('/').pop() ?? null
        })
        .filter((section): section is UsageLogsSectionId =>
          Boolean(section && isUsageLogsSectionId(section))
        ),
    [filteredTabGroups]
  )

  const handleSectionChange = useCallback(
    (section: string) => {
      void navigate({
        to: '/usage-logs/$section',
        params: { section: section as UsageLogsSectionId },
      })
    },
    [navigate]
  )

  const handleViewScopeChange = useCallback(
    (scope: string) => {
      if (scope === 'all' || scope === 'self') {
        setViewScope(scope as LogsViewScope)
      }
    },
    [setViewScope]
  )

  const pageMeta =
    activeCategory === 'common' ? SECTION_META.common : SECTION_META.task
  const pageTitle = t(pageMeta.titleKey)
  const showTaskSwitcher =
    activeCategory !== 'common' && visibleSections.length > 1

  return (
    <>
      <main className='linkai-console-usage-logs min-h-0 flex-1 overflow-y-auto bg-black'>
        <div className='linkai-log-page-content'>
          <div className='linkai-log-heading'>
            <h1>{pageTitle}</h1>
            {canManageScope ? (
              <Tabs value={viewScope} onValueChange={handleViewScopeChange}>
                <TabsList>
                  <TabsTrigger value='all'>{t('All')}</TabsTrigger>
                  <TabsTrigger value='self'>{t('Only Mine')}</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}
          </div>

          {showTaskSwitcher ? (
            <Tabs value={activeCategory} onValueChange={handleSectionChange}>
              <TabsList className='linkai-log-section-tabs'>
                {visibleSections.map((section) => (
                  <TabsTrigger key={section} value={section}>
                    {t(SECTION_META[section].titleKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          {activeCategory === 'common' ? (
            <CommonLogsStats variant='linkai-cards' />
          ) : null}

          <section className='linkai-log-table-card' aria-label={pageTitle}>
            <UsageLogsTable logCategory={activeCategory} variant='linkai' />
          </section>
        </div>
      </main>

      <UserInfoDialog
        userId={selectedUserId}
        open={userInfoDialogOpen}
        onOpenChange={setUserInfoDialogOpen}
      />
      <CacheStatsDialog
        open={affinityDialogOpen}
        onOpenChange={setAffinityDialogOpen}
        target={
          affinityTarget
            ? {
                rule_name: affinityTarget.rule_name || '',
                using_group:
                  affinityTarget.using_group ||
                  affinityTarget.selected_group ||
                  '',
                key_hint: affinityTarget.key_hint || '',
                key_fp: affinityTarget.key_fp || '',
              }
            : null
        }
      />
    </>
  )
}

export function LinkAiUsageLogs() {
  return (
    <UsageLogsProvider>
      <LinkAiUsageLogsContent />
    </UsageLogsProvider>
  )
}
