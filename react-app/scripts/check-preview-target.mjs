// Keep Vercel builds scoped to the reviewed React branch. Production is allowed
// only after the explicit release approval for this branch.
const { VERCEL, VERCEL_ENV, VERCEL_GIT_COMMIT_REF } = process.env;
if (VERCEL === '1' && !VERCEL_ENV) {
  throw new Error('Vercel cloud builds must declare preview or production environment.');
}
if (VERCEL_GIT_COMMIT_REF && VERCEL_GIT_COMMIT_REF !== 'codex/react-migration-drilldown') {
  throw new Error('Deploy the reviewed React release from codex/react-migration-drilldown.');
}
console.log(`React ${VERCEL_ENV === 'production' ? 'production' : 'preview'} target accepted.`);
