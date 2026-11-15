export type DoseStatus = 'taken' | 'skipped' | 'missed'

export type DoseRecord = {
  date: string
  medicine: string
  dose: string
  scheduledTime: string
  status: DoseStatus
  recordedAt: string
}

// Counts shared by the whole summary, each day and each medicine.
type DoseCounts = {
  taken: number
  skipped: number
  missed: number
  total: number
  percent: number
}

export type AdherenceDay = DoseCounts & {
  date: string
  label: string
}

export type AdherenceMedicine = DoseCounts & {
  medicine: string
}

export type AdherenceSummary = DoseCounts & {
  days: number
  from: string
  to: string
  label: string
  byDay: AdherenceDay[]
  byMedicine: AdherenceMedicine[]
  recent: DoseRecord[]
}

type SeedMedicine = {
  name: string
  dose: string
  time: string
  status: string
}

const ADHERENCE_WINDOW_DAYS = 7

// Demo history covers six completed days; today comes from the live schedule.
const SEEDED_DAYS = 6

// Every scheduled dose in the past six days counts as taken, except these
// planted exceptions. The names must match the demo medicines in App.tsx.
const SEEDED_EXCEPTIONS: {
  daysAgo: number
  medicine: string
  status: DoseStatus
}[] = [
  { daysAgo: 5, medicine: 'Aspirin Low Dose', status: 'skipped' },
  { daysAgo: 3, medicine: 'Metformin Hydrochloride', status: 'missed' },
  { daysAgo: 1, medicine: 'Vitamin D3', status: 'skipped' },
]

const MISSED_GRACE_HOURS = 2

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const fromDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Turns "8:05 AM" into 24-hour hours/minutes. Returns null for "As needed".
const parseClock = (time: string): { hours: number; minutes: number } | null => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim())

  if (!match) return null

  let hours = Number(match[1]) % 12 // 12 AM becomes 0, 12 PM stays 12
  if (match[3].toUpperCase() === 'PM') hours += 12

  return { hours, minutes: Number(match[2]) }
}

export const hasScheduledTime = (time: string): boolean =>
  parseClock(time) !== null

// Builds a timestamp in local time, so the printed clock time matches the
// schedule rather than shifting by the machine's UTC offset.
const combineDateAndTime = (dateKey: string, time: string): string => {
  const clock = parseClock(time)
  const date = fromDateKey(dateKey)
  date.setHours(clock?.hours ?? 9, clock?.minutes ?? 0, 0, 0)
  return date.toISOString()
}

export const formatTimestamp = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export const formatDayLabel = (dateKey: string): string =>
  fromDateKey(dateKey).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

export const formatShortDate = (dateKey: string): string =>
  fromDateKey(dateKey).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

const countDoses = (records: DoseRecord[]): DoseCounts => {
  const taken = records.filter((record) => record.status === 'taken').length
  const skipped = records.filter((record) => record.status === 'skipped').length
  const missed = records.filter((record) => record.status === 'missed').length
  const total = records.length

  return {
    taken,
    skipped,
    missed,
    total,
    percent: total === 0 ? 0 : Math.round((taken / total) * 100),
  }
}

const describeAdherence = (percent: number): string => {
  if (percent >= 90) return 'On track'
  if (percent >= 75) return 'Needs attention'
  return 'Below target'
}

const buildRecord = (
  dateKey: string,
  medicine: SeedMedicine,
  status: DoseStatus,
): DoseRecord => {
  const scheduledIso = combineDateAndTime(dateKey, medicine.time)
  const recordedAt =
    status === 'missed'
      ? new Date(
          new Date(scheduledIso).getTime() +
            MISSED_GRACE_HOURS * 60 * 60 * 1000,
        ).toISOString()
      : scheduledIso

  return {
    date: dateKey,
    medicine: medicine.name,
    dose: medicine.dose,
    scheduledTime: medicine.time,
    status,
    recordedAt,
  }
}

/**
 * Builds the fictional starting history: six completed demo days plus the doses
 * already marked as taken on today's schedule.
 */
export function createSeededHistory(
  medicines: SeedMedicine[],
  today = new Date(),
): DoseRecord[] {
  // "As needed" medicines have no scheduled dose, so they cannot be adhered to.
  const scheduled = medicines.filter((medicine) =>
    hasScheduledTime(medicine.time),
  )
  const records: DoseRecord[] = []

  for (let daysAgo = SEEDED_DAYS; daysAgo >= 1; daysAgo -= 1) {
    const dateKey = toDateKey(addDays(today, -daysAgo))

    for (const medicine of scheduled) {
      const exception = SEEDED_EXCEPTIONS.find(
        (item) => item.daysAgo === daysAgo && item.medicine === medicine.name,
      )

      records.push(
        buildRecord(dateKey, medicine, exception?.status ?? 'taken'),
      )
    }
  }

  const todayKey = toDateKey(today)

  for (const medicine of scheduled) {
    if (medicine.status === 'taken') {
      records.push(buildRecord(todayKey, medicine, 'taken'))
    }
  }

  return records
}

/** One record per medicine per day: recording again updates the same entry. */
export function upsertDoseRecord(
  records: DoseRecord[],
  record: DoseRecord,
): DoseRecord[] {
  const index = records.findIndex(
    (item) => item.date === record.date && item.medicine === record.medicine,
  )

  if (index === -1) return [...records, record]

  const next = [...records]
  next[index] = record
  return next
}

export function summarizeAdherence(
  records: DoseRecord[],
  today = new Date(),
): AdherenceSummary {
  const to = toDateKey(today)
  const from = toDateKey(addDays(today, -(ADHERENCE_WINDOW_DAYS - 1)))

  // Date keys are YYYY-MM-DD, so comparing them as text also compares dates.
  const inWindow = records.filter(
    (record) => record.date >= from && record.date <= to,
  )

  const byDay: AdherenceDay[] = []
  for (let offset = ADHERENCE_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const dateKey = toDateKey(addDays(today, -offset))

    byDay.push({
      date: dateKey,
      label: formatDayLabel(dateKey),
      ...countDoses(inWindow.filter((record) => record.date === dateKey)),
    })
  }

  const medicineNames = [...new Set(inWindow.map((record) => record.medicine))]
  const byMedicine: AdherenceMedicine[] = medicineNames
    .map((medicine) => ({
      medicine,
      ...countDoses(inWindow.filter((record) => record.medicine === medicine)),
    }))
    .sort((a, b) => b.total - a.total || a.medicine.localeCompare(b.medicine))

  const totals = countDoses(inWindow)

  return {
    days: ADHERENCE_WINDOW_DAYS,
    from,
    to,
    ...totals,
    label:
      totals.total === 0
        ? 'No records yet'
        : describeAdherence(totals.percent),
    byDay,
    byMedicine,
    recent: [...inWindow]
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .slice(0, 10),
  }
}
