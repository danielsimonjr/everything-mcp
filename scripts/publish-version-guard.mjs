/**
 * Fail when a release tag's version is not package.json's version.
 *
 * A tag `v1.2.3` may publish only when package.json says `1.2.3`.
 * The publish workflow publishes the tagged commit. This guard refuses a tag
 * that does not name that commit's package.json version. A ref that is not a
 * v* tag (for example a branch) also fails.
 *
 * Usage: node scripts/publish-version-guard.mjs <tag>
 *   <tag> is `vX.Y.Z` or `refs/tags/vX.Y.Z`.
 * Exit 0 on a match, 1 otherwise.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** @param {string} tag @returns {string | null} */
export function versionFromTag(tag) {
  if (typeof tag !== 'string' || tag.length < 2) return null;
  const name = tag.startsWith('refs/tags/') ? tag.slice('refs/tags/'.length) : tag;
  if (!name.startsWith('v') || name.length < 2) return null;
  return name.slice(1);
}

/**
 * @param {string} tag
 * @param {string} packageVersion
 * @returns {{ ok: boolean, message: string }}
 */
export function assertTagMatchesPackageVersion(tag, packageVersion) {
  const fromTag = versionFromTag(tag);
  if (fromTag === null) {
    return {
      ok: false,
      message: `ref ${JSON.stringify(tag)} is not a v* tag, so there is no version to compare with package.json ${packageVersion}`,
    };
  }
  if (fromTag !== packageVersion) {
    return {
      ok: false,
      message: `tag version ${fromTag} does not equal package.json version ${packageVersion}`,
    };
  }
  return {
    ok: true,
    message: `tag v${fromTag} matches package.json ${packageVersion}`,
  };
}

function main() {
  const tag = process.argv[2] ?? '';
  const packageVersion = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ).version;
  const result = assertTagMatchesPackageVersion(tag, packageVersion);
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(result.message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
