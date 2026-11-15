export type DoseStatus = 'taken' | 'skipped' | 'missed'

export type DoseRecord = {
  date: string
  medicine: string
  dose: string
  scheduledTime: string
  status: DoseStatus
  recordedAt: string
}

export type AdherenceDay = {
  date: string
  label: string
  taken: number
  skipped: number
  missed: number
  total: number
  percent: number
}

export type AdherenceMedicine = {
  medicine: string
  taken: number
  skipped: number
  missed: number
  total: number
  percent: number
}

export type AdherenceSummary = {
  days: number
  from: string
  to: string
  taken: number
  skipped: number
  missed: number
  total: number
  percent: number
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

// Demo history covers six completed days; today is built from the live schedule.
const SEEDED_DAYS = 6

// Deterministic fictional pattern, one row per past day and one entry per
// scheduled medicine (30 taken, 2 skipped, 1 missed over six days).
const SEEDED_STATUSES: DoseStatus[][] = [
  ['taken', 'taken', 'taken', 'taken', 'taken'],
  ['taken', 'taken', 'skipped', 'taken', 'taken'],
  ['taken', 'taken', 'taken', 'taken', 'taken'],
  ['taken', 'taken', 'taken', 'missed', 'taken'],
  ['taken', 'taken', 'taken', 'taken', 'taken'],
  ['taken', 'skipped', 'taken', 'taken', 'taken'],
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

const parseClock = (time: string): { hours: number; minutes: number } | null => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim())

  if (!match) return null

  let hours = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hours += 12

  return { hours, minutes: Number(match[2]) }
}

export const hasScheduledTime = (time: string): boolean =>
  parseClock(time) !== null

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

const tally = (records: DoseRecord[]) => {
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

export const adherenceLabel = (percent: number, total: number): string => {
  if (total === 0) return 'No records yet'
  if (percent >= 90) return 'On track'
  if (percent >= 75) return 'Needs attention'
  return 'Below target'
}

/**
 * Builds the fictional starting history: six completed demo days plus the doses
 * already marked as taken on today's schedule.
 */
export function createSeededHistory(
  medicines: SeedMedicine[],
  today = new Date(),
): DoseRecord[] {
  const scheduled = medicines.filter((medicine) =>
    hasScheduledTime(medicine.time),
  )
  const records: DoseRecord[] = []

  SEEDED_STATUSES.forEach((statuses, index) => {
    const daysAgo = SEEDED_DAYS - index
    const dateKey = toDateKey(addDays(today, -daysAgo))

    scheduled.forEach((medicine, position) => {
      const status = statuses[position] ?? 'taken'
      const scheduledIso = combineDateAndTime(dateKey, medicine.time)
      const recordedAt =
        status === 'missed'
          ? new Date(
              new Date(scheduledIso).getTime() +
                MISSED_GRACE_HOURS * 60 * 60 * 1000,
            ).toISOString()
          : scheduledIso

      records.push({
        date: dateKey,
        medicine: medicine.name,
        dose: medicine.dose,
        scheduledTime: medicine.time,
        status,
        recordedAt,
      })
    })
  })

  const todayKey = toDateKey(today)

  scheduled.forEach((medicine) => {
    if (medicine.status !== 'taken') return

    records.push({
      date: todayKey,
      medicine: medicine.name,
      dose: medicine.dose,
      scheduledTime: medicine.time,
      status: 'taken',
      recordedAt: combineDateAndTime(todayKey, medicine.time),
    })
  })

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
  days = 7,
  today = new Date(),
): AdherenceSummary {
  const to = toDateKey(today)
  const from = toDateKey(addDays(today, -(days - 1)))
  const inWindow = records.filter(
    (record) => record.date >= from && record.date <= to,
  )

  const byDay: AdherenceDay[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dateKey = toDateKey(addDays(today, -offset))
    const dayRecords = inWindow.filter((record) => record.date === dateKey)

    byDay.push({
      date: dateKey,
      label: formatDayLabel(dateKey),
      ...tally(dayRecords),
    })
  }

  const medicineNames = [...new Set(inWindow.map((record) => record.medicine))]
  const byMedicine: AdherenceMedicine[] = medicineNames
    .map((medicine) => ({
      medicine,
      ...tally(inWindow.filter((record) => record.medicine === medicine)),
    }))
    .sort((a, b) => b.total - a.total || a.medicine.localeCompare(b.medicine))

  const totals = tally(inWindow)

  return {
    days,
    from,
    to,
    ...totals,
    label: adherenceLabel(totals.percent, totals.total),
    byDay,
    byMedicine,
    recent: [...inWindow]
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .slice(0, 10),
  }
}
