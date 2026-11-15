# CareCircle improvement update

## Scope
This update keeps the existing React + TypeScript + Vite + Tailwind application and its four demo roles. It does not introduce a new framework, database, authentication system, or external service.

## Completed in this update: testing foundation
- Added a `npm test` command using Node's built-in test runner (no new npm dependency required).
- Added 10 automated tests for dose-history behavior: date keys, valid/invalid schedule times, immutable upserts, seeded history, seeded exceptions, seven-day adherence calculations, empty history, and recent activity ordering/limits.
- Added 5 automated tests for the four demo roles and their permissions.
- Tightened clock parsing so impossible values such as `13:00 PM` and `8:60 AM` are rejected instead of being treated as scheduled times.
- Added the Node.js runtime requirement used by the test command (`>=22.6.0`).

## Verification
- `npm test`: 15 tests passed.
- `npm run lint`: passed.
- TypeScript project build (`tsc -b`): passed as part of `npm run build` before Vite bundling.
- Full Vite production bundle could not be verified in this Linux workspace because the uploaded `node_modules` contained Windows-only optional native binaries. The clean ZIP intentionally excludes `node_modules`; install dependencies on the target machine with `npm ci` before running the build.

## Run locally (Windows PowerShell)
```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

## Remaining work
Accessibility, additional security hardening, and component extraction/refactoring remain to be completed and reviewed. Role selection is still a simulated demo feature, not authentication or server-side authorization.
