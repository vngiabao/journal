import type {State,Goal,Criteria,Tracking} from './model';
import {today} from './dates';
type Seed = [string,string,string,Tracking,Partial<Criteria>];
// Names carry the details written on the May 2026 board. `vi` follows the handwriting, lightly expanded.
const rows:Seed[] = [
 ['No scrolling, first 15 min of the day','Không lướt điện thoại 15 phút đầu ngày, streak 60+','Mind & discipline','daily',{target:60,days:60,unit:'days',description:'No phone scrolling in the first 15 minutes after waking. A streak of 60+ days.'}],
 ['Eyes closed before 11 PM','Nhắm mắt trước 11 giờ, streak 60+','Health & wellbeing','daily',{target:60,days:60,unit:'days',description:'Close your eyes and go to sleep before 11 PM. A streak of 60+ days.'}],
 ['Do volunteer work','Đi làm tình nguyện','People & experiences','milestone',{target:1,unit:'milestone',description:'Do volunteer work. Checked in red on the May board.'}],
 ['Attend 10 PD events','Tham gia 10 sự kiện PD','Career & startup','counter',{target:10,unit:'events',description:'Attend ten professional development events.'}],
 ['Eat after 9 PM under 4 times a week','Ăn sau 9 giờ dưới 4 lần/tuần, trong 3 tháng','Health & wellbeing','weekly-max',{target:4,unit:'occasions',months:3,description:'Eat after 9 PM fewer than four times a week, kept for three months.'}],
 ['No racist words for 2 weeks','Không nói lời racist trong 2 tuần','Mind & discipline','daily',{target:14,days:14,unit:'days',description:'No racist words for 14 days in a row. Checked in red on the May board.'}],
 ['Journal 5+ days a week','Viết nhật ký 5+ ngày/tuần, trong 3 tháng','Mind & discipline','weekly-frequency',{target:5,months:3,unit:'days',description:'Write a journal on five or more days each week, kept for three months.'}],
 ['iPhone + iPad under 20 h a week','Screen time iPhone + iPad dưới 20 tiếng/tuần','Mind & discipline','weekly-max',{target:20,unit:'hours',description:'Combined iPhone and iPad screen time strictly below 20 hours a week.'}],
 ['Waist 81 cm (from 88 cm)','Vòng eo 81 cm (từ 88 cm)','Health & wellbeing','measurement',{target:81,unit:'cm',direction:'down',description:'Bring your waist from 88 cm down to 81 cm. Record real measurements; none is assumed.'}],
 ['25 km a week for 10 weeks','25 km/tuần trong 10 tuần','Health & wellbeing','weekly-min',{target:25,weeks:10,unit:'km',description:'Cover at least 25 km every week for ten weeks.'}],
 ['Both face exercises, 60-day streak','Tập thể dục mặt 2 bài, chuỗi 60 ngày','Health & wellbeing','daily',{target:60,days:60,unit:'days',checklist:['Exercise A','Exercise B'],description:'Do both face exercises every day for 60 days in a row. One alone does not count.'}],
 ['Up before 7:30, 5+ days a week','Dậy trước 7 rưỡi 5+ ngày/tuần, trong 1 tháng','Health & wellbeing','weekly-frequency',{target:5,months:1,unit:'days',description:'Wake before 7:30 AM on five or more days each week, kept for one month.'}],
 ['Call Mom and Dad 2+ times a week','Gọi ba má 2+ lần/tuần, trong 3 tháng','People & experiences','weekly-frequency',{target:2,months:3,unit:'calls',description:'Call your parents at least twice a week, kept for three months.'}],
 ['Cook 2+ meals a day','Nấu 2+ bữa/ngày, trong 1 tháng','Health & wellbeing','daily',{target:2,months:1,dailyMin:2,unit:'meals',description:'Cook at least two meals every day for one month.'}],
 ['A girlfriend','Có bồ','People & experiences','milestone',{target:1,unit:'milestone',description:'Have a girlfriend.'}],
 ['Get a job','Có job','Career & startup','milestone',{target:1,unit:'milestone',description:'Land a job. One milestone: done when you have accepted an offer.'}],
 ['+30% trading return, any time this year','Trade +30% bất kỳ thời gian nào trong năm','Career & startup','measurement',{target:30,unit:'% return',direction:'up',description:'Reach +30% against your account baseline at any point within a year. Enter account values; this is not advice.'}],
 ['Deep work 4+ h, 5+ days a week','Deep work 4+ tiếng, 5+ ngày/tuần, trong 2 tháng','Career & startup','weekly-frequency',{target:5,months:2,dailyMin:4,unit:'days',description:'At least four hours of deep work on five or more days each week, kept for two months.'}],
 ['See Shohei Ohtani play','Xem Shohei Ohtani','People & experiences','milestone',{target:1,unit:'game',description:'Done only after you attend a game where Shohei Ohtani plays.'}],
 ['A Story: product + YC submitted','Startup có product / nộp YC xong','Career & startup','milestone',{target:2,unit:'parts',stages:['Has a real product','YC application submitted'],description:'Both parts: A Story has a real product, and the Y Combinator application is submitted.'}],
 ['Reach 75 kg','Đạt 75 kg','Health & wellbeing','measurement',{target:75,unit:'kg',direction:'either',description:'Reach 75 kg. Record your real weight; no baseline is assumed.'}],
 ['Land an investor or accelerator','Có nhà đầu tư hoặc vào accelerator/incubator','Career & startup','milestone',{target:1,unit:'commitment',stages:['Researching','Applied / Contacted','In discussion','Interview / Diligence','Accepted / Committed'],description:'Done only with a genuine investment commitment or a formal accelerator/incubator acceptance, with evidence.'}],
 ['Gym 4+ times a week for 10 weeks','Gym 4+ lần/tuần trong 10 tuần','Health & wellbeing','weekly-frequency',{target:4,weeks:10,unit:'sessions',description:'Four or more gym sessions every week for ten weeks.'}],
 ['Learn 1 song, singing or piano','Tập 1 bài hát / piano','Learning & skills','milestone',{target:1,unit:'song',description:'Learn one complete song, by singing it or playing it on piano.'}],
 ['Meet 20+ new people + follow on IG','Gặp 20+ người mới và follow IG','People & experiences','counter',{target:20,unit:'people',requireConnection:true,distinct:true,description:'Meet twenty or more new people and follow each other on Instagram. A person counts only with both.'}],
 ['Eye care + skincare, 60-day streak','Eye care / skin care, chuỗi 60 ngày','Health & wellbeing','daily',{target:60,days:60,unit:'days',checklist:['Eye care','Skincare'],description:'Do both your eye care and skincare routines for 60 days in a row.'}],
 ['Read 20 books','Đọc 20 quyển sách','Learning & skills','counter',{target:20,unit:'books',description:'Finish twenty books. Keep titles, start dates, finish dates, and notes.'}],
 ['Go on a date','Đi date','People & experiences','milestone',{target:1,unit:'date',description:'Go on a date.'}],
 ['Voice coaching, 60-day streak','Voice coach, chuỗi 60 ngày','Learning & skills','daily',{target:60,days:60,unit:'days',description:'Practice voice coaching or training for 60 days in a row.'}],
 ['Defined jawline & abs','Có jawline / múi','Health & wellbeing','milestone',{target:1,unit:'milestone',description:'A defined jawline and visible abs. Set your own criteria and add dated evidence.'}],
 ['Shower + brush teeth daily, 60+ streak','Không skip vệ sinh cá nhân (tắm + đánh răng), streak 60+','Health & wellbeing','daily',{target:60,days:60,unit:'days',checklist:['Shower','Brush teeth'],description:'Never skip showering or brushing your teeth. A streak of 60+ days.'}],
 ['Kiyo / Shiori 90+ day streak','Kiyo / Shiori streak 90+','Learning & skills','daily',{target:90,days:90,unit:'days',description:'Practice Japanese in Kiyo or Shiori for 90+ days in a row.'}],
 ['Veggies & fruit 5+ times a week','Ăn rau & trái cây 5+ lần/tuần, trong 1 tháng','Health & wellbeing','weekly-frequency',{target:5,months:1,unit:'occasions',description:'Eat vegetables and fruit five or more times a week, kept for one month.'}],
 ['Fly to 3 cities','Bay đến 3 thành phố','People & experiences','counter',{target:3,unit:'cities',distinct:true,description:'Fly to three different cities. The same city does not count twice.'}],
 ['Daily to-do list for 90 days','Lên daily to-do list trong 90 ngày','Mind & discipline','daily',{target:90,days:90,unit:'days',description:'Write a to-do list every day for 90 days.'}],
 ['Meditate 10 min every night','Thiền 10 phút mỗi tối, streak 60+','Mind & discipline','daily',{target:60,days:60,unit:'days',description:'Meditate for ten minutes every night. A streak of 60+ days.'}],
];

// Difficulty ring by board position: the outer ring is easier, the middle ring harder, the four at the center hardest.
// (The ink colours in the May sketch were not deliberate, so position decides.)
export type Ink='blue'|'green'|'maize';
export function inkOf(g:{row:number;col:number}):Ink{const d=Math.min(g.row-1,g.col-1,6-g.row,6-g.col);return d===0?'blue':d===1?'green':'maize';}
export function seed(date=today()):State {return {schema:1, goals:rows.map(([en,vi,category,type,c],i):Goal=>{const criteria={target:1,unit:'days',consecutive:true,description:'',...c};return {id:String(i+1).padStart(2,'0'),en,vi,originalName:{en,vi},category,type,row:Math.floor(i/6)+1,col:i%6+1,original:structuredClone(criteria),historicalCheck:[2,5].includes(i),versions:[{id:`original-${i}`,effective:date,criteria:structuredClone(criteria),createdAt:new Date().toISOString()}],status:'not-started',start:date,deadline:'',pinned:false,priority:i+1,run:1,restarts:[]};}), logs:[],journey:[],journals:[],edits:[],achievements:[],proofs:[],todos:[],quotes:[],settings:{language:'en',timezone:'America/New_York',onboarded:false}};}

// Earlier wordings of the registry. Stored goals and old backups that still carry them move to the current wording;
// anything you renamed or re-targeted yourself is left alone.
const legacyRows:Seed[] = [
 ['Phone-free mornings','Không lướt điện thoại 15 phút đầu sau khi thức dậy','Mind & discipline','daily',{target:60,days:60,unit:'days',description:'No scrolling during the first 15 minutes after waking.'}],
 ['Sleep before 11 PM','Nhắm mắt trước 11 giờ đêm','Health & wellbeing','daily',{target:60,days:60,unit:'days',description:'Close your eyes and go to sleep before 11 PM.'}],
 ['Volunteer','Đi làm tình nguyện','People & experiences','milestone',{target:1,unit:'milestone',description:'Do volunteer work. Historical red check on the May board.'}],
 ['Attend 10 PD events','Tham gia 10 sự kiện PD','Career & startup','counter',{target:10,unit:'events',description:'Attend ten professional development events.'}],
 ['Mindful late-night eating','Ăn sau 9 giờ ít hơn 4 lần mỗi tuần','Health & wellbeing','weekly-max',{target:4,unit:'occasions',months:3,description:'Eat after 9 PM fewer than four times per week for three calendar months.'}],
 ['Respectful language','Không dùng lời lẽ phân biệt chủng tộc','Mind & discipline','daily',{target:14,days:14,unit:'days',description:'Do not use racist words for 14 consecutive days. Historical red check on the May board.'}],
 ['Write a journal','Viết nhật ký ít nhất 5 ngày mỗi tuần','Mind & discipline','weekly-frequency',{target:5,months:3,unit:'days',description:'Journal on five distinct days each week for three calendar months.'}],
 ['Less screen time','Thời gian iPhone và iPad dưới 20 giờ mỗi tuần','Mind & discipline','weekly-max',{target:20,unit:'hours',description:'Combined iPhone and iPad screen time must be strictly below 20 hours weekly.'}],
 ['An 81 cm waist','Vòng eo 81 cm (từ 88 cm)','Health & wellbeing','measurement',{target:81,unit:'cm',direction:'down',description:'Reach an 81 cm waist. The original board references 88 cm; no current measurement is assumed.'}],
 ['Move 25 km a week','25 km mỗi tuần trong 10 tuần','Health & wellbeing','weekly-min',{target:25,weeks:10,unit:'km',description:'Complete at least 25 km each week for ten consecutive qualifying weeks.'}],
 ['Daily face exercises','Tập cả hai bài mặt mỗi ngày','Health & wellbeing','daily',{target:60,days:60,unit:'days',checklist:['Exercise A','Exercise B'],description:'Both types of face exercises are required each day for 60 consecutive days.'}],
 ['Wake before 7:30 AM','Dậy trước 7 giờ 30 ít nhất 5 ngày mỗi tuần','Health & wellbeing','weekly-frequency',{target:5,months:1,unit:'days',description:'Wake before 7:30 AM on five distinct days weekly for one calendar month.'}],
 ['Call my parents','Gọi ba mẹ ít nhất 2 lần mỗi tuần','People & experiences','weekly-frequency',{target:2,months:3,unit:'calls',description:'Call your parents twice a week for three calendar months.'}],
 ['Cook two meals daily','Nấu ít nhất 2 bữa mỗi ngày','Health & wellbeing','daily',{target:2,months:1,dailyMin:2,unit:'meals',description:'Cook at least two meals every day for one calendar month.'}],
 ['A romantic partner','Có người yêu','People & experiences','milestone',{target:1,unit:'milestone',description:'Have a romantic partner; define what success means for you.'}],
 ['Secure a job','Có việc làm','Career & startup','milestone',{target:1,unit:'milestone',stages:['Applications','Interviews','Offer accepted'],description:'Secure a job through application, interview, and accepted offer stages.'}],
 ['A 30% trading return','Tài khoản giao dịch tăng 30%','Career & startup','measurement',{target:30,unit:'% return',direction:'up',description:'Historical financial outcome: reach +30% relative to your defined account baseline. Enter account values, not advice.'}],
 ['Four hours of deep work','Làm việc sâu 4 giờ, ít nhất 5 ngày mỗi tuần','Career & startup','weekly-frequency',{target:5,months:2,dailyMin:4,unit:'days',description:'At least four hours of deep work on five distinct days each week for two calendar months.'}],
 ['See Shohei Ohtani play','Xem Shohei Ohtani trực tiếp','People & experiences','milestone',{target:1,unit:'game',description:'Only complete after attending a game where Shohei Ohtani plays.'}],
 ['Submit A Story to YC','Hoàn thành và nộp YC cho A Story','Career & startup','milestone',{target:5,unit:'stages',stages:['Preparation','Application answers','Supporting materials','Review','Submission'],description:'Complete and submit the Y Combinator application for A Story. Submission is required.'}],
 ['Reach 75 kg','Đạt 75 kg','Health & wellbeing','measurement',{target:75,unit:'kg',direction:'either',description:'Reach 75 kg. Record your actual measurements; no weight baseline is assumed.'}],
 ['Investor or accelerator','Có nhà đầu tư hoặc được nhận vào accelerator/incubator','Career & startup','milestone',{target:1,unit:'commitment',stages:['Researching','Applied / Contacted','In discussion','Interview / Diligence','Accepted / Committed'],description:'Success requires a genuine investment commitment or formal accelerator/incubator acceptance, with evidence.'}],
 ['Go to the gym','Gym ít nhất 4 lần mỗi tuần trong 10 tuần','Health & wellbeing','weekly-frequency',{target:4,weeks:10,unit:'sessions',description:'Four gym visits each week for ten consecutive qualifying weeks; the period rule is editable.'}],
 ['Play a complete piano song','Chơi trọn một bài hát trên piano','Learning & skills','milestone',{target:1,unit:'song',description:'Learn and play one complete piano song.'}],
 ['Meet 20 new people','Gặp 20 người mới và kết nối Instagram','People & experiences','counter',{target:20,unit:'people',requireConnection:true,distinct:true,description:'Meet twenty new people and connect with each on Instagram. Both actions required.'}],
 ['Eye care & skincare','Chăm sóc mắt và da hằng ngày','Health & wellbeing','daily',{target:60,days:60,unit:'days',checklist:['Eye care','Skincare'],description:'Complete both eye care and skincare routines on 60 consecutive days.'}],
 ['Read 20 books','Đọc 20 quyển sách','Learning & skills','counter',{target:20,unit:'books',description:'Read twenty completed books. Keep titles, start dates, completion dates, and notes.'}],
 ['Go on a date','Đi hẹn hò','People & experiences','milestone',{target:1,unit:'date',description:'Go on a date.'}],
 ['Train my voice','Luyện giọng mỗi ngày','Learning & skills','daily',{target:60,days:60,unit:'days',description:'Practice voice coaching or training for 60 consecutive days.'}],
 ['Defined jawline & abs','Có đường hàm và cơ bụng rõ nét','Health & wellbeing','milestone',{target:1,unit:'milestone',description:'Define personal fitness criteria and add dated evidence for jawline and abdominal definition.'}],
 ['Keep up personal hygiene','Không bỏ vệ sinh cá nhân: tắm và đánh răng','Health & wellbeing','daily',{target:60,days:60,unit:'days',checklist:['Shower','Brush teeth'],description:'Do not skip showering or brushing teeth for 60 consecutive days.'}],
 ['A 90-day Duolingo streak','Duolingo streak 90 ngày','Learning & skills','daily',{target:90,days:90,unit:'days',description:'Practice Duolingo for at least 90 consecutive days.'}],
 ['Eat fruit & vegetables','Ăn rau hoặc trái cây ít nhất 5 lần mỗi tuần','Health & wellbeing','weekly-frequency',{target:5,months:1,unit:'occasions',description:'Eat fruit or vegetables at least five times weekly for one calendar month.'}],
 ['Fly to three cities','Bay đến 3 thành phố khác nhau','People & experiences','counter',{target:3,unit:'cities',distinct:true,description:'Fly to three distinct cities. Duplicate cities do not count twice.'}],
 ['Make a daily to-do list','Lên danh sách việc cần làm mỗi ngày','Mind & discipline','daily',{target:90,days:90,unit:'days',description:'Create a daily to-do list for 90 consecutive days.'}],
 ['Meditate every night','Thiền 10 phút mỗi tối','Mind & discipline','daily',{target:60,days:60,unit:'days',description:'Meditate for ten minutes every night for at least 60 consecutive days.'}],
];
const MIGRATED_KEYS=['description','unit','target','stages'] as const;
const crit=(c:Partial<Criteria>):Criteria=>({target:1,unit:'days',consecutive:true,description:'',...c});
// The language streak first pointed at Duolingo; it now means Kiyo or Shiori. Saved boards with the old name are renamed.
const PREV_LANGUAGE_GOAL:Seed=['Duolingo 90+ day streak','Duolingo streak 90+','Learning & skills','daily',{target:90,days:90,unit:'days',description:'Practice Duolingo for 90+ days in a row.'}];
export function migrateRegistry(s:State){let changed=false;const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 for(const g of s.goals??[]){const i=Number(g.id)-1,now=rows[i],old=legacyRows[i];if(!now||!old)continue;
  const variants:Seed[]=[old];if(now[0].startsWith('Kiyo / Shiori'))variants.push(PREV_LANGUAGE_GOAL);if(g.id==='15')variants.push(['A girlfriend','Có người yêu',old[2],old[3],{...old[4],description:'Have a girlfriend; define what success means for you.'}]);
  for(const v of variants){
   if(g.en===v[0]&&v[0]!==now[0]){g.en=now[0];changed=true;}if(g.vi===v[1]&&v[1]!==now[1]){g.vi=now[1];changed=true;}
   if(g.originalName){if(g.originalName.en===v[0]&&v[0]!==now[0]){g.originalName.en=now[0];changed=true;}if(g.originalName.vi===v[1]&&v[1]!==now[1]){g.originalName.vi=now[1];changed=true;}}
   const oc=crit(v[4]),nc=crit(now[4]);
   for(const c of [g.original as Criteria,...(g.versions??[]).map(x=>x.criteria),...(s.achievements??[]).filter(a=>a.goalId===g.id).map(a=>a.criteria)]){if(!c)continue;
    for(const k of MIGRATED_KEYS){if(same(oc[k],nc[k])||!same(c[k],oc[k]))continue;if(nc[k]===undefined)delete (c as Partial<Criteria>)[k];else (c as unknown as Record<string,unknown>)[k]=structuredClone(nc[k]);changed=true;}}
  }
 }
 // The YC goal became two parts; an old "Submission" record is the second part.
 for(const l of s.logs??[])if(l.goalId==='20'&&l.stage==='Submission'){l.stage='YC application submitted';changed=true;}
 // The board uses three states now. Paused and archived goals become not started; their records stay.
 for(const g of s.goals??[])if(g.status==='paused'||g.status==='archived'){g.status='not-started';changed=true;}
 return changed;}
