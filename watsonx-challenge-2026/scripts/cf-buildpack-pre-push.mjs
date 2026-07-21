#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const REQUIRED_STACK = 'cflinuxfs4';
const REQUIRED_BUILDPACK = 'nodejs_buildpack';
const GITHUB_RELEASE_API = 'https://api.github.com/repos/cloudfoundry/nodejs-buildpack/releases/tags';

function runCommand(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(message) {
  console.error(`\n[cf-pre-push] ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`[cf-pre-push] WARNING: ${message}`);
}

function parseBuildpackLine(output) {
  const line = output
    .split(/\r?\n/)
    .find((entry) => entry.includes(REQUIRED_BUILDPACK) && entry.includes(REQUIRED_STACK));

  if (!line) {
    fail(`Could not find ${REQUIRED_BUILDPACK} for stack ${REQUIRED_STACK} in 'cf buildpacks' output.`);
  }

  const parts = line.trim().split(/\s+/);
  const stackIndex = parts.indexOf(REQUIRED_STACK);
  const filename = parts[stackIndex + 4];

  if (!filename) {
    fail(`Could not parse buildpack filename from line: ${line}`);
  }

  const versionMatch = filename.match(/-v(\d+\.\d+\.\d+)\.zip$/);

  if (!versionMatch) {
    fail(`Could not extract buildpack version from filename '${filename}'.`);
  }

  return {
    filename,
    version: `v${versionMatch[1]}`,
  };
}

function extractSupportedNodeVersions(releaseBody, stack) {
  const versions = [];

  for (const line of releaseBody.split(/\r?\n/)) {
    const match = line.match(/^\|\s*node\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/i);

    if (!match) {
      continue;
    }

    const version = match[1].trim();
    const stacks = match[2]
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (stacks.includes(stack)) {
      versions.push(version);
    }
  }

  if (versions.length === 0) {
    fail(`No supported Node.js versions found in GitHub release notes for stack ${stack}.`);
  }

  return versions;
}

function main() {
  try {
    runCommand('cf', ['target']);
  } catch {
    fail('CF Login required. Run "cf login" before pushing.');
  }

  let buildpacksOutput;
  try {
    buildpacksOutput = runCommand('cf', ['buildpacks']);
  } catch {
    fail('Unable to read CF buildpacks. Verify your CF CLI session and permissions.');
  }

  const buildpack = parseBuildpackLine(buildpacksOutput);

  let localNodeVersion;
  try {
    localNodeVersion = runCommand('node', ['-v']).replace(/^v/, '');
  } catch {
    fail('Unable to execute "node -v" locally. Install Node.js or fix your PATH.');
  }

  let release;
  try {
    const response = runCommand('curl', [
      '-L',
      '-H',
      'User-Agent: cf-pre-push',
      `${GITHUB_RELEASE_API}/${buildpack.version}`,
    ]);
    release = JSON.parse(response);
  } catch {
    fail(`Unable to fetch GitHub release data for ${buildpack.version}.`);
  }

  const assetName = `nodejs-buildpack-${REQUIRED_STACK}-${buildpack.version}.zip`;
  const hasMatchingAsset = Array.isArray(release.assets)
    && release.assets.some((asset) => asset.name === assetName);

  if (!hasMatchingAsset) {
    fail(
      `GitHub release ${buildpack.version} does not contain expected asset ${assetName} for stack ${REQUIRED_STACK}.`,
    );
  }

  const supportedNodeVersions = extractSupportedNodeVersions(release.body ?? '', REQUIRED_STACK);

  console.log(`[cf-pre-push] CF buildpack: ${REQUIRED_BUILDPACK}`);
  console.log(`[cf-pre-push] CF stack: ${REQUIRED_STACK}`);
  console.log(`[cf-pre-push] CF filename: ${buildpack.filename}`);
  console.log(`[cf-pre-push] CF buildpack version: ${buildpack.version}`);
  console.log(`[cf-pre-push] Supported Node.js versions on GitHub: ${supportedNodeVersions.join(', ')}`);
  console.log(`[cf-pre-push] Local Node.js version: ${localNodeVersion}`);

  if (!supportedNodeVersions.includes(localNodeVersion)) {
    warn(
      `Local Node.js version ${localNodeVersion} is not listed for ${buildpack.version} on ${REQUIRED_STACK}. `
      + `Supported versions: ${supportedNodeVersions.join(', ')}.`,
    );
  }
}

main();
