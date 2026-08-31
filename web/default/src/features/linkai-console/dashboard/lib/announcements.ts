/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

For commercial licensing, please contact support@quantumnous.com
*/
import type { AnnouncementItem } from '@/features/dashboard/types'

export function isPricingAnnouncement(item: AnnouncementItem) {
  const source = `${item.type ?? ''} ${item.content ?? ''}`
  return /price|pricing|billing|quota|计费|价格|倍率/i.test(source)
}
