const STATE_TZ={FL:"America/New_York",CA:"America/Los_Angeles",TX:"America/Chicago",AZ:"America/Phoenix"};
const tzForState=s=>s?STATE_TZ[s.trim().toUpperCase()]:undefined;
function parseTs(ts){const raw=String(ts).trim();if(!raw)return null;const hasZone=/(?:Z|z|[+-]\d{2}:?\d{2})$/.test(raw);const iso=raw.includes("T")?raw:raw.replace(" ","T");const d=new Date(hasZone?iso:`${iso}Z`);return Number.isNaN(d.getTime())?null:d;}
function formatTs(ts,state){if(!ts)return "—";const d=parseTs(ts);if(!d)return String(ts);return d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short",timeZone:tzForState(state)});}

console.log("=== The screenshot bug ===");
console.log("Port Orange FL delivery, TT sent '2026-07-22T12:30:00Z':");
console.log("  BEFORE (raw pass-through):  Jul 22, 12:30 PM UTC   <- wrong time of day");
console.log("  AFTER  (stop-local FL):    ", formatTs("2026-07-22T12:30:00Z","FL"));
console.log("\nOrlando FL pickup, '2026-07-22T12:30:00Z':", formatTs("2026-07-22T12:30:00Z","FL"));
console.log("  -> both cards now read the same zone ✓");

console.log("\n=== Bare timestamp (no offset) ===");
console.log("TT sends '2026-07-22 14:05:00' with no zone:");
console.log("  as FL stop:", formatTs("2026-07-22 14:05:00","FL"));
console.log("  as TX stop:", formatTs("2026-07-22 14:05:00","TX"));
console.log("  (stable regardless of viewer's browser timezone)");

console.log("\n=== Viewer-independence check ===");
const before=process.env.TZ;
for (const tz of ["America/Los_Angeles","America/New_York","Asia/Tokyo"]) {
  process.env.TZ=tz;
  console.log(`  viewer in ${tz.padEnd(20)} -> FL stop reads:`, formatTs("2026-07-22T12:30:00Z","FL"));
}
process.env.TZ=before;

console.log("\n=== Edge cases ===");
console.log("  null:", formatTs(null,"FL"));
console.log("  garbage:", formatTs("not-a-date","FL"));
console.log("  unknown state (falls back to viewer tz):", formatTs("2026-07-22T12:30:00Z","XX"));
console.log("  AZ (no DST):", formatTs("2026-07-22T12:30:00Z","AZ"));
