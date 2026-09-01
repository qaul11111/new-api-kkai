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
/**
 * Get message content styles based on role
 * Encapsulates styling logic for user and assistant messages
 */
export function getMessageContentStyles() {
  return [
    // LinkAI playground uses compact alternating bubbles for both roles.
    'group-[.is-assistant]:w-fit',
    'group-[.is-assistant]:max-w-[85%]',
    'group-[.is-user]:w-fit',

    'rounded-[26px]',
    'border-0',
    'bg-[#262626]',
    'px-5',
    'py-3',
    'text-[#eeeeee]',

    'group-[.is-assistant]:[font-family:var(--font-body)]',

    'text-sm',
    'leading-6',
    'break-words',
    'whitespace-pre-wrap',
    'sm:text-base',

    'group-[.is-user]:max-w-[85%]',
    'sm:group-[.is-user]:max-w-[70%]',
    'sm:group-[.is-assistant]:max-w-[70%]',
  ].join(' ')
}
