# Testing the CF Pre-Push Buildpack Check

## Prerequisites

1. Install dependencies:
   `npm install`
2. Log in to Cloud Foundry:
   `cf login`
3. Make sure your local Node.js is available:
   `node -v`

## One-Time Hook Setup

Run this once so Git uses the repository hook:

`npm run prepare`

## Manual Test

Run the pre-push validation directly:

`npm run prepush:cf`

Expected behavior:

- It checks whether you are logged in to CF.
- It reads the `nodejs_buildpack` entry for `cflinuxfs4` from `cf buildpacks`.
- It extracts the buildpack filename and version.
- It compares that version with the matching GitHub release from `cloudfoundry/nodejs-buildpack`.
- It runs `node -v` locally.
- It warns if your local Node.js version is not listed as supported in that buildpack release.

## Git Hook Test

After `npm run prepare`, run a normal Git push. The pre-push hook will execute automatically before the push proceeds.
