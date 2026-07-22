# CF Pre-Push Buildpack Check

Blocks a `git push` when your local Node.js version is not supported by the
`nodejs_buildpack` version installed in your target CF environment.  
The only escape hatch is `git push --no-verify`.

---

## Where the output appears

The check runs **automatically** the moment you run `git push`.  
Output is printed directly in the same terminal window where you typed the push command — you do not need to open anything else.

### ✅ Push allowed — versions match

```
[cf-pre-push] Fetching manifest: https://raw.githubusercontent.com/cloudfoundry/nodejs-buildpack/v1.8.22/manifest.yml
[cf-pre-push] CF buildpack         : nodejs_buildpack
[cf-pre-push] CF stack             : cflinuxfs4
[cf-pre-push] CF filename          : nodejs-buildpack-cflinuxfs4-v1.8.22.zip
[cf-pre-push] CF buildpack version : v1.8.22
[cf-pre-push] Manifest URL         : https://raw.githubusercontent.com/cloudfoundry/nodejs-buildpack/v1.8.22/manifest.yml
[cf-pre-push] Supported Node.js    : 20.19.2, 18.20.8
[cf-pre-push] Local Node.js        : 20.19.2
[cf-pre-push] ✔  Node.js v20.19.2 is supported — push allowed.
```

Git proceeds with the push immediately after the last line above.

---

### ⛔ Push blocked — version mismatch

```
╔══════════════════════════════════════════════════════════════════╗
║  ⛔  CF PRE-PUSH BLOCKED                                          ║
╠══════════════════════════════════════════════════════════════════╣
║ Local Node.js v22.0.0 is NOT supported by                        ║
║ nodejs_buildpack v1.8.22 on cflinuxfs4.                          ║
║ Supported versions: 20.19.2, 18.20.8                             ║
║ Switch Node version (e.g. nvm use <version>) and try again.      ║
╠══════════════════════════════════════════════════════════════════╣
║ Fix the issue above, then push again.                            ║
║ To skip this check (NOT recommended): git push --no-verify       ║
╚══════════════════════════════════════════════════════════════════╝
```

Git aborts the push. Nothing is sent to the remote.

---

## One-time setup

Run this **once** after cloning so Git picks up the hook:

```sh
npm install        # also runs `npm run prepare` which sets core.hooksPath
```

Or manually:

```sh
npm run prepare
```

This sets `core.hooksPath = .githooks` in your local git config.  
Verify it worked:

```sh
git config core.hooksPath   # should print: .githooks
```

---

## Prerequisites

| Tool | Why |
|------|-----|
| `node` | Version is checked against the buildpack manifest |
| `cf` CLI | Used to read the installed buildpack version |
| `curl` | Used to fetch the raw `manifest.yml` from GitHub |

Log in to CF before pushing:

```sh
cf login
```

---

## How it works

1. Runs `cf target` to confirm you are logged in.
2. Runs `cf buildpacks` and finds the `nodejs_buildpack` row for stack `cflinuxfs4`.
3. Extracts the buildpack version from the `.zip` filename (e.g. `v1.8.22`).
4. Fetches the raw `manifest.yml` directly from GitHub:
   ```
   https://raw.githubusercontent.com/cloudfoundry/nodejs-buildpack/<version>/manifest.yml
   ```
5. Parses every `node` dependency entry whose `cf_stacks` list includes `cflinuxfs4`.
6. Compares the collected versions against `node -v`.
7. **Fails with exit code 1** (blocks the push) if your local version is not in the list.

---

## Manual run

You can run the check at any time without pushing:

```sh
node scripts/cf-buildpack-pre-push.mjs
```

or via npm:

```sh
npm run prepush:cf 
```

---

## Bypassing the check

Only do this in emergencies:

```sh
git push --no-verify
```
