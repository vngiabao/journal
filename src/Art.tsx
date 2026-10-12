import type {ReactNode} from 'react';
import type {State} from './model';
import {dayState,dayMoments} from './engine';
import {addDays} from './dates';

// Original illustrations generated for Project Reboot (no third-party characters). Files live in /public/art.
export type Scene='morning'|'evening'|'night'|'journey'|'board'|'review';
export const sceneForHour=(h=new Date().getHours()):Scene=>h>=5&&h<16?'morning':h>=16&&h<20?'evening':'night';

export function SceneHero({scene,children,className=''}:{scene:Scene;children:ReactNode;className?:string}){
 return <div className={`page-heading scene-hero scene-${scene} ${className}`} style={{['--scene' as string]:`url(/art/scene-${scene}.webp)`}}>{children}</div>;
}

export type Mood='wave'|'cheer'|'comfort'|'write';
const HARD=new Set(['Doubt','Burnout','Setback','Rejection','Sick','Lonely','Anxious']);

// Bao, your own companion, reads the day and picks a mood. Only real records decide it.
export function companionFor(state:State,now:string):{mood:Mood;line:string}{
 const name=state.settings.name?.trim(),daily=state.goals.filter(g=>g.status==='active'&&g.type==='daily'),kept=daily.filter(g=>dayState(g,state.logs,now)==='success').length;
 const recent=state.journey.filter(m=>m.date>=addDays(now,-2)&&m.date<=now).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const hard=recent&&(recent.delta<0||dayMoments(recent).some(x=>x.tag&&HARD.has(x.tag)));
 const hour=new Date().getHours(),plannedTomorrow=(state.todos??[]).some(t=>t.date===addDays(now,1));
 if(daily.length&&kept===daily.length)return {mood:'cheer',line:`Every promise kept today${name?`, ${name}`:''}! I’ll carry this one to the archive myself.`};
 if(hard)return {mood:'comfort',line:'Hard days are part of the road too. One small promise today is plenty.'};
 if(hour>=19&&!plannedTomorrow)return {mood:'write',line:'Before bed, a few lines for tomorrow’s list? I’ll keep them safe overnight.'};
 const left=daily.length-kept;
 return {mood:'wave',line:left?`${hour<12?'Good morning':'Welcome back'}${name?`, ${name}`:''}! ${left} ${left===1?'promise is':'promises are'} waiting for you today.`:'A letter for you: today is a fresh page. Pick one promise to keep.'};
}

export function Companion({mood,line,compact=false}:{mood:Mood;line:string;compact?:boolean}){
 return <figure className={`companion mood-${mood} ${compact?'compact':''}`}><blockquote className="speech">{line}<cite>Bao</cite></blockquote><img src={`/art/bao-${mood}.webp`} alt="" loading="lazy"/></figure>;
}

// The chibi Bao: small, friendly reactions for everyday moments.
export type ChibiPose='avatar'|'check'|'bingo'|'sleep'|'think'|'tea';
export function Chibi({pose,className=''}:{pose:ChibiPose;className?:string}){
 return <img className={`chibi chibi-${pose} ${className}`} src={`/art/chibi-${pose}.webp`} alt=""/>;
}
