export type RoleId = 'elderly' | 'family' | 'caregiver' | 'clinician'

export type Role = {
  id: RoleId
  label: string
  person: string
  relationship: string
  initials: string
  icon: string
  summary: string
  defaultPage: string
  greeting: string
  readAloud: string
  readOnlyNote: string
  canRecordDoses: boolean
  canAddMedicine: boolean
  canEditDetails: boolean
}

// Simulated roles for the hackathon demo. No authentication is performed.
export const ROLES: Role[] = [
  {
    id: 'elderly',
    label: 'Elderly Person',
    person: 'Arthur Morgan, 74',
    relationship: 'Patient',
    initials: 'AM',
    icon: '🧑‍🦳',
    summary: "See my medicines and today's care.",
    defaultPage: "Elderly Person's Dashboard",
    greeting: 'Good morning, Arthur!',
    readAloud:
      'Good morning Arthur. Welcome to your CareCircle medication dashboard.',
    readOnlyNote: '',
    canRecordDoses: true,
    canAddMedicine: true,
    canEditDetails: true,
  },
  {
    id: 'family',
    label: 'Family Member',
    person: 'Sarah Morgan',
    relationship: 'Daughter · Healthcare proxy',
    initials: 'SM',
    icon: '👨‍👩‍👧',
    summary: 'Check that Dad is on track.',
    defaultPage: "Elderly Person's Dashboard",
    greeting: 'Good evening, Sarah',
    readAloud:
      'Family view. Here is Arthur Morgan’s care status for today. You can review the record, but only Arthur or his caregiver can record a dose.',
    readOnlyNote: 'Read-only view for family members',
    canRecordDoses: false,
    canAddMedicine: false,
    canEditDetails: false,
  },
  {
    id: 'caregiver',
    label: 'Caregiver',
    person: 'Brenda Sullivan, RN',
    relationship: 'Visiting geriatric nurse',
    initials: 'BS',
    icon: '🩺',
    summary: 'Log visits and record doses.',
    defaultPage: 'Medication Schedule',
    greeting: 'Good morning, Brenda',
    readAloud:
      'Caregiver view. Arthur Morgan’s medication schedule is open so you can record doses after each visit.',
    readOnlyNote: '',
    canRecordDoses: true,
    canAddMedicine: true,
    canEditDetails: true,
  },
  {
    id: 'clinician',
    label: 'Clinician',
    person: 'Dr. Alan Reynolds',
    relationship: 'Primary care physician',
    initials: 'AR',
    icon: '⚕️',
    summary: 'Review the regimen and adherence.',
    defaultPage: 'Medication Schedule',
    greeting: "Dr. Reynolds' clinical view",
    readAloud:
      'Clinical view. You are reviewing Arthur Morgan’s medication regimen and adherence record. Doses are recorded by the patient or caregiver.',
    readOnlyNote: 'Recorded by patient or caregiver',
    canRecordDoses: false,
    canAddMedicine: true,
    canEditDetails: true,
  },
]

export const getRole = (id: RoleId): Role =>
  ROLES.find((role) => role.id === id) ?? ROLES[0]
