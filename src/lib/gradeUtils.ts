import type { UE, Course, Grade } from '../types'

// ─── Per-course stats ─────────────────────────────────────────────────────────

export interface CourseStats {
  ccAvg: number | null       // average of CC grades, normalised /20
  finalAvg: number | null    // average of final grade(s), normalised /20
  actual: number | null      // weighted average when final is taken
  predicted: number | null   // best estimate (assumes final ≈ ccAvg when not yet taken)
  /** Grade needed on the final to reach 10/20 in this course alone */
  targetFinalForCourse: number | null
  /** Grade needed on the final so that the UE average reaches 10/20 through compensation */
  targetFinalForUE: number | null
  hasFinal: boolean
  ccCount: number
}

export function norm20(score: number, maxScore: number): number {
  return maxScore > 0 ? (score / maxScore) * 20 : 0
}

export function courseStats(
  course: Course,
  grades: Grade[],
  allCoursesInUE?: Course[],
  allGrades?: Grade[],
  target: number = 10,
): CourseStats {
  const all = grades.filter(g => g.courseId === course.id)
  const cc  = all.filter(g => g.category === 'continuous')
  const fin = all.filter(g => g.category === 'final')

  const avg = (gs: Grade[]) =>
    gs.length > 0
      ? gs.reduce((s, g) => s + norm20(g.score, g.maxScore), 0) / gs.length
      : null

  const ccAvg    = avg(cc)
  const finalAvg = avg(fin)

  const actual =
    ccAvg !== null && finalAvg !== null
      ? ccAvg * course.continuousWeight + finalAvg * course.finalWeight
      : null

  const predicted =
    actual !== null
      ? actual
      : ccAvg !== null
      ? ccAvg  // predicted = ccAvg * ccW + ccAvg * finalW = ccAvg
      : null

  // Target to pass the course itself (≥ target/20)
  const targetFinalForCourse =
    ccAvg !== null && course.finalWeight > 0
      ? (target - ccAvg * course.continuousWeight) / course.finalWeight
      : null

  // Target to bring the UE to ≥ 10/20 through compensation
  let targetFinalForUE: number | null = null
  if (
    allCoursesInUE && allGrades &&
    ccAvg !== null && course.finalWeight > 0
  ) {
    // Compute sum of (predicted_avg * coeff) for OTHER courses in the same UE
    let otherSum = 0
    let otherCoeffSum = 0
    let thisCoeff = course.coefficient
    for (const c of allCoursesInUE) {
      if (c.id === course.id) continue
      const s = courseStats(c, allGrades)
      if (s.predicted !== null) {
        otherSum += s.predicted * c.coefficient
        otherCoeffSum += c.coefficient
      }
    }
    const totalCoeff = thisCoeff + otherCoeffSum
    // UE avg = (this_course_avg * thisCoeff + otherSum) / totalCoeff >= target
    // → this_course_avg >= (target * totalCoeff - otherSum) / thisCoeff
    const neededCourseAvg = (target * totalCoeff - otherSum) / thisCoeff
    // course_avg = ccAvg * ccW + targetFinal * finalW
    targetFinalForUE =
      (neededCourseAvg - ccAvg * course.continuousWeight) / course.finalWeight
  }

  return {
    ccAvg, finalAvg, actual, predicted,
    targetFinalForCourse,
    targetFinalForUE,
    hasFinal: fin.length > 0,
    ccCount: cc.length,
  }
}

// ─── UE stats ─────────────────────────────────────────────────────────────────

export interface UEStats {
  avg: number | null       // actual weighted average (only courses with actual grade)
  predicted: number | null // predicted weighted average
  /** Grade needed by the weakest course's final to bring UE to 10 */
  validated: boolean       // predicted >= 10
  credits: number
}

export function ueStats(ue: UE, courses: Course[], grades: Grade[]): UEStats {
  const ueCourses = courses.filter(c => c.ueId === ue.id)
  if (ueCourses.length === 0) return { avg: null, predicted: null, validated: false, credits: ue.credits }

  let actualSum = 0, actualCoeff = 0
  let predSum = 0, predCoeff = 0

  for (const c of ueCourses) {
    const s = courseStats(c, grades, ueCourses, grades)
    if (s.actual !== null) { actualSum += s.actual * c.coefficient; actualCoeff += c.coefficient }
    if (s.predicted !== null) { predSum += s.predicted * c.coefficient; predCoeff += c.coefficient }
  }

  const avg       = actualCoeff > 0 ? actualSum / actualCoeff : null
  const predicted = predCoeff   > 0 ? predSum   / predCoeff   : null

  return { avg, predicted, validated: (predicted ?? 0) >= 10, credits: ue.credits }
}

// ─── Semester stats ───────────────────────────────────────────────────────────

export interface SemesterStats {
  avg: number | null
  predicted: number | null
  validated: boolean
  totalCredits: number
}

export function semesterStats(
  semester: 1 | 2,
  ues: UE[],
  courses: Course[],
  grades: Grade[],
): SemesterStats {
  const semUEs = ues.filter(u => u.semester === semester)
  if (semUEs.length === 0) return { avg: null, predicted: null, validated: false, totalCredits: 0 }

  let actualSum = 0, actualCr = 0
  let predSum = 0, predCr = 0

  for (const ue of semUEs) {
    const s = ueStats(ue, courses, grades)
    if (s.avg !== null)       { actualSum += s.avg       * ue.credits; actualCr += ue.credits }
    if (s.predicted !== null) { predSum   += s.predicted * ue.credits; predCr   += ue.credits }
  }

  const avg       = actualCr > 0 ? actualSum / actualCr : null
  const predicted = predCr   > 0 ? predSum   / predCr   : null
  const totalCredits = semUEs.reduce((s, u) => s + u.credits, 0)

  return { avg, predicted, validated: (predicted ?? 0) >= 10, totalCredits }
}

// ─── Year stats (compensation inter-semestrielle) ─────────────────────────────

export interface YearStats {
  predicted: number | null
  validated: boolean
  s1: SemesterStats
  s2: SemesterStats
}

export function yearStats(ues: UE[], courses: Course[], grades: Grade[]): YearStats {
  const s1 = semesterStats(1, ues, courses, grades)
  const s2 = semesterStats(2, ues, courses, grades)

  let predicted: number | null = null
  if (s1.predicted !== null || s2.predicted !== null) {
    const sum =
      (s1.predicted ?? 0) * s1.totalCredits +
      (s2.predicted ?? 0) * s2.totalCredits
    const cr = (s1.predicted !== null ? s1.totalCredits : 0) +
               (s2.predicted !== null ? s2.totalCredits : 0)
    predicted = cr > 0 ? sum / cr : null
  }

  return {
    predicted,
    validated: (predicted ?? 0) >= 10,
    s1,
    s2,
  }
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

export function gradeColor(v: number): string {
  if (v >= 14) return 'text-success'
  if (v >= 12) return 'text-emerald-400'
  if (v >= 10) return 'text-warning'
  return 'text-danger'
}

export function gradeBg(v: number): string {
  if (v >= 14) return 'bg-success/20 text-success'
  if (v >= 12) return 'bg-emerald-500/20 text-emerald-400'
  if (v >= 10) return 'bg-warning/20 text-warning'
  return 'bg-danger/20 text-danger'
}
