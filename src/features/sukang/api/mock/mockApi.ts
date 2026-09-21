import type { SukangApi } from '@/features/sukang/api/types'
import { SukangError } from '@/features/sukang/api/types'
import {
  ALL_COURSES,
  BASKET_COURSES,
  GYOYANG_COURSES,
  HUSS_COURSES,
  INITIAL_ENROLLED_COURSES,
  JUNGONG_COURSES,
  STUDENT_FIXTURE,
  YUNGAE_COURSES,
} from '@/features/sukang/api/mock/fixtures'
import {
  creditLimitFor,
  resolveCourseType,
  validateEnroll,
} from '@/features/sukang/api/mock/validate'
import { cptnGbnName, fldGnbName } from '@/features/sukang/constants/codes'
import type { Course, EnrollmentRow, Student } from '@/features/sukang/schemas'
import { randomDelay } from '@/shared/api/delay'
import { env } from '@/shared/config/env'

const DELAY_MS = { min: 200, max: 800 } as const

const enrollmentsByStudent = new Map<string, EnrollmentRow[]>()

const studentOf = (id: string): Student => ({
  id,
  ...STUDENT_FIXTURE,
  creditLimit: creditLimitFor(STUDENT_FIXTURE.gpa),
})

function enrollmentsOf(studentId: string): EnrollmentRow[] {
  const existing = enrollmentsByStudent.get(studentId)
  if (existing) return existing
  const student = studentOf(studentId)
  const seeded = INITIAL_ENROLLED_COURSES.map((course, i) => ({
    studentId,
    courseId: course.id,
    resolvedType: resolveCourseType(student, course),
    reAttendance: '',
    createdAt: new Date(Date.now() - (INITIAL_ENROLLED_COURSES.length - i) * 60_000).toISOString(),
    course,
  }))
  enrollmentsByStudent.set(studentId, seeded)
  return seeded
}

async function simulate<T>(fn: () => T): Promise<T> {
  await randomDelay(DELAY_MS.min, DELAY_MS.max)
  return fn()
}

function assertSessionAlive(): void {
  if (env.MOCK_FAIL === 'session') throw new SukangError('SESSION_EXPIRED')
}

function findCourse(courseId: string): Course {
  const course = ALL_COURSES.find((candidate) => candidate.id === courseId)
  if (!course) throw new Error(`mock: 알 수 없는 courseId ${courseId}`)
  return course
}

export const mockApi: SukangApi = {
  getStudent: (studentId) => simulate(() => studentOf(studentId)),

  listBasket: () => simulate(() => [...BASKET_COURSES]),

  listJungong: () => simulate(() => [...JUNGONG_COURSES]),

  listGyoyang: ({ cptnGbn, fldGnb }) =>
    simulate(() => {
      const typeName = cptnGbnName(cptnGbn)
      if (!typeName) return []
      const areaName = fldGnb ? fldGnbName(cptnGbn, fldGnb) : undefined
      return GYOYANG_COURSES.filter(
        (c) => c.courseType === typeName && (areaName === undefined || c.courseArea === areaName),
      )
    }),

  listTagwa: ({ tagwaCd }) => simulate(() => ALL_COURSES.filter((c) => c.department === tagwaCd)),

  listYungae: ({ yungaeCd }) => simulate(() => [...(YUNGAE_COURSES[yungaeCd] ?? [])]),

  listHuss: () => simulate(() => [...HUSS_COURSES]),

  searchCourses: ({ q }) =>
    simulate(() => ALL_COURSES.filter((c) => c.name.includes(q) || c.code.includes(q))),

  listEnrollments: (studentId) =>
    simulate(() =>
      [...enrollmentsOf(studentId)].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    ),

  enroll: ({ studentId, courseId }) =>
    simulate(() => {
      assertSessionAlive()
      const student = studentOf(studentId)
      const course = findCourse(courseId)
      const rows = enrollmentsOf(studentId)
      validateEnroll(
        student,
        course,
        rows.map((row) => row.course),
      )
      rows.push({
        studentId,
        courseId: course.id,
        resolvedType: resolveCourseType(student, course),
        reAttendance: '',
        createdAt: new Date().toISOString(),
        course,
      })
      return { course }
    }),

  cancel: ({ studentId, courseId }) =>
    simulate(() => {
      assertSessionAlive()
      const rows = enrollmentsOf(studentId)
      const index = rows.findIndex((row) => row.courseId === courseId)
      if (index >= 0) rows.splice(index, 1)
    }),
}
