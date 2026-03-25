/** Generates a short unique ID using timestamp + random suffix. */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/** Clamps a number between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Converts HH:mm time string to minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Converts minutes since midnight to HH:mm string. */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Calculates sleep duration in minutes, handling overnight sleep. */
export function calcSleepDuration(
  sleepDate: string,
  sleepTime: string,
  wakeDate: string,
  wakeTime: string
): number {
  const sleep = new Date(`${sleepDate}T${sleepTime}:00`)
  const wake = new Date(`${wakeDate}T${wakeTime}:00`)
  return Math.round((wake.getTime() - sleep.getTime()) / 60_000)
}

/** Formats minutes as "Xh Ym". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
