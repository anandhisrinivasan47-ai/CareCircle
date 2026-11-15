import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createSeededHistory,
  hasScheduledTime,
  summarizeAdherence,
  toDateKey,
  upsertDoseRecord,
  type DoseRecord,
} from './doseHistory.ts'

const fixedToday = new Date(2026, 10, 15, 12, 0, 0)

const medicines = [
  { name: 'Aspirin Low Dose', dose: '81 mg', time: '8:00 AM', status: 'taken' },
  { name: 'Metformin Hydrochloride', dose: '500 mg', time: '12:30 PM', status: 'due' },
  { name: 'Vitamin D3', dose: '2,000 IU', time: '8:05 AM', status: 'taken' },
  { name: 'Rescue inhaler', dose: '1 puff', time: 'As needed', status: 'upcoming' },
]

const record = (overrides: Partial<DoseRecord> = {}): DoseRecord => ({
  date: '2026-11-15',
  medicine: 'Aspirin Low Dose',
  dose: '81 mg',
  scheduledTime: '8:00 AM',
  status: 'taken',
  recordedAt: '2026-11-15T08:00:00.000Z',
  ...overrides,
})

test('toDateKey formats local calendar dates with zero padding', () => {
  assert.equal(toDateKey(new Date(2026, 0, 5, 12)), '2026-01-05')
  assert.equal(toDateKey(new Date(2026, 10, 15, 12)), '2026-11-15')
})

test('scheduled-time detection accepts valid AM/PM times', () => {
  for (const time of ['8:05 AM', '12:00 PM', '12:00 AM', '9:45 pm']) {
    assert.equal(hasScheduledTime(time), true, time)
  }
})

test('scheduled-time detection rejects as-needed and malformed or impossible times', () => {
  for (const time of ['As needed', '8 AM', '13:00 PM', '0:30 AM', '8:60 AM', '']) {
    assert.equal(hasScheduledTime(time), false, time)
  }
})

test('upsertDoseRecord inserts a new medicine/day record without mutating input', () => {
  const original = [record()]
  const next = upsertDoseRecord(original, record({ medicine: 'Vitamin D3' }))
  assert.equal(original.length, 1)
  assert.equal(next.length, 2)
  assert.equal(next[1].medicine, 'Vitamin D3')
})

test('upsertDoseRecord updates the existing medicine/day record instead of duplicating it', () => {
  const original = [record()]
  const next = upsertDoseRecord(original, record({ status: 'skipped' }))
  assert.equal(next.length, 1)
  assert.equal(next[0].status, 'skipped')
  assert.equal(original[0].status, 'taken')
})

test('seeded history excludes as-needed medicines and includes six past days', () => {
  const seeded = createSeededHistory(medicines, fixedToday)
  assert.equal(seeded.length, 20)
  assert.equal(seeded.some((item) => item.medicine === 'Rescue inhaler'), false)
  assert.equal(seeded.filter((item) => item.date === '2026-11-15').length, 2)
})

test('seeded history applies the expected demo exceptions', () => {
  const seeded = createSeededHistory(medicines, fixedToday)
  const skipped = seeded.find((item) => item.date === '2026-11-10' && item.medicine === 'Aspirin Low Dose')
  const missed = seeded.find((item) => item.date === '2026-11-12' && item.medicine === 'Metformin Hydrochloride')
  const vitaminSkipped = seeded.find((item) => item.date === '2026-11-14' && item.medicine === 'Vitamin D3')
  assert.equal(skipped?.status, 'skipped')
  assert.equal(missed?.status, 'missed')
  assert.equal(vitaminSkipped?.status, 'skipped')
})

test('adherence summary reports a seven-day window and excludes older records', () => {
  const records = [
    record({ date: '2026-11-08', medicine: 'Old medicine' }),
    record({ date: '2026-11-09', medicine: 'Aspirin Low Dose' }),
    record({ date: '2026-11-15', medicine: 'Metformin Hydrochloride', status: 'skipped' }),
  ]
  const summary = summarizeAdherence(records, fixedToday)
  assert.equal(summary.from, '2026-11-09')
  assert.equal(summary.to, '2026-11-15')
  assert.equal(summary.days, 7)
  assert.equal(summary.total, 2)
  assert.equal(summary.taken, 1)
  assert.equal(summary.skipped, 1)
  assert.equal(summary.percent, 50)
  assert.equal(summary.byDay.length, 7)
  assert.equal(summary.byMedicine.some((item) => item.medicine === 'Old medicine'), false)
})

test('adherence summary handles an empty record set without division by zero', () => {
  const summary = summarizeAdherence([], fixedToday)
  assert.equal(summary.total, 0)
  assert.equal(summary.percent, 0)
  assert.equal(summary.label, 'No records yet')
  assert.equal(summary.byDay.length, 7)
  assert.equal(summary.recent.length, 0)
})

test('recent activity is newest first and limited to ten records', () => {
  const records = Array.from({ length: 12 }, (_, index) =>
    record({
      medicine: `Medicine ${index}`,
      recordedAt: new Date(Date.UTC(2026, 10, 15, 8, index)).toISOString(),
    }),
  )
  const summary = summarizeAdherence(records, fixedToday)
  assert.equal(summary.recent.length, 10)
  assert.equal(summary.recent[0].medicine, 'Medicine 11')
})
