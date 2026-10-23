// Small per-device facts the Getting started checklist needs (seen Progress, met Bond, added calendar reminders).
export const FLAGS={progress:'reboot-seen-progress',bond:'reboot-met-bond',calendar:'reboot-calendar-reminders'};
export const flag=(k:string)=>{try{return !!localStorage.getItem(k);}catch{return false;}};
export const markFlag=(k:string)=>{try{localStorage.setItem(k,'1');}catch{/* private browsing */}};
