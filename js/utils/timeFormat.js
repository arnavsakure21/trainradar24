/**
 * RailRadar – shared time-formatting helpers.
 * All data is stored in 24-hour "HH:MM" strings; conversion happens only at display time.
 */

/**
 * Convert a 24-hour "HH:MM" string to a 12-hour string with uppercase AM/PM,
 * no leading zero on the hour: "5:10 AM", "2:10 PM".
 *
 * @param {string} time24  e.g. "05:10" or "14:10"
 * @returns {string}       e.g. "5:10 AM"  or "2:10 PM"
 */
export function to12Hour(time24) {
  if (!time24 || time24 === '--:--') return '--:--';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;

  const ampm = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minStr = String(m).padStart(2, '0');
  return `${hour12}:${minStr} ${ampm}`;
}

/**
 * Format a 24-hour "HH:MM" time together with a date string,
 * optionally offset by a number of calendar days (for overnight journeys).
 *
 * Returns e.g. "Sat, 03 Oct 2026, 5:10 AM"
 *
 * @param {string} time24      "HH:MM" in 24-hour format
 * @param {string} dateStr     "YYYY-MM-DD"  (the base departure date)
 * @param {number} [dayOffset] 0 = same day, 1 = next day, etc. (default 0)
 * @returns {string}
 */
export function formatDateTime(time24, dateStr, dayOffset = 0) {
  if (!time24 || time24 === '--:--') return '--:--';

  // Parse date parts as local time to avoid UTC midnight shift
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day + dayOffset);

  const datePart = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);

  return `${datePart}, ${to12Hour(time24)}`;
}

/**
 * Given two 24-hour "HH:MM" times on the same notional day, return the number
 * of extra calendar days the arrival is beyond the departure (0 or 1+).
 * If arrivalTime <= departureTime in raw hours, we assume it crossed midnight.
 *
 * @param {string} departureTime  "HH:MM"
 * @param {string} arrivalTime    "HH:MM"
 * @returns {number}  0 or 1 (we only handle single midnight crossings here)
 */
export function overnightOffset(departureTime, arrivalTime) {
  if (!departureTime || !arrivalTime) return 0;
  const [dh, dm] = departureTime.split(':').map(Number);
  const [ah, am] = arrivalTime.split(':').map(Number);
  const depMins = dh * 60 + dm;
  const arrMins = ah * 60 + am;
  return arrMins < depMins ? 1 : 0;
}
