# Releasing

The pipeline: **GitHub → GitHub Release → npm → `npm install`.** Publishing
to npm is automated (`.github/workflows/release.yml`) and gated on a
GitHub Release actually being published — nothing reaches npm from a bare
tag push or a merge to `main`.

This is a maintainer runbook — steps a human runs with real GitHub/npm
credentials. Nothing here executes itself.

## One-time setup (before the first release)

1. **npm org access.** Confirm you can publish under the `@peerbits`
   scope: `npm whoami`, `npm org ls peerbits`. If the org doesn't exist
   yet, create it at https://www.npmjs.com/org/create (free for public
   packages) and add your account.
2. **`NPM_TOKEN` repo secret.** Generate an npm **Automation** token
   (npmjs.com → Access Tokens → Generate New Token → Automation — this
   type bypasses 2FA prompts for CI, which is what you want for a
   workflow-triggered publish). Add it as a repository secret named
   `NPM_TOKEN`: GitHub repo → Settings → Secrets and variables → Actions.
3. Confirm `package.json`'s `publishConfig.access` is `"public"` (it is,
   as of this repo's initial commit) — scoped packages publish private by
   default otherwise, which fails with `402 Payment Required` for a free
   account.

## Cutting a release

1. **Bump the version** in `package.json` (semver — this is still alpha,
   so `0.1.0` → `0.1.1`/`0.2.0` as appropriate; no `1.0.0` until the API
   is considered stable).
2. **Update `CHANGELOG.md`** — move `[Unreleased]` content (if any) into a
   new dated entry matching the version you just set, following
   [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
3. **Run the full QA suite locally** before tagging — don't rely on CI to
   catch it first:
   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm test
   npm run build
   npm pack --dry-run   # sanity-check tarball contents one more time
   ```
4. **Commit, tag, push:**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore(release): v0.1.0"
   git tag v0.1.0
   git push origin main --tags
   ```
5. **Create the GitHub Release** from that tag — either:
   ```bash
   gh release create v0.1.0 --title "v0.1.0" --notes-from-tag
   ```
   or via the GitHub UI: Releases → Draft a new release → choose the
   `v0.1.0` tag → publish. Copy the relevant `CHANGELOG.md` entry into the
   release notes either way.
6. **Publishing the release** (step 5) fires `.github/workflows/release.yml`
   automatically: it re-runs lint/typecheck/test/build, confirms the tag
   matches `package.json`'s version, then runs `npm publish --provenance`.
   Watch the Actions tab for that run.
7. **Verify:**
   ```bash
   npm view @peerbits/hl7-parser
   npm install @peerbits/hl7-parser   # in a scratch dir, confirm it installs
   ```
   Also confirm the npm listing shows a provenance badge (npmjs.com →
   package page → "Provenance") — that's the CI-run-to-published-package
   link `--provenance` establishes.

## If the release workflow fails

The tag/GitHub Release still exists even if the npm publish step failed
(e.g. `NPM_TOKEN` missing/expired, version-mismatch guard tripped). Fix
the underlying issue, then re-publish manually from a clean checkout of
that tag:

```bash
git checkout v0.1.0
npm ci && npm run build
npm publish   # publishConfig.access=public is already set in package.json
```

Do not re-tag or re-create the GitHub Release to retry — tags are meant to
be immutable once published.
