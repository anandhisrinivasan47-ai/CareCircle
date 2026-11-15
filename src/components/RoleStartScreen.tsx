import { ROLES, type RoleId } from '../data/roles'

type Props = {
  onSelect: (id: RoleId) => void
}

function RoleStartScreen({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-[#f6f8ff] px-4 py-10 text-[#10234d]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-3xl text-teal-800">
            ♡
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#10276c]">CareCircle</h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Senior Care Hub
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm lg:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
            Demo sign-in
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#10276c]">
            Who is using CareCircle today?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Choose a role to see the same care circle from a different point of
            view. No password is needed, and nothing is sent anywhere.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => onSelect(role.id)}
                className="rounded-2xl border border-blue-100 bg-[#f6f8ff] p-5 text-left transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl shadow-sm"
                  >
                    {role.icon}
                  </span>
                  <div>
                    <p className="text-lg font-bold text-[#10276c]">
                      {role.label}
                    </p>
                    <p className="text-xs text-slate-500">{role.person}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{role.summary}</p>
                <p className="mt-3 text-xs font-semibold text-teal-800">
                  Continue as {role.label} →
                </p>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          <strong>Demo only.</strong> These are simulated roles for a hackathon
          prototype with fictional patient data (Arthur Morgan, 74). No real
          authentication, no medical records and no emergency service are
          connected.
        </p>
      </div>
    </div>
  )
}

export default RoleStartScreen
