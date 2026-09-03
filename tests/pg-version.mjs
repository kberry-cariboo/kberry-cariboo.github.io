// Which Postgres the SQL suites just ran against, and whether it was the one
// production runs.
//
// supabase/schema.sql ships to a Supabase project on Postgres 17. CI's service
// container matches it deliberately (see .github/workflows/build.yml, which
// says so where it pins the image). A local scratch database is whatever
// happens to be installed — 16 on a Debian box, 15 on an older one — and it
// will run almost all of this schema identically, which is the problem: the
// run passes, and a version-sensitive difference is exactly the kind that
// then only ever appears in production.
//
// So the suites say out loud which major they were on. Not a failure: running
// them against a different major still catches nearly everything, and refusing
// to run would just mean they don't get run locally at all. But a green line
// that doesn't mention a version is a green line that gets believed, and this
// one has to be believed only as far as it goes.
export const PRODUCTION_MAJOR = 17;

// `psql` is the suite's own one-statement helper, so this reads the version
// through exactly the connection the tests use rather than a second one that
// might point somewhere else.
export function reportServerMajor(psql, suite) {
  let full;
  try {
    full = psql('show server_version;');
  } catch {
    return null; // the caller has already established the database is reachable
  }
  // `show server_version` on a distro build appends the packaging string
  // ("16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)"); the version is the first word.
  full = full.split(' ')[0];
  const major = parseInt(full, 10);
  if (!Number.isFinite(major)) return null;
  if (major === PRODUCTION_MAJOR) {
    console.log(`${suite}: Postgres ${full} — the major production runs`);
  } else {
    console.log(`${suite}: NOTE — Postgres ${full}, but production and CI run ${PRODUCTION_MAJOR}. `
      + 'A pass here is not a pass on the major this schema ships to; CI still has the last word.');
  }
  return major;
}
