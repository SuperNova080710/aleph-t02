// Original synthesized cues. No remote audio, samples, autoplay or music loop.
export class Sound {
 constructor(){this.ctx=null;this.muted=true;this.voices=new Set();}
 unlock(){if(this.muted)return;try{if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});}catch{this.ctx=null;}}
 setMuted(muted){this.muted=muted;if(muted){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}else this.unlock();}
 cue(type){if(this.muted||!this.ctx||this.ctx.state!=='running')return;const cues={core:[740,1100,.09,'sine'],dash:[140,500,.22,'sawtooth'],break:[260,80,.18,'triangle'],hit:[110,35,.2,'sawtooth'],near:[1000,1400,.06,'sine'],win:[523,1046,.5,'triangle'],lose:[220,55,.45,'triangle']};const c=cues[type];if(!c)return;const now=this.ctx.currentTime,o=this.ctx.createOscillator(),gain=this.ctx.createGain();o.type=c[3];o.frequency.setValueAtTime(c[0],now);o.frequency.exponentialRampToValueAtTime(c[1],now+c[2]);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+c[2]);o.connect(gain);gain.connect(this.ctx.destination);o.start();o.stop(now+c[2]+.01);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();gain.disconnect();};}
}
