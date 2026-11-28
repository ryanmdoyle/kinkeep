// Pages still render in the browser and keep towns in localStorage while the
// move to the database happens (docs/PLAN.md). They're served by the Worker
// now rather than prerendered, so the server can say who's signed in.
export const ssr = false;
