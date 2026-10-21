import {writeFile} from 'node:fs/promises';
import {RULES,createGame,advance,move,dash,result,EXPERIMENT_SEEDS} from '../src/engine.js';
// Limited deterministic pilot: react every .25s, consider only objects within z=.15.
// No access to future seeds; same policy and 10 seeds in both speed groups.
function pilot(g){const visible=g.objects.filter(o=>!o.done&&o.z>0&&o.z<.15).sort((a,b)=>a.z-b.z);if(!visible.length)return;const row=visible[0].row,core=visible.find(o=>o.row===row&&o.kind==='core');if(core&&core.lane!==g.lane)move(g,Math.sign(core.lane-g.lane));if(g.cooldown<=0&&visible.some(o=>o.row===row&&o.kind==='barrier'&&o.lane===g.lane&&o.z<.08))dash(g);}
const records=[];
for(const [group,speed] of [['A',1],['B',1.15]])for(const seed of EXPERIMENT_SEEDS){const g=createGame(speed,seed);let tick=0;while(g.state==='playing'){if(tick%30===0)pilot(g);advance(g,1/120);g.events.length=0;tick++;}records.push(result(g,'experiment',group));}
const median=a=>{a.sort((a,b)=>a-b);return(a[4]+a[5])/2;};
function stats(group){const a=records.filter(r=>r.group===group);return {count:a.length,scoreMedian:median(a.map(r=>r.score)),scoreMin:Math.min(...a.map(r=>r.score)),scoreMax:Math.max(...a.map(r=>r.score)),survivalMedian:median(a.map(r=>r.time)),survivalMin:Math.min(...a.map(r=>r.time)),survivalMax:Math.max(...a.map(r=>r.time)),wins:a.filter(r=>r.outcome==='win').length,failures:a.filter(r=>r.outcome==='lose').length,totalHits:a.reduce((n,r)=>n+r.hits,0)};}
const output={game:'NEON AFTERBURN',source:'deterministic-automated-pilot-not-human',changedParameter:'approach speed multiplier only: 1.0 versus 1.15',fixed:'same 10 seeds, phase spawn intervals, geometry, dash, shield, scoring and pilot policy (.25s reaction, z<.15 horizon)',rules:RULES,groups:{A:stats('A'),B:stats('B')},records};await writeFile('docs/evidence/automated-20-runs.json',JSON.stringify(output,null,2));console.log(output.groups);
