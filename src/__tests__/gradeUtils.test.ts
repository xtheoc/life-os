import { describe, it, expect } from 'vitest'
import { norm20, courseStats, ueStats, semesterStats, yearStats } from '../lib/gradeUtils'
import type { UE, Course, Grade } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ue1: UE = { id: 'ue1', name: 'Sciences', code: 'UE-SCI', credits: 6, semester: 1 }
const ue2: UE = { id: 'ue2', name: 'Langues', code: 'UE-LV', credits: 6, semester: 2 }

const course: Course = {
  id: 'c1',
  ueId: 'ue1',
  name: 'Maths',
  code: 'MATH101',
  coefficient: 1,
  continuousWeight: 0.4,
  finalWeight: 0.6,
  color: '#3b82f6',
}

const course2: Course = {
  id: 'c2',
  ueId: 'ue1',
  name: 'Physique',
  code: 'PHY101',
  coefficient: 1,
  continuousWeight: 0.5,
  finalWeight: 0.5,
  color: '#a855f7',
}

const course3: Course = {
  id: 'c3',
  ueId: 'ue2',
  name: 'Anglais',
  code: 'ANG101',
  coefficient: 1,
  continuousWeight: 0.6,
  finalWeight: 0.4,
  color: '#f59e0b',
}

const ccGrade = (score: number, maxScore = 20, courseId = 'c1'): Grade => ({
  id: `g-${Math.random()}`,
  courseId,
  title: 'CC',
  score,
  maxScore,
  category: 'continuous',
  date: '2026-01-10',
})

const finalGrade = (score: number, maxScore = 20, courseId = 'c1'): Grade => ({
  id: `g-${Math.random()}`,
  courseId,
  title: 'Final',
  score,
  maxScore,
  category: 'final',
  date: '2026-01-20',
})

// ─── norm20 ───────────────────────────────────────────────────────────────────

describe('norm20', () => {
  it('converts score/max to /20 scale', () => {
    expect(norm20(14, 20)).toBe(14)
    expect(norm20(10, 20)).toBe(10)
    expect(norm20(15, 30)).toBe(10)
    expect(norm20(7, 10)).toBe(14)
  })

  it('returns 0 when maxScore is 0', () => {
    expect(norm20(5, 0)).toBe(0)
  })

  it('handles perfect score', () => {
    expect(norm20(20, 20)).toBe(20)
    expect(norm20(30, 30)).toBe(20)
  })
})

// ─── courseStats ──────────────────────────────────────────────────────────────

describe('courseStats', () => {
  it('returns nulls when no grades', () => {
    const s = courseStats(course, [])
    expect(s.ccAvg).toBeNull()
    expect(s.finalAvg).toBeNull()
    expect(s.actual).toBeNull()
    expect(s.predicted).toBeNull()
    expect(s.hasFinal).toBe(false)
    expect(s.ccCount).toBe(0)
  })

  it('computes ccAvg correctly from multiple CC grades', () => {
    const grades = [ccGrade(12), ccGrade(16), ccGrade(14)]
    const s = courseStats(course, grades)
    expect(s.ccAvg).toBeCloseTo(14)
    expect(s.ccCount).toBe(3)
    expect(s.hasFinal).toBe(false)
  })

  it('predicts = ccAvg when no final taken (assumes final ≈ cc)', () => {
    const grades = [ccGrade(10)]
    const s = courseStats(course, grades)
    // predicted = ccAvg * 0.4 + ccAvg * 0.6 = ccAvg
    expect(s.predicted).toBeCloseTo(10)
    expect(s.actual).toBeNull()
  })

  it('computes actual when final is taken', () => {
    const grades = [ccGrade(12), finalGrade(16)]
    const s = courseStats(course, grades)
    // actual = 12 * 0.4 + 16 * 0.6 = 4.8 + 9.6 = 14.4
    expect(s.actual).toBeCloseTo(14.4)
    expect(s.predicted).toBeCloseTo(14.4)
    expect(s.hasFinal).toBe(true)
  })

  it('normalises non-/20 grades before computing average', () => {
    // 15/30 = 10/20
    const grades = [ccGrade(15, 30)]
    const s = courseStats(course, grades)
    expect(s.ccAvg).toBeCloseTo(10)
  })

  it('computes targetFinalForCourse (score needed to reach 10/20 in course)', () => {
    // ccAvg = 8, continuousWeight = 0.4, finalWeight = 0.6
    // target = (10 - 8 * 0.4) / 0.6 = (10 - 3.2) / 0.6 = 11.33...
    const grades = [ccGrade(8)]
    const s = courseStats(course, grades)
    expect(s.targetFinalForCourse).toBeCloseTo(11.33, 1)
  })

  it('only counts grades belonging to the course', () => {
    const otherGrade: Grade = { ...ccGrade(20), courseId: 'c-other' }
    const s = courseStats(course, [otherGrade, ccGrade(10)])
    expect(s.ccCount).toBe(1)
    expect(s.ccAvg).toBeCloseTo(10)
  })
})

// ─── ueStats ──────────────────────────────────────────────────────────────────

describe('ueStats', () => {
  it('returns null avg when no grades exist', () => {
    const s = ueStats(ue1, [course, course2], [])
    expect(s.avg).toBeNull()
    expect(s.predicted).toBeNull()
    expect(s.validated).toBe(false)
    expect(s.credits).toBe(6)
  })

  it('returns null for empty course list', () => {
    const s = ueStats(ue1, [], [])
    expect(s.avg).toBeNull()
    expect(s.predicted).toBeNull()
  })

  it('computes predicted using course coefficients', () => {
    // Both courses have coefficient 1, ccAvg 8 and 12 respectively
    const grades: Grade[] = [ccGrade(8, 20, 'c1'), ccGrade(12, 20, 'c2')]
    const s = ueStats(ue1, [course, course2], grades)
    // predicted c1 = 8, predicted c2 = 12 → UE = (8*1 + 12*1) / 2 = 10
    expect(s.predicted).toBeCloseTo(10)
  })

  it('validates when predicted >= 10', () => {
    const grades: Grade[] = [ccGrade(10, 20, 'c1')]
    const s = ueStats(ue1, [course], grades)
    expect(s.validated).toBe(true)
  })

  it('does not validate when predicted < 10', () => {
    const grades: Grade[] = [ccGrade(9, 20, 'c1')]
    const s = ueStats(ue1, [course], grades)
    expect(s.validated).toBe(false)
  })
})

// ─── semesterStats ────────────────────────────────────────────────────────────

describe('semesterStats', () => {
  it('returns null for empty semester', () => {
    const s = semesterStats(1, [], [], [])
    expect(s.avg).toBeNull()
    expect(s.predicted).toBeNull()
    expect(s.totalCredits).toBe(0)
  })

  it('computes weighted average by UE credits', () => {
    // ue1 (6 ECTS, S1) with course: ccAvg 14
    const grades: Grade[] = [ccGrade(14, 20, 'c1')]
    const s = semesterStats(1, [ue1], [course], grades)
    // UE predicted ≈ 14 → semester predicted ≈ 14
    expect(s.predicted).toBeCloseTo(14)
    expect(s.totalCredits).toBe(6)
  })

  it('only includes UEs in the matching semester', () => {
    // ue2 is semester 2, so semester 1 should ignore it
    const grades: Grade[] = [ccGrade(14, 20, 'c3')]
    const s1 = semesterStats(1, [ue1, ue2], [course, course2, course3], grades)
    // No grades for ue1 courses → predicted null for s1
    expect(s1.predicted).toBeNull()
    const s2 = semesterStats(2, [ue1, ue2], [course, course2, course3], grades)
    expect(s2.predicted).toBeCloseTo(14)
  })
})

// ─── yearStats ────────────────────────────────────────────────────────────────

describe('yearStats', () => {
  it('returns null predicted when no grades', () => {
    const y = yearStats([ue1, ue2], [course, course3], [])
    expect(y.predicted).toBeNull()
    expect(y.validated).toBe(false)
  })

  it('combines S1 and S2 by credits', () => {
    // ue1 S1 6cr, ue2 S2 6cr, same avg 12 → year = 12
    const grades: Grade[] = [ccGrade(12, 20, 'c1'), ccGrade(12, 20, 'c3')]
    const y = yearStats([ue1, ue2], [course, course3], grades)
    expect(y.predicted).toBeCloseTo(12)
  })

  it('validates when predicted >= 10 via inter-semester compensation', () => {
    // S1 avg = 6, S2 avg = 14 → year = (6*6 + 14*6) / 12 = 10
    const grades: Grade[] = [ccGrade(6, 20, 'c1'), ccGrade(14, 20, 'c3')]
    const y = yearStats([ue1, ue2], [course, course3], grades)
    expect(y.predicted).toBeCloseTo(10)
    expect(y.validated).toBe(true)
  })
})
