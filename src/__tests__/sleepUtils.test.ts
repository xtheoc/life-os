import { describe, it, expect } from 'vitest'
import { calcSleepDuration, formatDuration } from '../lib/utils'

// ─── calcSleepDuration ────────────────────────────────────────────────────────

describe('calcSleepDuration', () => {
  it('calculates same-night duration', () => {
    expect(calcSleepDuration('2026-01-01', '22:00', '2026-01-02', '06:00')).toBe(480)
  })

  it('handles early bedtime crossing midnight', () => {
    // Sleep at 23:30, wake at 07:30 next day
    expect(calcSleepDuration('2026-01-01', '23:30', '2026-01-02', '07:30')).toBe(480)
  })

  it('handles wake and sleep on the same date (rare)', () => {
    // Sleep at 01:00, wake at 09:00 same calendar day (edge case — same day)
    expect(calcSleepDuration('2026-01-01', '01:00', '2026-01-01', '09:00')).toBe(480)
  })

  it('returns negative/zero for invalid ranges', () => {
    // Wake before sleep on same date — invalid
    const dur = calcSleepDuration('2026-01-01', '10:00', '2026-01-01', '08:00')
    expect(dur).toBeLessThanOrEqual(0)
  })

  it('handles very late night (3am wake)', () => {
    expect(calcSleepDuration('2026-01-01', '00:30', '2026-01-01', '03:00')).toBe(150)
  })
})

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats whole hours without minutes', () => {
    expect(formatDuration(480)).toBe('8h')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(495)).toBe('8h 15m')
  })

  it('formats minutes only when < 1 hour', () => {
    expect(formatDuration(45)).toBe('45m')
  })

  it('formats zero as minutes', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('formats 7.5 hours correctly', () => {
    expect(formatDuration(450)).toBe('7h 30m')
  })
})
