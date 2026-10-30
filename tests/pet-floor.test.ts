import {describe,it,expect} from 'vitest';
import {freeSpans,type Box} from '../src/Pet';

// Bond's floor: the stretches of the bottom edge (his left x) where his 84px frame covers no card and comes no
// closer than 6px to any words, controls or pictures. The window here is 1000px tall; the floor runs from x=260 to x=1820.
const box=(left:number,right:number,top:number,bottom:number):Box=>({left,right,top,bottom,width:right-left,height:bottom-top});
const VH=1000;

describe('freeSpans',()=>{
 it('gives the whole floor when nothing is near the bottom edge',()=>{
  expect(freeSpans(260,1820,VH,[box(300,1200,100,600)],[box(300,900,400,420)])).toEqual([[260,1820]]);
 });
 it('steps around a card reaching into the bottom band, frame and all',()=>{
  // A card from 600 to 1000: he may stand with his 84px frame right up to it, never over it.
  expect(freeSpans(260,1820,VH,[box(600,1000,700,1100)],[])).toEqual([[260,516],[1000,1820]]);
 });
 it('leaves no floor when cards cover the whole bottom edge, so he steps out of view',()=>{
  expect(freeSpans(260,1820,VH,[box(296,1246,362,1400),box(1278,1872,464,1700)],[])).toEqual([]);
 });
 it('walks around words that his frame would touch, and ignores words above it',()=>{
  // A line of text at his height from 700 to 760, kept 6px clear of his frame; one well above him changes nothing.
  expect(freeSpans(260,1820,VH,[],[box(700,760,960,980),box(1000,1400,800,900)])).toEqual([[260,610],[766,1820]]);
 });
 it('counts words down where his paw prints land, but not below the floor line',()=>{
  expect(freeSpans(260,1820,VH,[],[box(700,760,990,995)])).toHaveLength(2);
  expect(freeSpans(260,1820,VH,[],[box(700,760,997,1010)])).toEqual([[260,1820]]);
 });
 it('ignores empty boxes and an inverted floor',()=>{
  expect(freeSpans(260,1820,VH,[box(600,600,900,1000)],[box(700,700,950,970)])).toEqual([[260,1820]]);
  expect(freeSpans(900,800,VH,[],[])).toEqual([]);
 });
});
