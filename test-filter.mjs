const HIDDEN_EVENT_PATTERNS = ["has the app","app not installed","uninstalled","installed the app","device may be switched off","sent text message","text message to the driver","email sent to","sms sent","sent whatsapp","notification sent","sent verification code","has viewed the load track","viewed the load track","updated stop","updated load number","updated shipper","updated carrier","updated broker","updated driver","switched from eld","eld track","set to eld","reset by system","post geofence","needs to start","autostart failed"];
const isInternal = d => { const s=String(d??"").toLowerCase(); return s ? HIDDEN_EVENT_PATTERNS.some(p=>s.includes(p)) : false; };

// From the TT status-code reference + hide list
const MUST_HIDE = ["Driver has the app","Sent text message to the driver","Email sent to the Broker","Email sent to the dispatcher","Shipper has viewed the Load Track","Carrier has viewed the Load Track","Broker has viewed the Load Track","Driver has viewed the Load Track","Updated stop","Updated load number","Updated shipper","Updated carrier","Updated broker","Updated driver","Sent verification code","App not installed","App uninstalled","Driver installed the app","Switched from ELD","ELD track","Load is set to ELD","SMS sent","Sent whatsapp","Reset by system","Notification sent","Post geofence","Driver needs to start","Autostart failed","Tracking interrupted - Device may be switched off"];

const MUST_SHOW = ["Created","Cancelled","Started Tracking","Tracking","Tracking will start at 10:00","Tracking will start soon","Tracking interrupted","Back On Time","Off Expected Route","Driver running late","Stopped by driver","Stopped by dispatcher","Arrived at origin","Arrived at origin custom geofence","Left origin","Left origin custom geofence","Arrived at stop","Arrived at stop custom geofence","Left stop","Left stop custom geofence","Arrived at destination","Arrived at destination custom geofence","Left destination","Left destination custom geofence","Location Update"];

let fail=0;
for (const d of MUST_HIDE) if(!isInternal(d)){console.log("LEAKED (should hide):",d);fail++;}
for (const d of MUST_SHOW) if(isInternal(d)){console.log("OVER-FILTERED (should show):",d);fail++;}
console.log(fail===0 ? `PASS — ${MUST_HIDE.length} hidden, ${MUST_SHOW.length} shown` : `${fail} FAILURES`);
