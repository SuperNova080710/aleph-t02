export const RULES = Object.freeze({duration:30,lanes:3,health:3,dashDuration:0.42,dashCooldown:1.8,invulnerability:0.9,baseApproach:0.39,spawnIntervals:[0.82,0.68,0.56]});
export const SPEEDS=[0.85,1,1.15];
export const EXPERIMENT_SEEDS=Array.from({length:10},(_,i)=>20261021+i*7919);
export function random(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createGame(speed=1,seed=1){if(!SPEEDS.includes(speed))throw Error('Invalid speed');return {state:'playing',speed,seed:seed>>>0,elapsed:0,lane:1,health:3,score:0,cores:0,combo:0,maxCombo:0,hits:0,nearMisses:0,dashes:0,inputs:0,dash:0,cooldown:0,invulnerable:0,lastMove:-10,spawn:0,rows:0,objects:[],events:[],rng:random(seed)};}
export function event(g,type,extra={}){g.events.push({type,time:g.elapsed,...extra});}
export function move(g,direction){if(g.state!=='playing'||![-1,1].includes(direction))return false;g.inputs++;const before=g.lane;g.lane=Math.max(0,Math.min(2,g.lane+direction));if(g.lane!==before){g.lastMove=g.elapsed;event(g,'move',{lane:g.lane});}return true;}
export function dash(g){if(g.state!=='playing')return false;g.inputs++;if(g.cooldown>0)return false;g.dashes++;g.dash=RULES.dashDuration;g.cooldown=RULES.dashCooldown;event(g,'dash');return true;}
export function pause(g){if(g.state==='playing')g.state='paused';}
export function resume(g){if(g.state==='paused')g.state='playing';}
function spawn(g){
 const safe=Math.floor(g.rng()*3),phase=Math.min(2,Math.floor(g.elapsed/10));
 const other=[0,1,2].filter(x=>x!==safe);const blocked=phase===0?[other[g.rows%2]]:g.rows%3===0?other:[other[g.rows%2]];
 for(const lane of blocked)g.objects.push({id:g.rows+'b'+lane,row:g.rows,kind:'barrier',lane,z:1,done:false});
 g.objects.push({id:g.rows+'c',row:g.rows,kind:'core',lane:safe,z:1,done:false});
 g.rows++;
}
export function multiplier(g){return Math.min(5,1+Math.floor(g.combo/5));}
export function advance(g,dt){
 if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;
 let remaining=Math.min(dt,30-g.elapsed);
 while(remaining>1e-9&&g.state==='playing'){
  const step=Math.min(1/120,remaining);remaining-=step;g.elapsed+=step;
  g.dash=Math.max(0,g.dash-step);g.cooldown=Math.max(0,g.cooldown-step);g.invulnerable=Math.max(0,g.invulnerable-step);
  const phase=Math.min(2,Math.floor(g.elapsed/10));g.spawn+=step;
  if(g.spawn>=RULES.spawnIntervals[phase]){g.spawn-=RULES.spawnIntervals[phase];spawn(g);}
  for(const o of g.objects){
   o.z-=RULES.baseApproach*(1+phase*0.12)*g.speed*step;
   if(o.z<=0&&!o.done){
    o.done=true;
    if(o.kind==='core'&&o.lane===g.lane){g.cores++;g.combo++;g.maxCombo=Math.max(g.maxCombo,g.combo);const points=50*multiplier(g);g.score+=points;event(g,'core',{lane:o.lane,points,combo:g.combo});}
    if(o.kind==='barrier'){
     if(o.lane===g.lane){
      if(g.dash>0){g.score+=100*multiplier(g);event(g,'break',{lane:o.lane,points:100*multiplier(g)});}
      else if(g.invulnerable<=0){g.health--;g.hits++;g.combo=0;g.invulnerable=RULES.invulnerability;event(g,'hit',{lane:o.lane});if(g.health<=0){g.state='lose';event(g,'lose');break;}}
     }else if(g.elapsed-g.lastMove<0.23&&g.invulnerable<=0){g.nearMisses++;g.score+=40;event(g,'near',{lane:g.lane,points:40});}
    }
   }
  }
  g.objects=g.objects.filter(o=>o.z>-.2);
  if(g.state==='playing'&&g.elapsed>=30-1e-8){g.elapsed=30;g.state='win';g.score+=g.health*150;event(g,'win',{points:g.health*150});}
 }
}
export function result(g,mode='normal',group=null){return {speed:g.speed,seed:g.seed,time:Number(g.elapsed.toFixed(3)),score:g.score,cores:g.cores,maxCombo:g.maxCombo,hits:g.hits,nearMisses:g.nearMisses,dashes:g.dashes,inputs:g.inputs,outcome:g.state,reason:g.state==='win'?'30초 구간 완주':'실드 3회 손실',mode,group};}
export function rank(score){return score>=4000?'S':score>=2500?'A':score>=1200?'B':'C';}
