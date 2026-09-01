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
import type { SystemStatus } from '../types'

/**
 * Resolve the configured WeChat account QR code URL from system status.
 * Historical backends have exposed this under several different keys.
 */
export function resolveWeChatQrCodeUrl(status: SystemStatus | null): string {
  if (!status) return ''
  return (
    status.wechat_qrcode ||
    status.wechat_qr_code ||
    status.wechat_qrcode_image_url ||
    status.wechat_qr_code_image_url ||
    status.wechat_account_qrcode_image_url ||
    status.WeChatAccountQRCodeImageURL ||
    (status.data?.wechat_qrcode as string | undefined) ||
    (status.data?.WeChatAccountQRCodeImageURL as string | undefined) ||
    ''
  )
}
