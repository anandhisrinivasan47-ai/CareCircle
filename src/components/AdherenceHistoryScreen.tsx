import {
  formatShortDate,
  formatTimestamp,
  type AdherenceSummary,
  type DoseStatus,
} from '../data/doseHistory'

type Props = {
  summary: AdherenceSummary
  pendingToday: number
}

const panel = 'rounded-2xl bg-white p-5 shadow-sm'

// Everything the screen needs to know about a dose status, in one place.
const STATUS: Record<
  DoseStatus,
  { legend: string; label: string; chip: string; bar: string }
> = {
  taken: {
    legend: 'Taken',
    label: '✓ Taken',
    chip: 'bg-teal-100 text-teal-900',
    bar: 'bg-teal-600',
  },
  skipped: {
    legend: 'Skipped',
    label: '↷ Skipped',
    chip: 'bg-amber-100 text-amber-900',
    bar: 'bg-amber-500',
  },
  missed: {
    legend: 'Missed',
    label: '✕ Missed',
    chip: 'bg-red-100 text-red-800',
    bar: 'bg-red-400',
  },
}

const DOSE_STATUSES: DoseStatus[] = ['taken', 'skipped', 'missed']

// A bar segment's width as a CSS percentage.
const share = (value: number, total: number): string =>
  total === 0 ? '0%' : `${(value / total) * 100}%`

function StatCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string
  value: string
  detail: string
  tone: string
}) {
  return (
    <div className={panel}>
      <p className="text-[10px] uppercase text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function AdherenceHistoryScreen({ summary, pendingToday }: Props) {
  const isSingleDose = pendingToday === 1

  return (
    <>
      <div className="mb-5">
        <p className="text-xs text-slate-500">
          Care Plan › Adherence › Arthur Morgan (74y)
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#10276c]">
          Adherence History & Reports
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Every figure below is calculated from the demo dose records in this
          app — {summary.taken} taken, {summary.skipped} skipped and{' '}
          {summary.missed} missed across the last {summary.days} days (
          {formatShortDate(summary.from)} – {formatShortDate(summary.to)}).
        </p>
        <p className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-900">
          DEMO RECORDS · Fictional history, not a clinical record
        </p>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title={`${summary.days}-Day Adherence`}
          value={`${summary.percent}%`}
          detail={summary.label}
          tone="text-teal-800"
        />
        <StatCard
          title="Taken"
          value={String(summary.taken)}
          detail={`of ${summary.total} recorded doses`}
          tone="text-teal-800"
        />
        <StatCard
          title="Skipped"
          value={String(summary.skipped)}
          detail="Recorded as skipped"
          tone="text-amber-800"
        />
        <StatCard
          title="Missed"
          value={String(summary.missed)}
          detail="No action was recorded"
          tone="text-red-700"
        />
      </section>

      <section className={`${panel} mb-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-[#10276c]">Daily Breakdown</h3>
          <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-slate-600">
            {DOSE_STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${STATUS[status].bar}`} />
                {STATUS[status].legend}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {summary.byDay.map((day) => (
            <div key={day.date}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-[#10276c]">{day.label}</span>
                <span className="text-slate-500">
                  {day.total === 0
                    ? 'No records'
                    : `${day.percent}% · ${day.taken} taken · ${day.skipped} skipped · ${day.missed} missed`}
                </span>
              </div>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
                {DOSE_STATUSES.map((status) => (
                  <div
                    key={status}
                    className={STATUS[status].bar}
                    style={{ width: share(day[status], day.total) }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className={`${panel} overflow-x-auto`}>
          <h3 className="mb-4 text-xl font-bold text-[#10276c]">
            By Medicine
          </h3>
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="bg-blue-50">
                <th className="p-3">Medicine</th>
                <th className="p-3">Taken</th>
                <th className="p-3">Skipped</th>
                <th className="p-3">Missed</th>
                <th className="p-3">Adherence</th>
              </tr>
            </thead>
            <tbody>
              {summary.byMedicine.map((item) => (
                <tr key={item.medicine} className="border-b last:border-0">
                  <td className="p-3 font-semibold">{item.medicine}</td>
                  <td className="p-3 text-teal-800">{item.taken}</td>
                  <td className="p-3 text-amber-800">{item.skipped}</td>
                  <td className="p-3 text-red-700">{item.missed}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-900">
                      {item.percent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[10px] text-slate-400">
            “As needed” medicines are excluded because they have no scheduled
            dose to adhere to.
          </p>
        </section>

        <section className={panel}>
          <h3 className="text-xl font-bold text-[#10276c]">Recent Activity</h3>
          <div className="mt-4 space-y-3">
            {summary.recent.map((record) => (
              // One record per medicine per day, so this key never repeats.
              <div
                key={`${record.date}-${record.medicine}`}
                className="rounded-xl bg-[#f6f8ff] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {record.medicine}{' '}
                    <span className="text-xs text-slate-500">
                      {record.dose}
                    </span>
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATUS[record.status].chip}`}
                  >
                    {STATUS[record.status].label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {record.status === 'missed' ? 'Auto-marked missed ' : ''}
                  {formatTimestamp(record.recordedAt)} · scheduled{' '}
                  {record.scheduledTime}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            Timestamps come from this demo session and its seeded history.
          </p>
        </section>
      </div>

      <section className={panel}>
        <h3 className="text-lg font-bold text-[#10276c]">Report Notes</h3>
        <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
          <li>
            <strong>{pendingToday}</strong>{' '}
            {isSingleDose
              ? 'dose on today’s schedule is still pending and is'
              : 'doses on today’s schedule are still pending and are'}{' '}
            not counted in the percentages.
          </li>
          <li>
            “Missed” means a scheduled dose reached the end of the demo day with
            no recorded action; recorded taken/skipped doses are counted from the
            moment you tap them.
          </li>
          <li>
            CareCircle is a hackathon prototype. This report is generated from
            fictional demo data and is not a medical record, clinical history or
            treatment recommendation.
          </li>
        </ul>
      </section>
    </>
  )
}

export default AdherenceHistoryScreen
