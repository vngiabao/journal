// One place for motion. GSAP and its plugins are registered once here; components import from this module.
// Every animation runs inside `whenMotionOK`, so "Reduce motion" turns it into nothing and the UI just appears.
import gsap from 'gsap';
import {useGSAP} from '@gsap/react';
import {DrawSVGPlugin} from 'gsap/DrawSVGPlugin';
import {SplitText} from 'gsap/SplitText';
import {Flip} from 'gsap/Flip';
import {CustomEase} from 'gsap/CustomEase';

gsap.registerPlugin(useGSAP,DrawSVGPlugin,SplitText,Flip,CustomEase);
// Charts without a line yet simply have nothing to draw; that is not worth a console warning.
gsap.config({nullTargetWarn:false});
// A pen stroke: quick to start, a long soft settle.
CustomEase.create('pen','M0,0 C0.25,0.1 0.25,1 1,1');
// A stamp: hits hard, a tiny rebound.
// Entrances settle fast and soft; movement eases in and out.
CustomEase.create('enter','M0,0 C0.23,1 0.32,1 1,1');
CustomEase.create('move','M0,0 C0.77,0 0.175,1 1,1');
CustomEase.create('stamp','M0,0 C0.4,0 0.55,1.2 0.7,1.08 0.82,0.98 0.9,0.99 1,1');

export const NO_MOTION='(prefers-reduced-motion: reduce)';
export const motionOK=()=>!window.matchMedia(NO_MOTION).matches;

// Runs `fn` only when motion is welcome; everything it creates is reverted with the returned matchMedia.
export function whenMotionOK(fn:()=>void){const mm=gsap.matchMedia();mm.add('(prefers-reduced-motion: no-preference)',fn);return mm;}

// Stroke animations leave a dash pattern behind; clear it so a path that later grows still shows in full.
export const CLEAR_DASH='strokeDasharray,strokeDashoffset';

export {gsap,useGSAP,SplitText,Flip};
