import test from 'node:test'
import assert from 'node:assert/strict'
import { getRole, ROLES, type RoleId } from './roles.ts'

const roleIds: RoleId[] = ['elderly', 'family', 'caregiver', 'clinician']

test('all four demo roles are available exactly once', () => {
  assert.deepEqual(ROLES.map((role) => role.id), roleIds)
})

test('only the elderly person and caregiver can record doses', () => {
  assert.equal(getRole('elderly').canRecordDoses, true)
  assert.equal(getRole('caregiver').canRecordDoses, true)
  assert.equal(getRole('family').canRecordDoses, false)
  assert.equal(getRole('clinician').canRecordDoses, false)
})

test('family role remains read-only for medicine changes', () => {
  const family = getRole('family')
  assert.equal(family.canAddMedicine, false)
  assert.equal(family.canEditDetails, false)
  assert.match(family.readOnlyNote, /read-only/i)
})

test('clinician can add and edit medicine details but cannot record doses', () => {
  const clinician = getRole('clinician')
  assert.equal(clinician.canAddMedicine, true)
  assert.equal(clinician.canEditDetails, true)
  assert.equal(clinician.canRecordDoses, false)
})

test('every role has a person, greeting and default page', () => {
  for (const role of ROLES) {
    assert.ok(role.person.length > 0)
    assert.ok(role.greeting.length > 0)
    assert.ok(role.defaultPage.length > 0)
  }
})
