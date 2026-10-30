// Horizon's motion vocabulary. Plugins are registered once in ../motion; this adds the "move" ease for travel
// (things going from one place to another) and "enter" for arrivals, next to the existing "pen" and "stamp".
import {CustomEase} from 'gsap/CustomEase';
import {gsap,motionOK,whenMotionOK,useGSAP,CLEAR_DASH} from '../motion';

CustomEase.create('move','M0,0 C0.77,0 0.175,1 1,1');
// Entrances: cubic-bezier(0.23,1,0.32,1), the same curve as --ease in tokens.css.
CustomEase.create('enter','M0,0 C0.23,1 0.32,1 1,1');

export {gsap,motionOK,whenMotionOK,useGSAP,CLEAR_DASH};
