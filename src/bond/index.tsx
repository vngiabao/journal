// Bond's journey: the companion layer over the daily ritual. This file is the contract the ritual uses.
//  <BondJourney state mutate now size="strip"/>  the band at the top of Today; tapping it opens the whole trail.
//  <BondJourney ... size="line"/>               the same band kept to one line, while a check-in card shows.
//  <BondJourney ... size="full"/>               the whole trail and the keepsakes, inline.
//  bondCelebrate('morning-done'|...)            call right after the state change; safe when pets are off.
// A milestone reached today is noticed by the strip, celebrated once, and marked in state.bond.celebrated.
// Callers that celebrate without the strip on screen can use milestoneDue + markCelebrated themselves.
import './bond.css';
export {BondJourney,Stamp} from './BondJourney';
export {bondCelebrate,celebrateMilestone,type BondMoment} from './celebrate';
export {journey,showUpDays,milestoneDue,milestoneKey,markCelebrated,celebrated,keepsake,comingBack,weekWords,WELCOME} from './journey';
