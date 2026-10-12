import {it,expect} from 'vitest';
import {journeyLevels} from '../src/engine';
it('keeps every intra-day turn inside the chart when moments cancel out',()=>{
 const movement={date:'2026-10-11',delta:0,note:'',milestone:false,moments:[{id:'up',delta:50,note:'',at:''},{id:'down',delta:-100,note:'',at:''},{id:'back',delta:50,note:'',at:''}]};
 expect(journeyLevels([movement],['2026-10-11'])).toEqual([0,50,-50,0]);
});
