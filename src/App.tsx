
import { useState, type ChangeEvent } from 'react'
import AdherenceHistoryScreen from './components/AdherenceHistoryScreen'
import RoleStartScreen from './components/RoleStartScreen'
import {
  createSeededHistory,
  hasScheduledTime,
  summarizeAdherence,
  toDateKey,
  upsertDoseRecord,
  type AdherenceSummary,
  type DoseRecord,
  type DoseStatus,
} from './data/doseHistory'
import { getRole, type RoleId } from './data/roles'

type Status = 'taken' | 'due' | 'upcoming'

type Medicine = {
  name: string
  dose: string
  time: string
  instruction: string
  status: Status
  category: 'Morning' | 'Lunch' | 'Evening' | 'As Needed'
  prescriber: string
}

type BrowserAPI = {
  speechSynthesis?: {
    cancel: () => void
    speak: (utterance: { text: string }) => void
  }
  SpeechSynthesisUtterance?: new (text: string) => { text: string }
  confirm?: (message: string) => boolean
  print?: () => void
}

const browser = globalThis as unknown as BrowserAPI

const initialMedicines: Medicine[] = [
  {
    name: 'Lisinopril',
    dose: '10 mg',
    time: '8:05 AM',
    instruction: 'Blood pressure management · Take in morning with food',
    status: 'taken',
    category: 'Morning',
    prescriber: 'Dr. Reynolds',
  },
  {
    name: 'Vitamin D3',
    dose: '2,000 IU',
    time: '8:06 AM',
    instruction: 'Bone health and immunity · Dietary supplement',
    status: 'taken',
    category: 'Morning',
    prescriber: 'Self-administered',
  },
  {
    name: 'Aspirin Low Dose',
    dose: '81 mg',
    time: '8:06 AM',
    instruction: 'Cardiovascular prevention · Enteric coated',
    status: 'taken',
    category: 'Morning',
    prescriber: 'Dr. Martinez',
  },
  {
    name: 'Metformin Hydrochloride',
    dose: '500 mg',
    time: '12:30 PM',
    instruction: 'Type 2 diabetes regulation · Take with lunch and water',
    status: 'due',
    category: 'Lunch',
    prescriber: 'Dr. Reynolds',
  },
  {
    name: 'Atorvastatin',
    dose: '20 mg',
    time: '8:00 PM',
    instruction: 'Cholesterol control · Take at bedtime',
    status: 'upcoming',
    category: 'Evening',
    prescriber: 'Dr. Martinez',
  },
  {
    name: 'Albuterol Inhaler',
    dose: '90 mcg',
    time: 'As needed',
    instruction: 'For acute breathing symptoms · Demo entry',
    status: 'upcoming',
    category: 'As Needed',
    prescriber: 'Dr. Reynolds',
  },
]

const navigation = [
  { icon: '▦', label: "Elderly Person's Dashboard" },
  { icon: '▣', label: 'Medication Schedule' },
  { icon: '☑', label: 'Adherence History' },
  { icon: '▦', label: 'Doctor Appointments' },
  { icon: '♧', label: 'Care Team & Activity' },
  { icon: '▤', label: 'Health Profile' },
  { icon: '⚙', label: 'Settings & Security' },
]

const categoryForTime = (time: string): Medicine['category'] => {
  if (time === '8:00 AM') return 'Morning'
  if (time === '12:30 PM') return 'Lunch'
  return 'Evening'
}

const panel = 'rounded-2xl bg-white p-5 shadow-sm'

const buttonPrimary =
  'rounded-xl bg-[#071e70] px-4 py-3 text-sm font-bold text-white hover:bg-blue-900'

const buttonSoft =
  'rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 hover:bg-blue-100'

function App() {
  const [medicines, setMedicines] = useState<Medicine[]>(initialMedicines)
  const [doseLog, setDoseLog] = useState<DoseRecord[]>(() =>
    createSeededHistory(initialMedicines),
  )
  const [activePage, setActivePage] = useState("Elderly Person's Dashboard")
  const [fontSize, setFontSize] = useState(14)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'timeline' | 'weekly'>('timeline')
  const [filter, setFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDose, setNewDose] = useState('')
  const [newTime, setNewTime] = useState('8:00 AM')
  const [roleId, setRoleId] = useState<RoleId | null>(null)

  const role = roleId ? getRole(roleId) : null

  const chooseRole = (id: RoleId) => {
    const nextRole = getRole(id)
    setRoleId(id)
    setActivePage(nextRole.defaultPage)
    setMessage('')
  }

  if (!role) {
    return <RoleStartScreen onSelect={chooseRole} />
  }

  const switchRole = () => {
    setRoleId(null)
    setMessage('')
  }

  const takenCount = medicines.filter((m) => m.status === 'taken').length
  const pendingCount = medicines.filter((m) => m.status !== 'taken').length

  const adherence = summarizeAdherence(doseLog)
  const pendingScheduledToday = medicines.filter(
    (m) => hasScheduledTime(m.time) && m.status !== 'taken',
  ).length

  // Writes the timestamped dose record the adherence report is calculated from.
  const recordDose = (medicine: Medicine, status: DoseStatus) => {
    const now = new Date()

    setDoseLog((current) =>
      upsertDoseRecord(current, {
        date: toDateKey(now),
        medicine: medicine.name,
        dose: medicine.dose,
        scheduledTime: medicine.time,
        status,
        recordedAt: now.toISOString(),
      }),
    )
  }

  const markAsTaken = (name: string) => {
    const medicine = medicines.find((m) => m.name === name)

    setMedicines((current) =>
      current.map((m) => (m.name === name ? { ...m, status: 'taken' } : m)),
    )

    if (medicine) recordDose(medicine, 'taken')

    setMessage(`${name} marked as taken. Demo adherence record updated.`)
  }

  const skipDose = (name: string) => {
    const confirmed = browser.confirm
      ? browser.confirm(`Skip ${name}? This is a demo action only.`)
      : true

    if (confirmed) {
      const medicine = medicines.find((m) => m.name === name)

      setMedicines((current) =>
        current.map((m) =>
          m.name === name ? { ...m, status: 'upcoming' } : m,
        ),
      )

      if (medicine) recordDose(medicine, 'skipped')

      setMessage(`${name} marked as skipped in this demo.`)
    }
  }

  const readWelcome = () => {
    if (browser.speechSynthesis && browser.SpeechSynthesisUtterance) {
      browser.speechSynthesis.cancel()
      browser.speechSynthesis.speak(
        new browser.SpeechSynthesisUtterance(role.readAloud),
      )
    } else {
      setMessage('Voice reading is not supported in this browser.')
    }
  }

  const addMedicine = () => {
    if (!newName.trim() || !newDose.trim()) {
      setMessage('Please enter the medicine name and dose.')
      return
    }

    setMedicines((current) => [
      ...current,
      {
        name: newName.trim(),
        dose: newDose.trim(),
        time: newTime,
        instruction:
          'New medicine · Please follow the clinician-approved instructions.',
        status: 'upcoming',
        category: categoryForTime(newTime),
        prescriber: 'Not specified',
      },
    ])

    setNewName('')
    setNewDose('')
    setNewTime('8:00 AM')
    setShowAdd(false)
    setMessage('Medicine added to this demo schedule.')
  }

  const changePage = (page: string) => {
    setActivePage(page)
    setMessage(
      page === "Elderly Person's Dashboard" ||
      page === 'Medication Schedule' ||
      page === 'Adherence History'
        ? ''
        : `${page} is the next screen to be developed.`,
    )
  }

  const filteredMedicines = medicines.filter((m) => {
    if (filter === 'All') return true
    if (filter === 'Archived') return false
    return m.category === filter
  })

  return (
    // App shell: header + demo strip sit in normal flow at the top, so their
    // height is never hardcoded — the strip may wrap to any number of lines on
    // narrow screens and the content below simply starts after it.
    <div
      className="app-shell flex h-dvh flex-col overflow-hidden bg-[#f6f8ff] text-[#10234d]"
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* HEADER + DEMO MODE STRIP */}
      <div className="z-50 shrink-0">
      <header className="flex h-16 w-full items-center justify-between border-b border-blue-100 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-2xl text-teal-800">
            ♡
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#10276c]">CareCircle</h1>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              Senior Care Hub
            </p>
          </div>
        </div>

        <div className="hidden rounded-full bg-blue-50 px-5 py-3 text-xs lg:block">
          ♧ {role.label} view: <strong>{role.person}</strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={readWelcome}
            className="hidden rounded-full bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900 sm:block"
          >
            🎙 Voice Assistant
          </button>
          <button
            onClick={() =>
              setMessage('DEMO ONLY: No emergency services were contacted.')
            }
            className="rounded-full bg-red-100 px-3 py-3 text-xs font-bold text-red-700"
          >
            ✚ SOS Emergency
          </button>
          <button
            onClick={() => setMessage('You have no new notifications.')}
            className="rounded-full p-2 text-xl"
          >
            ♧
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
            {role.initials}
          </div>
        </div>
      </header>

      {/* DEMO MODE STRIP */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-y border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-900">
        <p className="font-semibold">
          DEMO MODE · Simulated login · Fictional data · No real clinical system
          connected
        </p>
        <div className="flex items-center gap-2">
          <span className="hidden text-amber-800 sm:inline">
            {role.label} · {role.person}
          </span>
          <button
            onClick={switchRole}
            className="rounded-full bg-white px-3 py-1 font-bold text-amber-900 shadow-sm hover:bg-amber-100"
          >
            Switch role
          </button>
        </div>
      </div>
      </div>

      <div className="flex min-h-0 flex-1">
      {/* SIDEBAR */}
      <aside className="hidden w-60 shrink-0 overflow-y-auto bg-[#edf2ff] md:flex md:flex-col md:justify-between">
        <div className="p-4">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Primary Oversight
          </p>
          <nav className="space-y-2">
            {navigation.map((item) => (
              <button
                key={item.label}
                onClick={() => changePage(item.label)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${
                  activePage === item.label
                    ? 'bg-[#17377f] font-semibold text-white shadow'
                    : 'text-slate-600 hover:bg-blue-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-3 p-4">
          <button
            onClick={readWelcome}
            className="w-full rounded-xl bg-blue-100 p-3 text-left text-xs font-semibold text-blue-900"
          >
            🔊 Read Screen Aloud
          </button>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-blue-900">
              Emergency Circle
            </p>
            <div className="mb-2 flex justify-between text-xs">
              <div>
                <strong>Dr. Reynolds</strong>
                <p className="text-slate-500">Primary Care</p>
              </div>
              <span className="rounded-full bg-teal-100 p-2">☎</span>
            </div>
            <div className="flex justify-between text-xs">
              <div>
                <strong>Sarah (Daughter)</strong>
                <p className="text-slate-500">Primary Guardian</p>
              </div>
              <span className="rounded-full bg-teal-100 p-2">☎</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
      {/* MOBILE NAVIGATION */}
      <div className="no-print fixed bottom-0 z-50 flex w-full gap-1 overflow-x-auto border-t bg-white p-2 md:hidden">
        {navigation.map((item) => (
          <button
            key={item.label}
            onClick={() => changePage(item.label)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs ${
              activePage === item.label
                ? 'bg-blue-900 text-white'
                : 'bg-blue-50 text-blue-900'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* MAIN */}
      <main className="px-4 pb-24 pt-4 md:px-6 md:pb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="rounded-full bg-teal-100 px-3 py-2 font-semibold text-teal-800">
              ● Care Monitor Live
            </span>
            <span className="ml-2">Patient ID: #CC-8842-AM</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
            <button
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              className="rounded-full px-3 py-2 text-xs"
            >
              A−
            </button>
            <button
              onClick={() => setFontSize(14)}
              className="rounded-full bg-blue-100 px-3 py-2 text-xs font-bold"
            >
              Standard
            </button>
            <button
              onClick={() => setFontSize((s) => Math.min(20, s + 1))}
              className="rounded-full px-3 py-2 text-xs"
            >
              A+
            </button>
            <button
              onClick={readWelcome}
              className="rounded-full bg-teal-50 px-3 py-2 text-xs font-semibold"
            >
              🔊 Listen
            </button>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="ml-3 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {activePage === 'Medication Schedule' ? (
          <MedicationSchedule
            medicines={filteredMedicines}
            allMedicines={medicines}
            takenCount={takenCount}
            view={view}
            setView={setView}
            filter={filter}
            setFilter={setFilter}
            onTake={markAsTaken}
            onSkip={skipDose}
            onAdd={() => setShowAdd(true)}
            onEdit={(name) =>
              setMessage(
                `Edit details for ${name}: editing is a demo placeholder.`,
              )
            }
            adherence={adherence}
            canRecordDoses={role.canRecordDoses}
            canAddMedicine={role.canAddMedicine}
            canEditDetails={role.canEditDetails}
            readOnlyNote={role.readOnlyNote}
            onPrint={() => browser.print?.()}
            onMessage={setMessage}
          />
        ) : activePage === "Elderly Person's Dashboard" ? (
          <Dashboard
            medicines={medicines}
            takenCount={takenCount}
            pendingCount={pendingCount}
            adherence={adherence}
            greeting={role.greeting}
            canRecordDoses={role.canRecordDoses}
            readOnlyNote={role.readOnlyNote}
            onTake={markAsTaken}
            onSnooze={() =>
              setMessage('Reminder snoozed for 15 minutes (demo only).')
            }
            onRead={readWelcome}
            onPrint={() => browser.print?.()}
          />
        ) : activePage === 'Adherence History' ? (
          <AdherenceHistoryScreen
            summary={adherence}
            pendingToday={pendingScheduledToday}
          />
        ) : (
          <section className={`${panel} mt-8`}>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              CareCircle
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#10276c]">
              {activePage}
            </h2>
            <p className="mt-3 text-slate-600">
              This page is not built yet. The dashboard and Medication
              Schedule are now connected and working.
            </p>
            <button
              onClick={() => changePage('Medication Schedule')}
              className={`${buttonPrimary} mt-5`}
            >
              Open Medication Schedule
            </button>
          </section>
        )}
      </main>

      {/* ADD MEDICINE MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#10276c]">
                Add New Medicine
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-lg bg-slate-100 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Demo form. Only add fictional test information.
            </p>

            <label className="mt-5 block text-sm font-semibold">
              Medicine name
            </label>
            <input
              value={newName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNewName(e.target.value)
              }
              className="mt-2 w-full rounded-xl border p-3 text-sm"
              placeholder="e.g. Example medicine"
            />

            <label className="mt-4 block text-sm font-semibold">Dose</label>
            <input
              value={newDose}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNewDose(e.target.value)
              }
              className="mt-2 w-full rounded-xl border p-3 text-sm"
              placeholder="e.g. 10 mg"
            />

            <label className="mt-4 block text-sm font-semibold">
              Scheduled time
            </label>
            <select
              value={newTime}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setNewTime(e.target.value)
              }
              className="mt-2 w-full rounded-xl border p-3 text-sm"
            >
              <option>8:00 AM</option>
              <option>12:30 PM</option>
              <option>6:00 PM</option>
              <option>8:00 PM</option>
            </select>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className={`${buttonSoft} flex-1`}
              >
                Cancel
              </button>
              <button
                onClick={addMedicine}
                className={`${buttonPrimary} flex-1`}
              >
                Add Medicine
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="px-4 pb-6 text-center text-xs text-slate-400">
        CareCircle · Demonstration application · Fictional patient data
      </footer>
      </div>
      </div>
    </div>
  )
}

function Dashboard({
  medicines,
  takenCount,
  pendingCount,
  adherence,
  greeting,
  canRecordDoses,
  readOnlyNote,
  onTake,
  onSnooze,
  onRead,
  onPrint,
}: {
  medicines: Medicine[]
  takenCount: number
  pendingCount: number
  adherence: AdherenceSummary
  greeting: string
  canRecordDoses: boolean
  readOnlyNote: string
  onTake: (name: string) => void
  onSnooze: () => void
  onRead: () => void
  onPrint: () => void
}) {
  const dueMedicine = medicines.find((m) => m.status === 'due')

  return (
    <>
      <section className="mb-5 rounded-3xl bg-gradient-to-r from-white via-[#edf2ff] to-[#d7f6f4] p-6 shadow-sm lg:p-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal-800">
          ☼ Sunday, November 15, 2026
        </p>
        <h2 className="mb-3 text-3xl font-bold text-[#10276c] lg:text-4xl">
          {greeting}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          You are doing wonderfully today. You have safely taken{' '}
          <strong className="text-blue-900">
            {takenCount} of {medicines.length}
          </strong>{' '}
          scheduled medications.
        </p>
        <button onClick={onRead} className={`${buttonPrimary} mt-5`}>
          🎙 Ask Voice Helper
        </button>
      </section>

      {dueMedicine && (
        <section className="mb-5 rounded-3xl border-l-8 border-teal-700 bg-white p-5 shadow-md">
          <p className="text-xs font-bold text-teal-800">
            ⏳ Scheduled for {dueMedicine.time} · Demo reminder
          </p>
          <h3 className="mt-2 text-2xl font-bold text-[#10276c]">
            {dueMedicine.name}
          </h3>
          <p className="text-lg font-semibold text-slate-700">
            {dueMedicine.dose}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {dueMedicine.instruction}
          </p>
          {canRecordDoses ? (
            <>
              <button
                onClick={() => onTake(dueMedicine.name)}
                className={`${buttonPrimary} mt-4 w-full sm:w-auto`}
              >
                ✓ I've Taken This Medicine
              </button>
              <button
                onClick={onSnooze}
                className={`${buttonSoft} mt-2 sm:ml-2`}
              >
                ◷ Snooze 15 Min
              </button>
            </>
          ) : (
            <p className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              🔒 {readOnlyNote}
            </p>
          )}
        </section>
      )}

      <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Summary
          title="Taken Today"
          value={`${medicines.length ? Math.round((takenCount / medicines.length) * 100) : 0}%`}
          detail={`${takenCount} / ${medicines.length} doses`}
        />
        <Summary
          title="Next Due"
          value={dueMedicine?.time ?? 'All done'}
          detail={dueMedicine?.name ?? 'No due medicine'}
        />
        <Summary
          title="Pending"
          value={String(pendingCount)}
          detail="Remaining doses"
        />
        <Summary
          title="Adherence (7 days)"
          value={`${adherence.percent}%`}
          detail={`${adherence.label} · demo records`}
        />
      </section>

      <section className={`${panel} mb-5`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#10276c]">
              Today's Medication Schedule
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Chronological record · Fictional demo data
            </p>
          </div>
          <button onClick={onPrint} className={buttonSoft}>
            ▤ Print Schedule
          </button>
        </div>

        <div className="space-y-3">
          {medicines.map((m) => (
            <div
              key={m.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f6f8ff] p-4"
            >
              <div>
                <p className="font-semibold">
                  {m.name}{' '}
                  <span className="text-xs text-slate-500">{m.dose}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{m.instruction}</p>
                <p className="mt-1 text-xs text-slate-400">{m.time}</p>
              </div>
              {m.status === 'taken' ? (
                <span className="rounded-full bg-teal-100 px-3 py-2 text-xs font-bold text-teal-900">
                  ✓ TAKEN
                </span>
              ) : (
                <span className="rounded-full bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-900">
                  {m.status === 'due' ? 'DUE' : 'UPCOMING'}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className={panel}>
          <h3 className="text-xl font-bold text-[#10276c]">
            ▦ Doctor Appointments
          </h3>
          <div className="mt-4 rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-semibold text-red-700">
              Tomorrow · Monday, November 16, 2026
            </p>
            <h4 className="mt-3 text-lg font-bold">Dr. Elena Martinez</h4>
            <p className="text-xs text-teal-800">
              Senior Cardiologist · Heart & Vascular Clinic
            </p>
            <p className="mt-2 text-xs text-slate-500">
              10:30 AM · Memorial Health Pavilion
            </p>
          </div>
        </div>

        <div className={panel}>
          <h3 className="text-xl font-bold text-[#10276c]">
            ♧ CareCircle Live Feed
          </h3>
          <div className="mt-4 rounded-2xl bg-[#f5f7ff] p-4 text-sm">
            <strong>Sarah (Daughter)</strong>
            <p className="mt-2 text-xs text-slate-600">
              "Love you, Dad! See you tomorrow for your doctor trip."
            </p>
          </div>
          <div className="mt-3 rounded-2xl bg-teal-50 p-4 text-sm">
            <strong>Nurse Brenda, RN</strong>
            <p className="mt-2 text-xs text-slate-600">
              Weekly home visit · Demo activity entry.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

function Summary({
  title,
  value,
  detail,
}: {
  title: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[10px] uppercase text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-teal-800">{value}</p>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function MedicationSchedule({
  medicines,
  allMedicines,
  takenCount,
  view,
  setView,
  filter,
  setFilter,
  adherence,
  canRecordDoses,
  canAddMedicine,
  canEditDetails,
  readOnlyNote,
  onTake,
  onSkip,
  onAdd,
  onEdit,
  onPrint,
  onMessage,
}: {
  medicines: Medicine[]
  allMedicines: Medicine[]
  takenCount: number
  view: 'timeline' | 'weekly'
  setView: (v: 'timeline' | 'weekly') => void
  filter: string
  setFilter: (v: string) => void
  adherence: AdherenceSummary
  canRecordDoses: boolean
  canAddMedicine: boolean
  canEditDetails: boolean
  readOnlyNote: string
  onTake: (name: string) => void
  onSkip: (name: string) => void
  onAdd: () => void
  onEdit: (name: string) => void
  onPrint: () => void
  onMessage: (m: string) => void
}) {
  const groups: Medicine['category'][] = [
    'Morning',
    'Lunch',
    'Evening',
    'As Needed',
  ]

  const due = allMedicines.find((m) => m.status === 'due')

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            Care Plan › Medication Regimen › Arthur Morgan (74y)
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#10276c]">
            Medication Schedule & Prescriptions
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage daily dosing times, sync smart pill dispenser, and monitor
            clinical adherence in real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canAddMedicine && (
            <button onClick={onAdd} className={buttonPrimary}>
              ⊕ Add New Medicine
            </button>
          )}
          <button
            onClick={() =>
              onMessage(
                'Smart dispenser connection is simulated. No device was contacted.',
              )
            }
            className={buttonSoft}
          >
            ↻ Sync Dispenser · Demo
          </button>
          <button onClick={onPrint} className={buttonSoft}>
            ▤
          </button>
        </div>
      </div>

      {!canRecordDoses && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">
          🔒 {readOnlyNote} · This demo role can review the record but cannot
          change it.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl bg-[#edf2ff] p-3">
        <button
          onClick={() => setView('timeline')}
          className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            view === 'timeline'
              ? 'bg-white text-blue-900 shadow'
              : 'text-slate-600'
          }`}
        >
          ▣ Today (Timeline)
        </button>

        <button
          onClick={() => setView('weekly')}
          className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            view === 'weekly'
              ? 'bg-white text-blue-900 shadow'
              : 'text-slate-600'
          }`}
        >
          ▥ Weekly Grid View
        </button>

        <button
          onClick={() => setFilter('All')}
          className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            filter === 'All'
              ? 'bg-white text-blue-900 shadow'
              : 'text-slate-600'
          }`}
        >
          ☷ All Active Medications ({allMedicines.length})
        </button>

        <button
          onClick={() => setFilter('Archived')}
          className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            filter === 'Archived'
              ? 'bg-white text-blue-900 shadow'
              : 'text-slate-600'
          }`}
        >
          ▤ Archived
        </button>

        <div className="ml-auto flex flex-wrap gap-1">
          {['All', 'Morning', 'Lunch', 'Evening', 'As Needed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-2 text-[10px] font-semibold ${
                filter === f
                  ? 'bg-teal-200 text-teal-900'
                  : 'bg-white text-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {due && filter !== 'Archived' && (
        <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-teal-100 p-4 text-2xl text-teal-900">
                ◷
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-800">
                  Upcoming Immediate Dose · Due in 25 mins
                </p>
                <h3 className="mt-1 text-xl font-bold text-[#10276c]">
                  {due.name} {due.dose}
                </h3>
                <p className="text-xs text-slate-500">
                  Scheduled for Lunch ({due.time}) · Take with meal & water
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {canRecordDoses && (
                <button
                  onClick={() => onTake(due.name)}
                  className="rounded-xl bg-teal-800 px-4 py-3 text-xs font-bold text-white"
                >
                  ✓ Take Dose Now
                </button>
              )}
              {canRecordDoses && (
                <button
                  onClick={() => onSkip(due.name)}
                  className="rounded-xl px-3 py-3 text-xs font-semibold text-slate-600"
                >
                  Skip
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold">Smart Dispenser</h3>
            <span className="mt-2 inline-block rounded-full bg-teal-100 px-3 py-1 text-[10px] font-bold text-teal-900">
              ● Demo Online
            </span>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              PillSafe Pro 4-Chamber Hub · Example device information for
              Arthur's kitchen.
            </p>
            <p className="mt-3 text-sm font-semibold">Tray Chamber Capacity</p>
            <div className="mt-2 h-2 rounded-full bg-blue-100">
              <div className="h-2 w-3/4 rounded-full bg-teal-700" />
            </div>
            <button
              onClick={() =>
                onMessage(
                  'Demo sound test. No physical dispenser was activated.',
                )
              }
              className={`${buttonSoft} mt-4 w-full text-xs`}
            >
              ♬ Test Sound & Chime Alarm
            </button>
          </div>
        </section>
      )}

      {view === 'weekly' ? (
        <section className={`${panel} mb-5 overflow-x-auto`}>
          <h3 className="mb-4 text-xl font-bold text-[#10276c]">
            Weekly Medication Grid
          </h3>
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="bg-blue-50">
                {['Medicine', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                  (d) => (
                    <th key={d} className="p-3">
                      {d}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {allMedicines.map((m) => (
                <tr key={m.name} className="border-b">
                  <td className="p-3 font-semibold">{m.name}</td>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    (d, i) => (
                      <td key={d} className="p-3">
                        <span
                          className={`rounded-full px-2 py-1 ${
                            i === 0 && m.status === 'taken'
                              ? 'bg-teal-100 text-teal-900'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {i === 0 && m.status === 'taken' ? '✓' : '○'}
                        </span>
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-400">
            Illustrative weekly grid · Other days are sample placeholders, not
            recorded doses.
          </p>
        </section>
      ) : (
        <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {filter === 'Archived' ? (
              <div className={panel}>
                <p className="text-sm text-slate-500">
                  No archived prescriptions in this demo.
                </p>
              </div>
            ) : (
              groups
                .filter((g) => filter === 'All' || filter === g)
                .map((group) => {
                  const items = medicines.filter((m) => m.category === group)

                  if (items.length === 0) return null

                  return (
                    <section key={group}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xl font-semibold text-[#10276c]">
                          {group === 'Morning'
                            ? '☼'
                            : group === 'Lunch'
                              ? '♜'
                              : group === 'Evening'
                                ? '☾'
                                : '✚'}{' '}
                          {group} Regimen ·{' '}
                          {group === 'Morning'
                            ? '8:00 AM'
                            : group === 'Lunch'
                              ? '12:30 PM'
                              : group === 'Evening'
                                ? '8:00 PM'
                                : 'On Demand'}
                        </h3>
                        <span className="rounded-full bg-teal-100 px-3 py-2 text-[10px] font-semibold text-teal-900">
                          {items.every((m) => m.status === 'taken')
                            ? '✓ All doses taken'
                            : group === 'Lunch'
                              ? 'Action Pending'
                              : 'Scheduled'}
                        </span>
                      </div>

                      {items.map((m) => (
                        <div
                          key={m.name}
                          className="mb-3 rounded-2xl bg-white p-5 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xl text-teal-800">
                                ◉
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-[#10276c]">
                                  {m.name} {m.dose}
                                </h4>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px]">
                                    Tablet / Dose
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                      m.status === 'taken'
                                        ? 'bg-teal-100 text-teal-900'
                                        : m.status === 'due'
                                          ? 'bg-amber-100 text-amber-900'
                                          : 'bg-blue-100 text-blue-900'
                                    }`}
                                  >
                                    {m.status === 'taken'
                                      ? `✓ Taken at ${m.time}`
                                      : m.status === 'due'
                                        ? `◷ Due at ${m.time}`
                                        : `Scheduled ${m.time}`}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-slate-600">
                                  {m.instruction}
                                </p>
                                <p className="mt-2 text-xs text-slate-500">
                                  ♙ {m.prescriber} · Prescription demo record
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {canRecordDoses && m.status !== 'taken' && (
                                <button
                                  onClick={() => onTake(m.name)}
                                  className={buttonPrimary}
                                >
                                  ✓ Take Dose Now
                                </button>
                              )}
                              {canEditDetails && (
                                <button
                                  onClick={() => onEdit(m.name)}
                                  className={buttonSoft}
                                >
                                  Edit Details
                                </button>
                              )}
                              {canRecordDoses && m.status !== 'taken' && (
                                <button
                                  onClick={() => onSkip(m.name)}
                                  className="rounded-xl px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                  Skip
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </section>
                  )
                })
            )}
          </div>

          <aside className="space-y-5">
            <div className={panel}>
              <h3 className="text-xl font-semibold">♧ Pharmacy Refill Hub</h3>
              <span className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-[10px] font-bold text-red-700">
                1 Due Soon · Demo
              </span>
              <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                <p className="font-bold text-blue-900">CVS Pharmacy #4829</p>
                <p className="mt-2 text-xs text-slate-600">
                  Example pharmacy listing
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Aspirin 81 mg · Refill reminder in 5 days (sample)
                </p>
              </div>
              <button
                onClick={() =>
                  onMessage('Demo only: no pharmacy request was sent.')
                }
                className={`${buttonPrimary} mt-4 w-full text-xs`}
              >
                ➤ Request Pharmacy 1-Click Refill
              </button>
              <p className="mt-2 text-[10px] text-slate-400">
                Simulation only · No prescription or refill request is
                transmitted.
              </p>
            </div>

            <div className={panel}>
              <h3 className="text-xl font-semibold text-[#10276c]">
                ♧ Circle Verification
              </h3>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Changes to this schedule would notify authorized clinical
                guardians in a connected production system.
              </p>
              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs">
                <strong>Brenda Sullivan, RN</strong>
                <p className="text-slate-500">
                  Visiting Geriatric Nurse · Demo
                </p>
              </div>
              <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs">
                <strong>Sarah Morgan</strong>
                <p className="text-slate-500">
                  Daughter / Healthcare Proxy · Demo
                </p>
              </div>
              <div className="mt-4 rounded-xl bg-[#edf2ff] p-4">
                <p className="text-[10px] font-bold uppercase">
                  7-Day Adherence · Demo Records
                </p>
                <p className="mt-1 text-2xl font-bold text-teal-800">
                  {adherence.percent}%
                </p>
                <p className="text-xs text-slate-500">
                  {adherence.taken} of {adherence.total} recorded doses taken ·
                  calculated from this demo’s own log, not clinical history.
                </p>
              </div>
            </div>

            <div className={panel}>
              <h3 className="font-bold text-[#10276c]">Schedule Summary</h3>
              <p className="mt-3 text-sm">
                Taken today: <strong>{takenCount}</strong>
              </p>
              <p className="mt-1 text-sm">
                Active medicines: <strong>{allMedicines.length}</strong>
              </p>
              <button
                onClick={onPrint}
                className={`${buttonSoft} mt-4 w-full`}
              >
                ▤ Print Schedule
              </button>
            </div>
          </aside>
        </section>
      )}
    </>
  )
}

export default App
