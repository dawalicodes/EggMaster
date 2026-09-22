/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns the YYYY-MM-DD date string of a given Date object in the user's local timezone.
 * This prevents timezone offsets from shifting dates to the next or previous day.
 */
export function getLocalDateString(dateObj: Date = new Date()): string {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}
