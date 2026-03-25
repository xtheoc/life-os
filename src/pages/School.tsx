import { useState } from 'react'
import {
  GraduationCap, Plus, BookOpen, BarChart2,
  Pencil, Trash2, AlertTriangle, CheckCircle2, CalendarDays,
  Layers,
} from 'lucide-react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { useToast } from '../components/ui/Toast'
import { Badge } from '../components/ui/Badge'
import CourseModal from '../components/school/CourseModal'
import UEModal from '../components/school/UEModal'
import AssignmentModal from '../components/school/AssignmentModal'
import GradeModal from '../components/school/GradeModal'
import {
  courseStats, ueStats, yearStats,
  gradeBg, gradeColor, norm20,
} from '../lib/gradeUtils'
import type { UE, Course, Assignment, Grade, Priority, AssignmentType, AssignmentStatus } from '../types'

// ─── Badge maps ───────────────────────────────────────────────────────────────

const PRI_BADGE: Record<Priority, string> = {
  urgent: 'bg-danger/20 text-danger',
  high: 'bg-warning/20 text-warning',
  medium: 'bg-accent/20 text-accent',
  low: 'bg-muted/20 text-muted',
}
const TYPE_BADGE: Record<AssignmentType, string> = {
  exam: 'bg-danger/15 text-danger',
  assignment: 'bg-accent/15 text-accent',
  project: 'bg-purple-500/15 text-purple-400',
  quiz: 'bg-warning/15 text-warning',
}
const STATUS_BADGE: Record<AssignmentStatus, string> = {
  todo: 'bg-muted/15 text-slate-400',
  'in-progress': 'bg-warning/15 text-warning',
  done: 'bg-success/15 text-success',
}
const STATUS_NEXT: Record<AssignmentStatus, AssignmentStatus> = {
  todo: 'in-progress',
  'in-progress': 'done',
  done: 'todo',
}

function dueLabel(dueDate: string) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date())
  if (dueDate < today) return { text: `${Math.abs(diff)}d overdue`, cls: 'text-danger font-semibold' }
  if (diff === 0) return { text: 'Today', cls: 'text-warning font-semibold' }
  if (diff === 1) return { text: 'Tomorrow', cls: 'text-warning' }
  if (diff <= 7) return { text: `In ${diff}d`, cls: 'text-slate-400' }
  return { text: format(parseISO(dueDate), 'dd/MM'), cls: 'text-muted' }
}

function ConfirmDelete({ label, onConfirm, onCancel }: {
  label: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-display">
      <span className="text-slate-400">Delete?</span>
      <button type="button" onClick={onConfirm} className="text-danger hover:underline">{label}</button>
      <button type="button" onClick={onCancel} className="text-muted hover:underline">Cancel</button>
    </span>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ ues, courses, assignments, grades, onAddAssignment, onEditCourse, onDeleteCourse, onAddGrade, onEditUE, onDeleteUE }: {
  ues: UE[]; courses: Course[]; assignments: Assignment[]; grades: Grade[]
  onAddAssignment: (courseId: string) => void
  onEditCourse: (c: Course) => void
  onDeleteCourse: (id: string) => void
  onAddGrade: (courseId: string) => void
  onEditUE: (u: UE) => void
  onDeleteUE: (id: string) => void
}) {
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)
  const [deletingUEId, setDeletingUEId] = useState<string | null>(null)

  if (courses.length === 0 && ues.length === 0) {
    return (
      <div className="text-center py-16">
        <GraduationCap size={36} className="mx-auto text-muted mb-3" />
        <p className="font-display font-semibold text-slate-300 mb-1">No courses</p>
        <p className="text-muted text-sm">Start by adding a UE then add courses.</p>
      </div>
    )
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  // Courses not assigned to any known UE
  const knownUeIds = new Set(ues.map(u => u.id))
  const orphanCourses = courses.filter(c => !knownUeIds.has(c.ueId))

  return (
    <div className="space-y-6">
      {ues.map(ue => {
        const ueCourses = courses.filter(c => c.ueId === ue.id)
        const us = ueStats(ue, courses, grades)

        return (
          <div key={ue.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* UE header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-3">
                <Layers size={14} className="text-muted shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display font-semibold text-white">{ue.name}</span>
                    <span className="text-[10px] text-muted font-mono">{ue.code}</span>
                    <span className="text-[10px] text-muted font-display">S{ue.semester} · {ue.credits} ECTS</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {us.predicted !== null && (
                  <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${gradeBg(us.predicted)}`}>
                    {us.predicted.toFixed(1)}/20
                  </span>
                )}
                {deletingUEId === ue.id ? (
                  <ConfirmDelete label="Oui"
                    onConfirm={() => { onDeleteUE(ue.id); setDeletingUEId(null) }}
                    onCancel={() => setDeletingUEId(null)} />
                ) : (
                  <>
                    <button onClick={() => onEditUE(ue)} className="p-1.5 text-muted hover:text-slate-200 hover:bg-white/5 rounded transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setDeletingUEId(ue.id)} className="p-1.5 text-muted hover:text-danger hover:bg-white/5 rounded transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Courses in this UE */}
            {ueCourses.length === 0 ? (
              <div className="px-4 py-4 text-sm text-muted text-center">No courses in this UE.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                {ueCourses.map(course => {
                  const stats = courseStats(course, grades, ueCourses, grades)
                  const ca = assignments.filter(a => a.courseId === course.id)
                  const pending = ca.filter(a => a.status !== 'done').length
                  const overdue = ca.filter(a => a.status !== 'done' && a.dueDate && a.dueDate < today).length

                  return (
                    <div
                      key={course.id}
                      className="bg-surface border border-border rounded-xl overflow-hidden"
                      style={{ borderLeftColor: course.color, borderLeftWidth: 3 }}
                    >
                      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: course.color + '25', color: course.color }}>
                              {course.code}
                            </span>
                            <span className="text-[11px] text-muted font-display">coeff {course.coefficient}</span>
                          </div>
                          <h3 className="font-display font-semibold text-slate-200 text-sm leading-snug">{course.name}</h3>
                          <p className="text-[11px] text-muted font-mono mt-0.5">
                            CC {Math.round(course.continuousWeight * 100)}% / Final {Math.round(course.finalWeight * 100)}%
                          </p>
                        </div>
                        {stats.predicted !== null && (
                          <div className={`shrink-0 text-right px-2 py-1 rounded-lg font-mono ${gradeBg(stats.predicted)}`}>
                            <div className="text-lg font-bold leading-none">{stats.predicted.toFixed(1)}</div>
                            <div className="text-[10px] opacity-70">/20</div>
                          </div>
                        )}
                      </div>

                      <div className="px-4 pb-2 flex items-center gap-3 text-[11px] font-display">
                        {stats.ccCount > 0 && (
                          <span className="text-muted">CC: <span className="text-slate-300 font-mono">{stats.ccAvg?.toFixed(1)}/20</span></span>
                        )}
                        {overdue > 0 && (
                          <span className="text-danger flex items-center gap-1"><AlertTriangle size={10} /> {overdue} overdue</span>
                        )}
                        {pending > 0 && !overdue && <span className="text-muted">{pending} in progress</span>}
                      </div>

                      <div className="px-4 pb-3 flex items-center gap-3 border-t border-border pt-2">
                        <button onClick={() => onAddAssignment(course.id)}
                          className="flex items-center gap-1 text-[11px] text-muted hover:text-slate-200 font-display transition-colors">
                          <Plus size={11} /> Assignment
                        </button>
                        <button onClick={() => onAddGrade(course.id)}
                          className="flex items-center gap-1 text-[11px] text-muted hover:text-slate-200 font-display transition-colors">
                          <Plus size={11} /> Grade
                        </button>
                        <div className="ml-auto flex items-center gap-1">
                          {deletingCourseId === course.id ? (
                            <ConfirmDelete label="Oui"
                              onConfirm={() => { onDeleteCourse(course.id); setDeletingCourseId(null) }}
                              onCancel={() => setDeletingCourseId(null)} />
                          ) : (
                            <>
                              <button onClick={() => onEditCourse(course)}
                                className="p-1.5 rounded text-muted hover:text-slate-200 hover:bg-white/5 transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeletingCourseId(course.id)}
                                className="p-1.5 rounded text-muted hover:text-danger hover:bg-white/5 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Orphan courses (no UE assigned) */}
      {orphanCourses.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs text-muted font-display">Courses without UE</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
            {orphanCourses.map(course => {
              const stats = courseStats(course, grades)
              return (
                <div key={course.id} className="bg-surface border border-border rounded-xl overflow-hidden"
                  style={{ borderLeftColor: course.color, borderLeftWidth: 3 }}>
                  <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: course.color + '25', color: course.color }}>{course.code}</span>
                      <h3 className="font-display font-semibold text-slate-200 text-sm mt-1">{course.name}</h3>
                    </div>
                    {stats.predicted !== null && (
                      <div className={`shrink-0 px-2 py-1 rounded-lg font-mono ${gradeBg(stats.predicted)}`}>
                        <div className="text-lg font-bold leading-none">{stats.predicted.toFixed(1)}</div>
                        <div className="text-[10px] opacity-70">/20</div>
                      </div>
                    )}
                  </div>
                  <div className="px-4 pb-3 flex gap-2 border-t border-border pt-2">
                    <button onClick={() => onEditCourse(course)} className="p-1.5 text-muted hover:text-slate-200 hover:bg-white/5 rounded transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => onDeleteCourse(course.id)} className="p-1.5 text-muted hover:text-danger hover:bg-white/5 rounded transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

type AssignFilter = 'all' | 'todo' | 'in-progress' | 'done' | 'overdue'

function AssignmentsTab({ courses, assignments, onAdd, onEdit, onDelete }: {
  courses: Course[]; assignments: Assignment[]
  onAdd: (courseId?: string) => void
  onEdit: (a: Assignment) => void
  onDelete: (id: string) => void
}) {
  const [filter, setFilter] = useState<AssignFilter>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const today = format(new Date(), 'yyyy-MM-dd')

  const overdueCount = assignments.filter(a => a.status !== 'done' && a.dueDate && a.dueDate < today).length

  const filtered = assignments.filter(a => {
    if (filter === 'all') return true
    if (filter === 'overdue') return a.status !== 'done' && !!a.dueDate && a.dueDate < today
    return a.status === filter
  }).sort((a, b) => {
    const aOv = a.dueDate && a.dueDate < today ? -1 : 0
    const bOv = b.dueDate && b.dueDate < today ? -1 : 0
    if (aOv !== bOv) return aOv - bOv
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]))

  if (courses.length === 0) {
    return <div className="text-center py-16"><p className="text-muted text-sm">Add courses first.</p></div>
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'todo', 'in-progress', 'done', 'overdue'] as AssignFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-colors ${
              filter === f ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted hover:bg-white/10 hover:text-slate-300'
            }`}>
            {f === 'all' ? 'All' : f === 'todo' ? 'To do' : f === 'in-progress' ? 'In progress' : f === 'done' ? 'Done' : 'Overdue'}
            {f === 'overdue' && overdueCount > 0 && <span className="ml-1 text-danger">{overdueCount}</span>}
          </button>
        ))}
        <button onClick={() => onAdd()}
          className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-full text-xs font-display font-semibold transition-colors">
          <Plus size={12} /> Add
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 size={28} className="mx-auto text-muted mb-2" />
          <p className="text-muted text-sm font-display">No assignments.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const course = courseMap[a.courseId]
            const isOverdue = a.status !== 'done' && !!a.dueDate && a.dueDate < today
            const due = a.dueDate ? dueLabel(a.dueDate) : null

            return (
              <div key={a.id}
                className={`bg-card border rounded-xl px-4 py-3 ${isOverdue ? 'border-danger/40' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_ASSIGNMENT', payload: { ...a, status: STATUS_NEXT[a.status] } })}
                    title="Click to advance status"
                    className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-display font-semibold capitalize transition-colors hover:opacity-80 ${STATUS_BADGE[a.status]}`}>
                    {a.status === 'todo' ? 'To do' : a.status === 'in-progress' ? 'In progress' : 'Done'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-display leading-snug ${a.status === 'done' ? 'text-muted line-through' : 'text-slate-200'}`}>
                      {a.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {course && (
                        <span className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: course.color + '20', color: course.color }}>
                          {course.code}
                        </span>
                      )}
                      <Badge label={a.type} className={TYPE_BADGE[a.type]} />
                      <Badge label={a.priority} className={PRI_BADGE[a.priority]} />
                      {due && <span className={`font-mono text-[11px] ${due.cls}`}>{due.text}</span>}
                      {a.estimatedHours > 0 && <span className="text-[11px] text-muted font-mono">{a.estimatedHours}h</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {deletingId === a.id ? (
                      <ConfirmDelete label="Oui"
                        onConfirm={() => { onDelete(a.id); setDeletingId(null) }}
                        onCancel={() => setDeletingId(null)} />
                    ) : (
                      <>
                        <button onClick={() => onEdit(a)} className="p-1.5 text-muted hover:text-slate-200 hover:bg-white/5 rounded transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeletingId(a.id)} className="p-1.5 text-muted hover:text-danger hover:bg-white/5 rounded transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Grades Tab ───────────────────────────────────────────────────────────────

function GradesTab({ ues, courses, grades, onAddGrade, onEditGrade, onDeleteGrade }: {
  ues: UE[]; courses: Course[]; grades: Grade[]
  onAddGrade: (courseId: string) => void
  onEditGrade: (g: Grade) => void
  onDeleteGrade: (id: string) => void
}) {
  const year = yearStats(ues, courses, grades)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { preferences } = useAppState()
  const dispatch = useAppDispatch()

  if (courses.length === 0) {
    return <div className="text-center py-16"><p className="text-muted text-sm">Add courses first.</p></div>
  }

  function StatPill({ label, value }: { label: string; value: number | null }) {
    if (value === null) return null
    return (
      <div className="text-center">
        <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-0.5">{label}</p>
        <span className={`font-mono text-lg font-bold ${gradeColor(value)}`}>{value.toFixed(2)}</span>
        <span className="text-muted font-mono text-xs">/20</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Semester goals */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap gap-6 items-center">
        <span className="text-xs font-display font-semibold text-muted uppercase tracking-wider">Grade goals</span>
        {([1, 2] as (1 | 2)[]).map(sem => (
          <div key={sem} className="flex items-center gap-2">
            <label className="text-xs text-slate-300 font-display">Semester {sem}:</label>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={preferences.semesterTargets[sem]}
              onChange={e => dispatch({ type: 'UPDATE_PREFERENCES', payload: { semesterTargets: { ...preferences.semesterTargets, [sem]: Number(e.target.value) } } })}
              className="w-16 bg-surface border border-border rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-accent"
            />
            <span className="text-xs text-muted">/20</span>
          </div>
        ))}
      </div>

      {/* Year summary */}
      {(year.s1.predicted !== null || year.s2.predicted !== null) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-3">Annual summary</p>
          <div className="grid grid-cols-3 gap-4">
            <StatPill label="Semestre 1" value={year.s1.predicted} />
            <StatPill label="Semester 2" value={year.s2.predicted} />
            <StatPill label="Year" value={year.predicted} />
          </div>
          {year.predicted !== null && (
            <div className={`mt-3 text-center text-xs font-display font-semibold ${year.validated ? 'text-success' : 'text-danger'}`}>
              {year.validated ? '✓ Year validated (≥ 10/20)' : '✗ Year not validated (< 10/20)'}
            </div>
          )}
        </div>
      )}

      {/* Per-UE breakdown */}
      {ues.map(ue => {
        const ueCourses = courses.filter(c => c.ueId === ue.id)
        if (ueCourses.length === 0) return null
        const us = ueStats(ue, courses, grades)

        return (
          <div key={ue.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* UE header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-display font-semibold text-white">{ue.name}</span>
                <span className="text-[10px] text-muted font-mono">{ue.code}</span>
                <span className="text-[10px] text-muted font-display">S{ue.semester} · {ue.credits} ECTS</span>
              </div>
              <div className="flex items-center gap-2">
                {us.predicted !== null && (
                  <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${gradeBg(us.predicted)}`}>
                    UE: {us.predicted.toFixed(2)}/20
                  </span>
                )}
                {us.predicted !== null && (
                  <span className={`text-[10px] font-display ${us.validated ? 'text-success' : 'text-danger'}`}>
                    {us.validated ? '✓ validated' : '✗ not validated'}
                  </span>
                )}
              </div>
            </div>

            {/* Courses within this UE */}
            <div className="divide-y divide-border">
              {ueCourses.map(course => {
                const semTarget = preferences.semesterTargets[ue.semester] ?? 10
                const stats = courseStats(course, grades, ueCourses, grades, semTarget)
                const cg = grades.filter(g => g.courseId === course.id)
                const ccGrades = cg.filter(g => g.category === 'continuous')
                const finalGrades = cg.filter(g => g.category === 'final')

                function GradeRow({ g }: { g: Grade }) {
                  const n = norm20(g.score, g.maxScore)
                  return (
                    <div className="flex items-center gap-3 py-1">
                      <span className={`font-mono text-sm font-semibold w-16 shrink-0 ${gradeBg(n).split(' ')[1]}`}>
                        {n.toFixed(1)}/20
                      </span>
                      <span className="text-xs text-muted font-mono">({g.score}/{g.maxScore})</span>
                      <span className="text-sm text-slate-300 font-display flex-1 min-w-0 truncate">{g.title}</span>
                      <span className="text-[11px] text-muted font-mono shrink-0">{format(parseISO(g.date), 'dd/MM')}</span>
                      <div className="flex gap-1 shrink-0">
                        {deletingId === g.id ? (
                          <ConfirmDelete label="Oui"
                            onConfirm={() => { onDeleteGrade(g.id); setDeletingId(null) }}
                            onCancel={() => setDeletingId(null)} />
                        ) : (
                          <>
                            <button onClick={() => onEditGrade(g)} className="p-1 text-muted hover:text-slate-200 transition-colors"><Pencil size={11} /></button>
                            <button onClick={() => setDeletingId(g.id)} className="p-1 text-muted hover:text-danger transition-colors"><Trash2 size={11} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={course.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-display font-semibold px-2 py-0.5 rounded"
                          style={{ background: course.color + '25', color: course.color }}>{course.code}</span>
                        <span className="font-display font-semibold text-slate-200 text-sm">{course.name}</span>
                        <span className="text-[11px] text-muted font-display hidden sm:inline">
                          coeff {course.coefficient} · CC {Math.round(course.continuousWeight * 100)}%
                        </span>
                      </div>
                      <button onClick={() => onAddGrade(course.id)}
                        className="flex items-center gap-1 text-[11px] text-accent hover:text-blue-400 font-display transition-colors">
                        <Plus size={11} /> Ajouter
                      </button>
                    </div>

                    {cg.length === 0 ? (
                      <p className="text-muted text-xs font-display text-center py-2">No grades.</p>
                    ) : (
                      <>
                        {ccGrades.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-2">Continuous assessment</p>
                            <div className="divide-y divide-border/50">{ccGrades.map(g => <GradeRow key={g.id} g={g} />)}</div>
                          </div>
                        )}
                        {finalGrades.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-2">Final exam</p>
                            <div className="divide-y divide-border/50">{finalGrades.map(g => <GradeRow key={g.id} g={g} />)}</div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="border-t border-border pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                          {stats.ccAvg !== null && (
                            <div>
                              <p className="text-[10px] text-muted font-display">CC avg.</p>
                              <p className={`font-mono text-sm font-semibold ${gradeBg(stats.ccAvg).split(' ')[1]}`}>
                                {stats.ccAvg.toFixed(2)}/20
                              </p>
                            </div>
                          )}
                          {stats.predicted !== null && (
                            <div>
                              <p className="text-[10px] text-muted font-display">{stats.hasFinal ? 'Course avg.' : 'Projected avg.'}</p>
                              <p className={`font-mono text-sm font-semibold ${gradeBg(stats.predicted).split(' ')[1]}`}>
                                {stats.predicted.toFixed(2)}/20
                              </p>
                            </div>
                          )}
                          {!stats.hasFinal && stats.targetFinalForCourse !== null && (
                            <div>
                              <p className="text-[10px] text-muted font-display">Need on final (goal {semTarget}/20)</p>
                              <p className={`font-mono text-sm font-semibold ${
                                stats.targetFinalForCourse > 20 ? 'text-danger' : stats.targetFinalForCourse <= 0 ? 'text-success' : gradeBg(stats.targetFinalForCourse).split(' ')[1]
                              }`}>
                                {stats.targetFinalForCourse > 20 ? 'Impossible' : stats.targetFinalForCourse <= 0 ? `Already ≥${semTarget}` : `${stats.targetFinalForCourse.toFixed(1)}/20`}
                              </p>
                            </div>
                          )}
                          {!stats.hasFinal && stats.targetFinalForUE !== null && (
                            <div>
                              <p className="text-[10px] text-muted font-display">Need final (≥{semTarget} UE)</p>
                              <p className={`font-mono text-sm font-semibold ${
                                stats.targetFinalForUE > 20 ? 'text-danger' : stats.targetFinalForUE <= 0 ? 'text-success' : gradeBg(stats.targetFinalForUE).split(' ')[1]
                              }`}>
                                {stats.targetFinalForUE > 20 ? 'Impossible' : stats.targetFinalForUE <= 0 ? `Already ≥${semTarget}` : `${stats.targetFinalForUE.toFixed(1)}/20`}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Courses without a UE */}
      {(() => {
        const knownUeIds = new Set(ues.map(u => u.id))
        const orphans = courses.filter(c => !knownUeIds.has(c.ueId))
        if (orphans.length === 0) return null
        return (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted font-display mb-3">Courses without UE</p>
            {orphans.map(course => {
              const stats = courseStats(course, grades)
              return (
                <div key={course.id} className="flex items-center gap-3 py-1">
                  <span style={{ color: course.color }} className="font-display text-sm font-semibold">{course.name}</span>
                  {stats.predicted !== null && (
                    <span className={`font-mono text-xs ${gradeBg(stats.predicted).split(' ')[1]}`}>{stats.predicted.toFixed(1)}/20</span>
                  )}
                  <button onClick={() => onAddGrade(course.id)} className="ml-auto text-[11px] text-accent flex items-center gap-1"><Plus size={10} /> Ajouter</button>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type RecurringEventForm = {
  title: string
  daysOfWeek: number[]
  startTime: string
  endTime: string
  color: string
}

const BLANK_FORM: RecurringEventForm = {
  title: '', daysOfWeek: [], startTime: '08:00', endTime: '10:00', color: '#3b82f6',
}

const CLASS_COLORS = ['#3b82f6','#06b6d4','#8b5cf6','#ec4899','#f59e0b','#22c55e','#f97316','#ef4444']

function ScheduleTab({
  events,
  onAdd,
  onUpdate,
  onDelete,
}: {
  events: import('../types').RecurringEvent[]
  onAdd: (e: import('../types').RecurringEvent) => void
  onUpdate: (e: import('../types').RecurringEvent) => void
  onDelete: (id: string) => void
}) {
  const [form, setForm] = useState<RecurringEventForm>(BLANK_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Only class-type events
  const classes = events.filter(e => e.category === 'class')

  function toggleDay(d: number) {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter(x => x !== d) : [...f.daysOfWeek, d].sort(),
    }))
  }

  function openNew() { setForm(BLANK_FORM); setEditingId(null); setShowForm(true) }

  function openEdit(ev: import('../types').RecurringEvent) {
    setForm({ title: ev.title, daysOfWeek: [...ev.daysOfWeek], startTime: ev.startTime, endTime: ev.endTime, color: ev.color ?? '#3b82f6' })
    setEditingId(ev.id)
    setShowForm(true)
  }

  function handleSave() {
    if (!form.title.trim() || form.daysOfWeek.length === 0) return
    if (editingId) {
      onUpdate({ id: editingId, title: form.title.trim(), category: 'class', daysOfWeek: form.daysOfWeek as import('../types').DayOfWeek[], startTime: form.startTime, endTime: form.endTime, color: form.color, active: true })
    } else {
      onAdd({ id: `re-${Date.now()}`, title: form.title.trim(), category: 'class', daysOfWeek: form.daysOfWeek as import('../types').DayOfWeek[], startTime: form.startTime, endTime: form.endTime, color: form.color, active: true })
    }
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK_FORM)
  }

  // Build weekly grid: for each day, which classes?
  const byDay: Record<number, import('../types').RecurringEvent[]> = {}
  for (let d = 0; d < 7; d++) byDay[d] = classes.filter(e => e.daysOfWeek.includes(d as import('../types').DayOfWeek))

  return (
    <div className="space-y-6">
      {/* Weekly grid */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-display font-semibold text-white">Weekly schedule</h2>
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/80 transition-colors">
            <Plus size={12} /> Add course
          </button>
        </div>
        <div className="grid grid-cols-7 divide-x divide-border">
          {[1,2,3,4,5,6,0].map(d => (
            <div key={d} className="min-h-[120px] p-2">
              <p className={`text-xs font-semibold text-center mb-2 ${d === new Date().getDay() ? 'text-accent' : 'text-muted'}`}>
                {DOW_LABELS[d]}
              </p>
              <div className="space-y-1">
                {byDay[d].map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => openEdit(ev)}
                    className="w-full text-left px-1.5 py-1 rounded text-[10px] leading-tight hover:opacity-80 transition-opacity"
                    style={{ background: (ev.color ?? '#3b82f6') + '30', borderLeft: `2px solid ${ev.color ?? '#3b82f6'}`, color: ev.color ?? '#3b82f6' }}>
                    <p className="font-semibold truncate">{ev.title}</p>
                    <p className="opacity-70">{ev.startTime}–{ev.endTime}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course list */}
      {classes.length > 0 && (
        <div className="space-y-2">
          {classes.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: ev.color ?? '#3b82f6' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{ev.title}</p>
                <p className="text-xs text-muted">
                  {ev.daysOfWeek.map(d => DOW_FULL[d]).join(', ')} · {ev.startTime}–{ev.endTime}
                </p>
              </div>
              <button onClick={() => openEdit(ev)} className="text-muted hover:text-white transition-colors"><Pencil size={14} /></button>
              <button onClick={() => onDelete(ev.id)} className="text-muted hover:text-danger transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {classes.length === 0 && !showForm && (
        <div className="text-center py-10 text-muted text-sm">
          No courses — click "Add course" to get started.
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="bg-card border border-accent/40 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-display font-semibold text-white">{editingId ? 'Edit course' : 'New course'}</h3>

          <input
            autoFocus
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Nom du cours (ex: Maths, Info, Anglais…)"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent"
          />

          {/* Day picker */}
          <div>
            <p className="text-xs text-muted mb-2">Days</p>
            <div className="flex gap-1.5">
              {[1,2,3,4,5,6,0].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                    form.daysOfWeek.includes(d) ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-white border border-border'
                  }`}>
                  {DOW_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted mb-1">Start</p>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1">End</p>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent" />
            </div>
          </div>

          {/* Color */}
          <div>
            <p className="text-xs text-muted mb-2">Color</p>
            <div className="flex gap-2">
              {CLASS_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="flex-1 py-2 text-sm text-muted hover:text-white bg-surface rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || form.daysOfWeek.length === 0}
              className="flex-1 py-2 text-sm font-semibold text-white bg-accent rounded-xl disabled:opacity-40 hover:bg-accent/80 transition-colors">
              {editingId ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'assignments' | 'grades' | 'schedule'

export default function School() {
  const { ues, courses, assignments, grades, recurringEvents } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('overview')
  const [ueModal, setUEModal] = useState<{ open: boolean; ue?: UE }>({ open: false })
  const [courseModal, setCourseModal] = useState<{ open: boolean; course?: Course }>({ open: false })
  const [assignModal, setAssignModal] = useState<{ open: boolean; assignment?: Assignment; courseId?: string }>({ open: false })
  const [gradeModal, setGradeModal] = useState<{ open: boolean; grade?: Grade; courseId?: string }>({ open: false })

  function deleteUE(id: string) { dispatch({ type: 'DELETE_UE', payload: { id } }); toast('UE deleted', 'success') }
  function deleteCourse(id: string) { dispatch({ type: 'DELETE_COURSE', payload: { id } }); toast('Course deleted', 'success') }
  function deleteAssignment(id: string) { dispatch({ type: 'DELETE_ASSIGNMENT', payload: { id } }); toast('Assignment deleted', 'success') }
  function deleteGrade(id: string) { dispatch({ type: 'DELETE_GRADE', payload: { id } }); toast('Grade deleted', 'success') }

  const today = format(new Date(), 'yyyy-MM-dd')
  const overdueCount = assignments.filter(a => a.status !== 'done' && !!a.dueDate && a.dueDate < today).length

  const TABS: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: 'overview', label: 'Courses', icon: GraduationCap },
    { key: 'assignments', label: 'Assignments', icon: BookOpen },
    { key: 'grades', label: 'Grades', icon: BarChart2 },
    { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-0.5">School</h1>
          <p className="text-muted text-sm">
            {ues.length} UE · {courses.length} course{courses.length !== 1 ? 's' : ''}
            {overdueCount > 0 && <span className="ml-2 text-danger font-semibold">· {overdueCount} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUEModal({ open: true })}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-slate-200 px-3 py-2 rounded-lg text-sm font-display font-semibold transition-colors"
          >
            <Layers size={14} /> UE
          </button>
          <button
            onClick={() => setCourseModal({ open: true })}
            className="flex items-center gap-2 bg-accent hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-display font-semibold transition-colors"
          >
            <Plus size={15} /> Course
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface p-1 rounded-xl w-fit border border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-colors ${
              tab === key ? 'bg-card text-white shadow-sm' : 'text-muted hover:text-slate-300'
            }`}>
            <Icon size={14} />
            {label}
            {key === 'assignments' && overdueCount > 0 && (
              <span className="bg-danger/20 text-danger text-[10px] font-mono px-1.5 py-0.5 rounded-full">{overdueCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab ues={ues} courses={courses} assignments={assignments} grades={grades}
          onAddAssignment={courseId => { setAssignModal({ open: true, courseId }); setTab('assignments') }}
          onEditCourse={c => setCourseModal({ open: true, course: c })}
          onDeleteCourse={deleteCourse}
          onAddGrade={courseId => setGradeModal({ open: true, courseId })}
          onEditUE={u => setUEModal({ open: true, ue: u })}
          onDeleteUE={deleteUE}
        />
      )}
      {tab === 'assignments' && (
        <AssignmentsTab courses={courses} assignments={assignments}
          onAdd={courseId => setAssignModal({ open: true, courseId })}
          onEdit={a => setAssignModal({ open: true, assignment: a })}
          onDelete={deleteAssignment} />
      )}
      {tab === 'grades' && (
        <GradesTab ues={ues} courses={courses} grades={grades}
          onAddGrade={courseId => setGradeModal({ open: true, courseId })}
          onEditGrade={g => setGradeModal({ open: true, grade: g })}
          onDeleteGrade={deleteGrade} />
      )}
      {tab === 'schedule' && (
        <ScheduleTab
          events={recurringEvents}
          onAdd={e => dispatch({ type: 'ADD_RECURRING', payload: e })}
          onUpdate={e => dispatch({ type: 'UPDATE_RECURRING', payload: e })}
          onDelete={id => dispatch({ type: 'DELETE_RECURRING', payload: { id } })}
        />
      )}

      <UEModal isOpen={ueModal.open} onClose={() => setUEModal({ open: false })} initial={ueModal.ue} />
      <CourseModal isOpen={courseModal.open} onClose={() => setCourseModal({ open: false })} initial={courseModal.course} ues={ues} />
      <AssignmentModal isOpen={assignModal.open} onClose={() => setAssignModal({ open: false })}
        initial={assignModal.assignment} defaultCourseId={assignModal.courseId} />
      <GradeModal isOpen={gradeModal.open} onClose={() => setGradeModal({ open: false })}
        initial={gradeModal.grade} defaultCourseId={gradeModal.courseId} />
    </div>
  )
}
