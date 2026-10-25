// This branch is approved for Preview only. Deliberately fail a Production
// build instead of allowing an accidental promotion through this configuration.
const { VERCEL, VERCEL_ENV, VERCEL_GIT_COMMIT_REF } = process.env;
if ((VERCEL === '1' || VERCEL_ENV) && VERCEL_ENV !== 'preview') {
  throw new Error('This React migration is approved for Vercel Preview only. Production cutover requires a separate review.');
}
if (VERCEL_GIT_COMMIT_REF && VERCEL_GIT_COMMIT_REF !== 'codex/react-migration-drilldown') {
  throw new Error('Deploy the React preview from codex/react-migration-drilldown.');
}
console.log('React preview target accepted.');
