import { useState, useEffect, useCallback, useRef } from "react";

/* ══════════════════════════════════════════════════════════════
   COUNT-UP HOOK A — triggered by boolean (results panel)
   Animates 0 → target whenever `trigger` flips true,
   resets to 0 when `trigger` flips false.
══════════════════════════════════════════════════════════════ */
function useCountUp(target, duration = 950, trigger = false) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!trigger) { setVal(0); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      setVal(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else setVal(target);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, trigger, duration]);
  return val;
}

/* ══════════════════════════════════════════════════════════════
   COUNT-UP HOOK B — triggered by version counter (CTA button)
   Animates 0 → target whenever `version` increments.
   When only `target` changes (typing), shows new value directly
   without re-animating (avoids jank on every keystroke).
══════════════════════════════════════════════════════════════ */
function useCountUpVersioned(target, duration = 850, version = 0) {
  const [val, setVal]  = useState(0);
  const rafRef         = useRef(null);
  const valRef         = useRef(0);      // mirrors the current displayed value
  const debounceRef    = useRef(null);
  const prevVersionRef = useRef(0);

  const runAnim = (from, to, dur) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const t0 = performance.now(), diff = to - from;
    const step = (now) => {
      const p     = Math.min((now - t0) / dur, 1);
      const eased = 1 - (1 - p) ** 3;
      const v     = Math.round(from + eased * diff);
      valRef.current = v; setVal(v);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { valRef.current = to; setVal(to); rafRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (version !== prevVersionRef.current) {
      // Version bumped (preset tap / first result) → always count from 0
      prevVersionRef.current = version;
      runAnim(0, target, duration);
    } else {
      // Target changed (typing) → debounce 200 ms, then count from current value
      debounceRef.current = setTimeout(() => {
        if (target !== valRef.current)
          runAnim(valRef.current, target, Math.min(duration, 500));
      }, 200);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [target, version]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return val;
}

/* ══════════════════════════════════════════════════════════════
   CANVAS HELPERS
══════════════════════════════════════════════════════════════ */
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "", count = 0;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y + count * lh);
      line = w + " "; count++;
    } else line = test;
  }
  ctx.fillText(line.trim(), x, y + count * lh);
  return count + 1;
}
function generateShareImage({ nominal, real, months, yrs, amount, freq, presetObj, char, quote, settings }) {
  const W = 1080, H = 1080, pad = 80;
  const cvs = document.createElement("canvas");
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07071A"); bg.addColorStop(1, "#0F0822");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let gx = 72; gx < W; gx += 72)
    for (let gy = 72; gy < H; gy += 72) {
      ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  const aG = ctx.createLinearGradient(0, 0, W, 0);
  aG.addColorStop(0, char.col); aG.addColorStop(.5, "#10F07A"); aG.addColorStop(1, char.col);
  ctx.fillStyle = aG; ctx.fillRect(0, 0, W, 9); ctx.fillRect(0, H - 9, W, 9);
  ctx.fillStyle = "#10F07A"; ctx.font = "bold 40px Arial,Helvetica,sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("FRUGAL CALCULATOR", pad, 80);
  ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, 100); ctx.lineTo(W - pad, 100); ctx.stroke();
  const fL = { once:"one-time", daily:"daily", weekly:"weekly", monthly:"monthly", annually:"yearly" }[freq] || freq;
  const iL = presetObj ? presetObj.label : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(amount) + " spend";
  ctx.fillStyle = "#94A3B8"; ctx.font = "34px Arial,Helvetica,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`Your ${fL} ${iL}`, W / 2, 148);
  ctx.fillStyle = "#64748B"; ctx.font = "28px Arial,Helvetica,sans-serif";
  ctx.fillText("compounded over time becomes...", W / 2, 185);
  const nS = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(nominal);
  const fs = nS.length > 13 ? 82 : nS.length > 11 ? 96 : nS.length > 9 ? 108 : 118;
  ctx.fillStyle = "#10F07A"; ctx.font = `bold ${fs}px 'Courier New',Courier,monospace`; ctx.textAlign = "center";
  ctx.fillText(nS, W / 2, 320);
  ctx.fillStyle = "#475569"; ctx.font = "26px Arial,Helvetica,sans-serif";
  ctx.fillText(`at retirement in ${yrs} years  ·  ${settings.growthRate}% annual return`, W / 2, 366);
  ctx.fillStyle = "#374151"; ctx.font = "22px Arial,Helvetica,sans-serif";
  ctx.fillText(`in today's dollars: ${new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(real)}`, W / 2, 396);
  const isSubM = nominal < settings.monthlyExpense;
  const pTxt = isSubM
    ? `${Math.round((nominal / settings.monthlyExpense) * 100)}% of one retirement paycheck`
    : `${Math.round(nominal / settings.monthlyExpense)} months of retirement STOLEN`;
  const pY = 420, pH = 86;
  ctx.fillStyle = "rgba(251,146,60,.12)";
  rrect(ctx, pad, pY, W - 2 * pad, pH, 22); ctx.fill();
  ctx.strokeStyle = "rgba(251,146,60,.38)"; ctx.lineWidth = 2;
  rrect(ctx, pad, pY, W - 2 * pad, pH, 22); ctx.stroke();
  ctx.fillStyle = "#FB923C"; ctx.font = "bold 40px Arial,Helvetica,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(pTxt, W / 2, pY + 55);
  const multi = amount > 0 ? Math.round(nominal / amount) : 0;
  const hw = (W - 2 * pad - 18) / 2, sY = 526, sH = 76;
  ctx.fillStyle = "rgba(16,240,122,.09)"; rrect(ctx, pad, sY, hw, sH, 18); ctx.fill();
  ctx.strokeStyle = "rgba(16,240,122,.22)"; ctx.lineWidth = 1.5; rrect(ctx, pad, sY, hw, sH, 18); ctx.stroke();
  ctx.fillStyle = "#10F07A"; ctx.font = "bold 34px Arial,Helvetica,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`${multi}\u00d7 your money`, pad + hw / 2, sY + 48);
  ctx.fillStyle = "rgba(167,139,250,.09)"; rrect(ctx, pad + hw + 18, sY, hw, sH, 18); ctx.fill();
  ctx.strokeStyle = "rgba(167,139,250,.22)"; ctx.lineWidth = 1.5; rrect(ctx, pad + hw + 18, sY, hw, sH, 18); ctx.stroke();
  ctx.fillStyle = "#A78BFA"; ctx.fillText(`${yrs} years of growth`, pad + hw + 18 + hw / 2, sY + 48);
  const maxQ = 185;
  const qTxt = `"${quote.length > maxQ ? quote.substring(0, maxQ) + "..." : quote}"`;
  ctx.fillStyle = "#CBD5E1"; ctx.font = "italic 30px Arial,Helvetica,sans-serif"; ctx.textAlign = "center";
  const qY = 648, qLH = 44;
  const nL = wrapText(ctx, qTxt, W / 2, qY, W - 2 * pad - 20, qLH);
  ctx.fillStyle = char.col; ctx.font = `bold 27px Arial,Helvetica,sans-serif`;
  ctx.fillText(`\u2014 ${char.name}`, W / 2, qY + nL * qLH + 14);
  const retM = Math.max(1, (settings.lifeExpectancy - settings.retirementAge) * 12);
  const pct  = isSubM
    ? Math.min(99, (nominal / settings.monthlyExpense) * 100)
    : Math.min(100, (nominal / settings.monthlyExpense / retM) * 100);
  const bY = 890, bH = 13;
  ctx.fillStyle = "#475569"; ctx.font = "20px Arial,Helvetica,sans-serif"; ctx.textAlign = "left";
  ctx.fillText("Retirement Pain Meter", pad, bY - 11);
  ctx.textAlign = "right";
  ctx.fillStyle = pct > 60 ? "#DC2626" : pct > 30 ? "#F97316" : pct > 10 ? "#EAB308" : "#22D469";
  ctx.fillText(`${Math.round(pct)}%`, W - pad, bY - 11);
  ctx.fillStyle = "rgba(255,255,255,.12)"; rrect(ctx, pad, bY, W - 2 * pad, bH, 7); ctx.fill();
  const bF = Math.max(13, (W - 2 * pad) * pct / 100);
  const bG = ctx.createLinearGradient(pad, 0, pad + bF, 0);
  bG.addColorStop(0, "#10F07A");
  bG.addColorStop(1, pct > 60 ? "#7F1D1D" : pct > 30 ? "#EF4444" : pct > 10 ? "#F97316" : "#22D469");
  ctx.fillStyle = bG; rrect(ctx, pad, bY, bF, bH, 7); ctx.fill();
  ctx.fillStyle = "#1E293B"; ctx.font = "20px Arial,Helvetica,sans-serif"; ctx.textAlign = "center";
  ctx.fillText("frugalcalculator.app  \u00b7  Your future self says: stop spending.", W / 2, 960);
  return cvs.toDataURL("image/png");
}

/* ══════════════════════════════════════════════════════════════
   URL ENCODE / DECODE
══════════════════════════════════════════════════════════════ */
function encodeUrl({ amount, freq }, settings) {
  try {
    const base = window.location.href.split("?")[0].split("#")[0];
    const p = new URLSearchParams({
      a: amount, f: freq,
      ca: settings.currentAge,  ra: settings.retirementAge,
      le: settings.lifeExpectancy, gr: settings.growthRate,
      ir: settings.inflationRate,  me: settings.monthlyExpense,
    });
    return `${base}?${p}`;
  } catch { return window.location.href; }
}
function decodeUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (!p.has("a")) return null;
    const amount = parseFloat(p.get("a"));
    if (!amount || !isFinite(amount) || amount <= 0) return null;
    const s = {};
    for (const [k, v] of Object.entries({ ca:"currentAge", ra:"retirementAge", le:"lifeExpectancy", me:"monthlyExpense" }))
      if (p.has(k)) s[v] = parseInt(p.get(k));
    for (const [k, v] of Object.entries({ gr:"growthRate", ir:"inflationRate" }))
      if (p.has(k)) s[v] = parseFloat(p.get(k));
    return { amount, freq: p.get("f") || "once", settings: s };
  } catch { return null; }
}

/* ══════════════════════════════════════════════════════════════
   CORE MATH UTILS
══════════════════════════════════════════════════════════════ */
const doCalc = (a,b,op) => ({"+":a+b,"-":a-b,"×":a*b,"÷":b?a/b:0}[op]??b);
function calcFV({amount,freq,currentAge,retirementAge,growthRate,inflationRate}){
  const yrs=retirementAge-currentAge;
  if(yrs<=0||amount<=0)return{nominal:0,real:0,yrs:0};
  const r=growthRate/100,inf=inflationRate/100,rr=(1+r)/(1+inf)-1;
  if(freq==="once")return{nominal:amount*(1+r)**yrs,real:amount*(1+rr)**yrs,yrs};
  const ppy={daily:365,weekly:52,monthly:12,annually:1}[freq]??12;
  const n=yrs*ppy,rp=(1+r)**(1/ppy)-1,rrp=(1+rr)**(1/ppy)-1;
  return{
    nominal:rp>0?amount*((1+rp)**n-1)/rp:amount*n,
    real:rrp>0?amount*((1+rrp)**n-1)/rrp:amount*n,yrs
  };
}
const usd  = n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const usd2 = n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n||0);
const short = n=>{
  if(!n||!isFinite(n)||n<0)return"$0";
  if(n>=1e9)return`$${(n/1e9).toFixed(2)}B`;
  if(n>=1e6)return`$${(n/1e6).toFixed(2)}M`;
  if(n>=1e3)return`$${(n/1e3).toFixed(1)}K`;
  return`$${Math.round(n)}`;
};
function fmtDisp(raw){
  if(!raw||raw==="0")return"$0";
  if(raw==="-0")return"$0";
  if(raw.endsWith(".")){return(raw.startsWith("-")?"-$":"$")+(raw.startsWith("-")?raw.slice(1):raw);}
  const num=parseFloat(raw);if(isNaN(num))return raw;
  const dot=raw.indexOf(".");
  if(dot===-1)return usd(num);
  const dec=raw.length-dot-1;
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:dec,maximumFractionDigits:dec}).format(num);
}
function cannotAfford(fv){
  if(fv>=5e6)    return"a yacht AND a waterfront estate";
  if(fv>=2e6)    return"two vacation homes";
  if(fv>=1e6)    return"a vacation home outright";
  if(fv>=600000) return"a house in most major US cities";
  if(fv>=380000) return"a house outright in dozens of US cities";
  if(fv>=220000) return"a Porsche 911 in cash";
  if(fv>=100000) return"a luxury SUV and a year of travel";
  if(fv>=55000)  return"a fully-loaded new vehicle";
  if(fv>=25000)  return"a first-class trip around the world";
  if(fv>=10000)  return"a full kitchen renovation";
  if(fv>=5000)   return"a business-class flight to Europe";
  if(fv>=2000)   return"3 months of car payments";
  if(fv>=500)    return"a month of groceries";
  return"a nice dinner every week";
}
function getPainSubMonthly(pct){
  if(pct>=300)return{col:"#7F1D1D",lbl:`${Math.round(pct/100)}× your entire monthly budget 🚨`};
  if(pct>=200)return{col:"#991B1B",lbl:"Multiple paychecks — just gone ☢️"};
  if(pct>=100)return{col:"#DC2626",lbl:"More than a full monthly budget 😰"};
  if(pct<10)  return{col:"#22D469",lbl:"Pocket change... in retirement terms 🪶"};
  if(pct<25)  return{col:"#86EFAC",lbl:"A quarter of your first paycheck 🤏"};
  if(pct<50)  return{col:"#EAB308",lbl:"Half a retirement paycheck 😬"};
  if(pct<75)  return{col:"#F97316",lbl:"Three-quarters of a paycheck. Yikes. 😤"};
  return       {col:"#EF4444",lbl:"Almost a full retirement paycheck gone 😱"};
}
function getPainMultiMonth(pct){
  if(pct<1) return{col:"#22D469",lbl:"Barely a rounding error 🪶"};
  if(pct<3) return{col:"#4ADE80",lbl:"Barely a scratch... for now 😏"};
  if(pct<8) return{col:"#A3E635",lbl:"You'll feel that in 30 years 👀"};
  if(pct<15)return{col:"#EAB308",lbl:"There goes a vacation ✈️❌"};
  if(pct<25)return{col:"#F59E0B",lbl:"Months of freedom, evaporated 🚗💨"};
  if(pct<40)return{col:"#F97316",lbl:"A year+ of retirement. Gone. 🔥"};
  if(pct<55)return{col:"#EF4444",lbl:"Retiring significantly later 🕰️"};
  if(pct<70)return{col:"#DC2626",lbl:"Working till you drop 👴⚰️"};
  if(pct<85)return{col:"#991B1B",lbl:"🚨 FINANCIAL CRIMES DETECTED"};
  return      {col:"#7F1D1D",lbl:"☢️ TOTAL RETIREMENT ANNIHILATION"};
}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=~~(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

/* ══════════════════════════════════════════════════════════════
   COLORS & MONO
══════════════════════════════════════════════════════════════ */
const C={
  green:"#10F07A",purple:"#A78BFA",orange:"#FB923C",
  red:"#F87171",  gold:"#FCD34D", cyan:"#22D3EE",
  bg:"#07071A",   surface:"rgba(255,255,255,.05)",border:"rgba(255,255,255,.09)",
  t1:"#F1F5F9",t2:"#94A3B8",t3:"#64748B",t4:"#4B5563",
};
const MONO={fontFamily:"'SF Mono','Fira Code',Consolas,monospace"};

/* ══════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════ */
const CHARS=[
  {id:"grumpy",name:"Future You",av:"👴",tag:"Back in MY day, we SAVED.",col:"#FF6B35",bg:"rgba(255,107,53,.13)",
   q({amount,fv,months,label,freq}){
    const i=label||"that",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    const fs=freq==="daily"?"every day":freq==="weekly"?"every week":freq==="monthly"?"every month":freq==="annually"?"every year":"that one time";
    return[
      `*shuffles in* ${a} on ${i.toUpperCase()}, ${fs}?! That's ${f} from MY retirement. Give. It. Back. NOW.`,
      `${f}. That's what this becomes. I could've had ${cant}. But you chose ${i}. I am writing you out of the will.`,
      `${months} months. You stole ${months} months of MY retirement for ${i}. I hobbled here from the future to tell you.`,
      `I eat store-brand crackers because ${a}, ${fs}, compounded = ${f}. That was ${cant}. MY FUTURE. GONE.`,
      `*slams walker* ${f.toUpperCase()}!! That's ${cant.toUpperCase()}!! But sure! Enjoy ${i}! I'll be at WALMART!`,
      `I called to yell. Got voicemail. So I'm HERE. ${a} = ${f} = no ${cant}. ARE YOU HAPPY NOW.`,
      `Every time you buy ${i} ${fs}, a piece of my ${cant} dies. Today was ${f} worth.`,
      `This is fine. *eye twitch* ${f} is just gone. The ${cant} wasn't important anyway. *eye twitch*`,
    ][~~(Math.random()*8)];
   }},
  {id:"bro",name:"Finance Bro Kevin",av:"🧢",tag:"Have you heard of index funds?",col:"#4ECDC4",bg:"rgba(78,205,196,.13)",
   q({amount,fv,months,label,freq}){
    const i=label||"that",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    const fs=freq==="daily"?"daily":freq==="weekly"?"weekly":freq==="monthly"?"monthly":"";
    return[
      `Not everyone needs ${cant}. Really inspirational choosing ${a} on ${i} ${fs} over ${f}. Truly. 👏`,
      `Bold — sacrificing ${f} for ${a} ${fs} on ${i}. Buffett would never, but you do you. 😊`,
      `I have a 34-slide deck: why ${a} ${fs} compounds to ${f}. Slide 1: Stop buying ${i}. Slide 34: Told you.`,
      `You traded ${cant} (${f}) for ${i}. Not upset. Just 📊 deeply, professionally concerned.`,
      `${f} opportunity cost. Nursing home brochures looked okay. Shuffleboard Tuesdays. 🙂`,
      `Fun fact: ${a} invested ${fs} becomes ${f}. That's ${cant}. You chose ${i}. Not fun.`,
      `Look at this compound interest chart. *points at ${f}* See this line? That was YOU. Gone.`,
      `${a} × compound interest = ${cant} you won't have. Class dismissed. No extra credit. 📈`,
    ][~~(Math.random()*8)];
   }},
  {id:"grandma",name:"Disappointed Grandma",av:"👵",tag:"Not mad. Just... disappointed.",col:"#C77DFF",bg:"rgba(199,125,255,.13)",
   q({amount,fv,months,label,freq}){
    const i=label||"this",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    const fs=freq==="daily"?"every morning":freq==="weekly"?"every week":freq==="monthly"?"every month":"";
    return[
      `Oh sweetie... *heavy sigh* ...Grandpa skipped lunch for 12 years so you could have ${cant}. Enjoy ${i}.`,
      `I'm not mad. *knits 40% faster* Just thinking about those ${months} retirement months you gave away.`,
      `We reused rubber bands. Saved tin foil. And here you are — ${a} on ${i} ${fs}.`,
      `That ${f} was your golden years. ${cant.charAt(0).toUpperCase()+cant.slice(1)}. A little joy. But here we are.`,
      `*looks at ${i}* *looks at ${f}* *very long sigh* ...Have you called your mother?`,
      `Grandpa ate sandwiches for 20 years. You have ${a} ${fs} for ${i}. The irony.`,
      `I raised you to know ${a} ${fs} is ${f} is ${cant}. AND YET. Here we are. With ${i}.`,
      `Don't tell me how much you spent. *you tell her* ...Oh. *sets down knitting* Oh. *knits FURIOUSLY*`,
    ][~~(Math.random()*8)];
   }},
  {id:"bard",name:"Bard of Broke",av:"🎭",tag:"To spend, or not to spend...",col:"#FCD34D",bg:"rgba(252,211,77,.1)",
   q({amount,fv,months,label,freq}){
    const i=label||"this trinket",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    return[
      `O WRETCHED MORTAL! For ${a} in silver thou hast condemned thyself to ${months} forsaken moons of poverty!`,
      `Hark! What fool — to trade ${cant} (${f}!) for today's fleeting ${i}?! The compound gods weep!`,
      `All the world's a stage. Thou hast chosen: "Person Who Cannot Afford ${cant.charAt(0).toUpperCase()+cant.slice(1)}." ${f} — exit.`,
      `Act I: ${a} on ${i}. Act II: ${f} gone. Act III: No ${cant}. Act IV: Working at 78. *lute plays*`,
      `'Twas only ${a}! cried the mortal! Yet ${f} wept! TO BE FRUGAL — THOU CHOSE NOT!`,
      `Methinks ${f} doth vanish like morning dew upon the cold stones of thy ${i}-filled future. ALAS!`,
      `The cosmic accountant tallies: ${a} × compound interest = ${f} = ${cant} = GONE. *slams abacus*`,
      `For ${f} is not just coin — 'tis ${cant}! 'Tis ${months} moons of rest! 'Tis EVERYTHING! *collapses*`,
    ][~~(Math.random()*8)];
   }},
];
const PRESETS=[
  {id:"latte",  e:"☕",label:"Daily Latte",  amount:6,    freq:"daily"  },
  {id:"netflix",e:"📺",label:"Netflix",       amount:15.99,freq:"monthly"},
  {id:"airpods",e:"🎧",label:"AirPods Pro",   amount:249,  freq:"once"  },
  {id:"brunch", e:"🥑",label:"Brunch",        amount:45,   freq:"weekly" },
  {id:"pizza",  e:"🍕",label:"Pizza Night",   amount:30,   freq:"weekly" },
  {id:"sneakers",e:"👟",label:"Sneakers",     amount:150,  freq:"once"  },
  {id:"bar",    e:"🍺",label:"Bar Night",     amount:80,   freq:"weekly" },
  {id:"trip",   e:"✈️",label:"Weekend Trip",  amount:500,  freq:"once"  },
  {id:"iphone", e:"📱",label:"New iPhone",    amount:1099, freq:"once"  },
  {id:"car",    e:"🚗",label:"Car Payment",   amount:450,  freq:"monthly"},
  {id:"gym",    e:"💪",label:"Gym",           amount:50,   freq:"monthly"},
  {id:"eats",   e:"🛵",label:"Uber Eats/wk", amount:35,   freq:"weekly" },
];
const FREQS=[
  {id:"once",    short:"1×",    label:"One-time"},
  {id:"daily",   short:"Daily", label:"Daily"   },
  {id:"weekly",  short:"Weekly",label:"Weekly"  },
  {id:"monthly", short:"Mo.",   label:"Monthly" },
  {id:"annually",short:"Yr.",   label:"Yearly"  },
];
const DEF={
  currentAge:28,retirementAge:65,lifeExpectancy:85,
  growthRate:7,inflationRate:3,monthlyExpense:3000,
  characterId:"grumpy",showPresets:true,randomizeAdvisor:true,
};

/* ══════════════════════════════════════════════════════════════
   PWA ICON
══════════════════════════════════════════════════════════════ */
function injectPWA(){
  try{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1E0A3C"/><stop offset="100%" stop-color="#07071A"/>
      </linearGradient></defs>
      <rect width="192" height="192" rx="42" fill="url(#g)"/>
      <text x="96" y="116" text-anchor="middle" font-family="-apple-system,Helvetica,sans-serif"
        font-size="98" font-weight="900" fill="#10F07A">$</text>
      <line x1="38" y1="84" x2="154" y2="84" stroke="#FB923C" stroke-width="11" stroke-linecap="round"/>
      <text x="96" y="170" text-anchor="middle" font-family="-apple-system,Helvetica,sans-serif"
        font-size="12" font-weight="700" fill="#10F07A" letter-spacing="3" opacity="0.55">FRUGAL</text>
    </svg>`;
    const uri=`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    [["apple-touch-icon",""],["icon","image/svg+xml"]].forEach(([rel,type])=>{
      const l=document.createElement("link");l.rel=rel;if(type)l.type=type;l.href=uri;document.head.appendChild(l);
    });
    const blob=new Blob([JSON.stringify({name:"Frugal Calculator",short_name:"Frugal",
      description:"Your future self is watching. And crying.",start_url:".",display:"standalone",
      background_color:"#07071A",theme_color:"#07071A",
      icons:[{src:uri,sizes:"192x192",type:"image/svg+xml"}]
    })],{type:"application/json"});
    const ml=document.createElement("link");ml.rel="manifest";ml.href=URL.createObjectURL(blob);
    document.head.appendChild(ml);
  }catch{}
}

/* ══════════════════════════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════════════════════════ */
function Slider({label,value,min,max,step=1,unit="",onChange,color=C.green}){
  const[editing,setEditing]=useState(false);
  const pct=((value-min)/(max-min))*100;
  const disp=unit==="$"?usd(value):`${value}${unit}`;
  const commit=v=>{const n=Math.max(min,Math.min(max,parseFloat(v)||value));onChange(Math.round(n/step)*step);setEditing(false);};
  return(
    <div style={{marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"center"}}>
        <span style={{color:C.t2,fontSize:13}}>{label}</span>
        {editing
          ?<input autoFocus type="number" defaultValue={value}
              style={{width:88,padding:"3px 8px",background:"#1A1535",border:`1px solid ${color}`,
                borderRadius:8,color:C.t1,fontSize:13,...MONO,textAlign:"right",outline:"none"}}
              onBlur={e=>commit(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditing(false);}}/>
          :<span onClick={()=>setEditing(true)}
              style={{...MONO,color:C.t1,fontWeight:700,fontSize:13,cursor:"pointer",
                padding:"3px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface}}>
              {disp}
            </span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(+e.target.value)}
        style={{width:"100%",accentColor:color,background:`linear-gradient(to right,${color} ${pct}%,#1A1535 ${pct}%)`}}/>
    </div>
  );
}
function Card({children,accent,style={}}){
  return(
    <div style={{background:C.surface,borderRadius:20,padding:16,marginBottom:10,
      border:`1px solid ${accent?accent+"33":C.border}`,...style}}>
      {children}
    </div>
  );
}
const SL=({c})=>(
  <div style={{fontSize:10,fontWeight:800,color:C.t3,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>{c}</div>
);
function Toggle({value,onChange,label}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <span style={{color:C.t2,fontSize:13}}>{label}</span>
      <button onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,border:"none",
        cursor:"pointer",position:"relative",background:value?C.green:"rgba(255,255,255,.14)",
        transition:"background .2s",flexShrink:0}}>
        <div style={{position:"absolute",top:2,left:value?22:2,width:20,height:20,borderRadius:10,
          background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}/>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HORIZONTAL SIDE-BY-SIDE CHEVRONS  ›  ›  ›
   Bigger, staggered slide animation, laid out in a row.
══════════════════════════════════════════════════════════════ */
function Chevrons({ color = C.green }) {
  return (
    <div style={{
      display:"flex", flexDirection:"row", alignItems:"center",
      justifyContent:"center", gap:5, flexShrink:0, paddingLeft:4,
    }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ animation:`chevSlide 1.5s ease-in-out ${i * 0.18}s infinite` }}>
          <div style={{
            width: 18, height: 18,
            borderTop:   `3px solid ${color}`,
            borderRight: `3px solid ${color}`,
            transform: "rotate(45deg)",
            borderRadius: 3,
          }} />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PARAM CHECK POPUP
══════════════════════════════════════════════════════════════ */
const PARAM_MSGS=[
  lc=>({title:"⚠️ Your Future Self Filed a Complaint",
    body:lc===1?"First visit! Before we calculate your financial regret, are these settings actually you?"
      :`Launch #${lc}. Your future self requires a settings audit every 10 uses. Compliance is not optional.`}),
  ()=>({title:"📋 Mandatory Regret Audit",body:`Your future self rang. Couldn't hear much over the crying, but "CHECK YOUR SETTINGS" came through loud.`}),
  ()=>({title:"👴 Certified Letter from Future You",body:`"ARE THOSE SETTINGS CORRECT?? I'm eating crackers at 74. Please. Just. Verify. The. Settings."`}),
  lc=>({title:"🔔 Biennial Wellness Check",body:`${lc} launches in and we STILL haven't confirmed you're not pretending to be 28 forever.`}),
];
function ParamCheckPopup({settings,launchCount,onConfirm,onSettings}){
  const m=PARAM_MSGS[Math.min(~~((launchCount-1)/10),PARAM_MSGS.length-1)](launchCount);
  const rows=[
    {l:"Your age",v:`${settings.currentAge}`},{l:"Retirement age",v:`${settings.retirementAge}`},
    {l:"You expire at",v:`${settings.lifeExpectancy}`},{l:"Growth rate",v:`${settings.growthRate}%`},
    {l:"Inflation",v:`${settings.inflationRate}%`},{l:"Monthly budget",v:usd(settings.monthlyExpense)},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"flex-end",
      justifyContent:"center",zIndex:300,backdropFilter:"blur(10px)",
      padding:"0 16px 16px",paddingBottom:"max(16px,env(safe-area-inset-bottom))"}}>
      <div style={{background:"#120F30",border:`1px solid ${C.purple}44`,borderRadius:24,
        padding:22,width:"100%",maxWidth:400,animation:"slideUp .35s cubic-bezier(.34,1.56,.64,1)"}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:8,color:C.t1}}>{m.title}</div>
        <div style={{fontSize:13,color:C.t2,lineHeight:1.65,marginBottom:16}}>{m.body}</div>
        <div style={{background:"rgba(255,255,255,.04)",borderRadius:14,padding:14,marginBottom:18}}>
          {rows.map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
              borderBottom:i<rows.length-1?"1px solid rgba(255,255,255,.05)":"none"}}>
              <span style={{color:C.t3,fontSize:12}}>{r.l}</span>
              <span style={{...MONO,color:C.t2,fontSize:12,fontWeight:700}}>{r.v}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onSettings} style={{flex:1,padding:12,background:"rgba(255,255,255,.06)",
            border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontWeight:700,
            cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>⚙️ Fix it</button>
          <button onClick={onConfirm} style={{flex:2,padding:12,background:C.green,border:"none",
            borderRadius:12,color:"#000",fontWeight:900,cursor:"pointer",fontSize:13,
            fontFamily:"inherit"}}>✅ Looks right!</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RESULTS PANEL  (slides from right, count-up on FV)
══════════════════════════════════════════════════════════════ */
function ResultsPanel({visible,onClose,result,quote,char,settings,onShare,onReRoast}){
  if(!result||result.nominal<=0)return null;
  const{nominal,real,months,yrs,amount}=result;
  const multi=amount>0?Math.round(nominal/amount):0;
  const animNominal=useCountUp(nominal,950,visible);
  const retirementMonths=Math.max(1,(settings.lifeExpectancy-settings.retirementAge)*12);
  const rawMonths=nominal/settings.monthlyExpense;

  // ── Monthly scale: what fraction of one retirement paycheck ──
  const monthlyPct  = rawMonths*100;
  const monthlyBar  = Math.min(100, monthlyPct);
  const monthlySev  = getPainSubMonthly(monthlyPct);
  const monthlyDetail = monthlyPct>=100
    ? `${rawMonths.toFixed(1)}× your ${usd(settings.monthlyExpense)}/mo budget`
    : `${Math.round(monthlyPct)}% of your ${usd(settings.monthlyExpense)}/mo budget`;

  // ── Retirement scale: what fraction of the total retirement span ──
  const retirePct    = Math.min(100,(rawMonths/retirementMonths)*100);
  const retireSev    = getPainMultiMonth(retirePct);
  const retireDetail = `${Math.round(rawMonths)} of your ${retirementMonths} retirement months (${Math.round(retirePct)}%)`;
  const cant=cannotAfford(nominal);
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,
      background:`linear-gradient(160deg,${C.bg} 0%,#100A2A 100%)`,
      transform:`translateX(${visible?"0":"100%"})`,
      transition:"transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)",
      zIndex:150,overflowY:"auto",overflowX:"hidden",maxWidth:430,margin:"0 auto"}}>
      <div style={{position:"sticky",top:0,background:"rgba(7,7,26,.96)",backdropFilter:"blur(20px)",
        padding:"12px 16px",borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",gap:12,zIndex:1}}>
        <button onClick={onClose} style={{background:"rgba(16,240,122,.14)",
          border:`1px solid ${C.green}55`,borderRadius:12,width:46,height:46,
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",color:C.green,fontSize:22,flexShrink:0,fontFamily:"inherit",fontWeight:700}}>←</button>
        <div>
          <div style={{fontSize:13,fontWeight:800,color:C.t1}}>Retirement Impact</div>
          <div style={{fontSize:11,color:C.t3}}>Your future self is not doing okay</div>
        </div>
      </div>
      <div style={{padding:"0 16px 100px"}}>
        <div style={{margin:"14px 0",background:char.bg,border:`1px solid ${char.col}44`,borderRadius:20,padding:16}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
            <span style={{fontSize:34,flexShrink:0,lineHeight:1}}>{char.av}</span>
            <div>
              <div style={{fontSize:9,color:char.col,fontWeight:800,letterSpacing:1.5,marginBottom:4}}>{char.name.toUpperCase()}</div>
              <div style={{fontSize:13,color:"#E2E8F0",lineHeight:1.6,fontStyle:"italic"}}>"{quote}"</div>
            </div>
          </div>
          <button onClick={onReRoast} style={{padding:"5px 12px",fontSize:11,background:"rgba(255,255,255,.07)",
            border:"none",borderRadius:10,color:C.t2,cursor:"pointer",fontFamily:"inherit"}}>🎲 Roast me again</button>
        </div>
        <div style={{textAlign:"center",padding:"18px 0 14px"}}>
          <div style={{fontSize:12,color:C.t2,marginBottom:5}}>Future value in {yrs} yrs · {settings.growthRate}% return</div>
          <div style={{...MONO,fontSize:nominal>9999999?30:nominal>999999?36:48,
            fontWeight:700,color:C.green,letterSpacing:-2,lineHeight:1}}>
            {usd(animNominal)}
          </div>
          <div style={{fontSize:12,color:C.t3,marginTop:6}}>Today's dollars: {usd(real)}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {/* Always show months stolen — decimal if < 1 */}
          <div style={{background:"rgba(251,146,60,.09)",border:"1px solid rgba(251,146,60,.22)",borderRadius:14,padding:12,textAlign:"center"}}>
            <div style={{fontSize:20}}>⏳</div>
            <div style={{...MONO,fontSize:rawMonths<1?20:rawMonths>=100?20:26,fontWeight:700,color:C.orange,lineHeight:1.1}}>
              {rawMonths<1?rawMonths.toFixed(2):Math.round(rawMonths)}
            </div>
            <div style={{fontSize:10,color:C.orange,fontWeight:700}}>MONTHS STOLEN</div>
            <div style={{fontSize:11,color:C.t2}}>of retirement</div>
          </div>
          <div style={{background:"rgba(16,240,122,.07)",border:"1px solid rgba(16,240,122,.22)",borderRadius:14,padding:12,textAlign:"center"}}>
            <div style={{fontSize:20}}>🚀</div>
            <div style={{...MONO,fontSize:26,fontWeight:700,color:C.green,lineHeight:1.1}}>{multi}×</div>
            <div style={{fontSize:10,color:C.green,fontWeight:700}}>GROWTH</div>
            <div style={{fontSize:11,color:C.t2}}>if invested now</div>
          </div>
        </div>

        <div style={{background:"rgba(252,211,77,.07)",border:"1px solid rgba(252,211,77,.18)",borderRadius:16,padding:14,marginBottom:12}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:5}}>💎 WHAT YOU COULD'VE HAD</div>
          <div style={{fontSize:15,color:"#FEF3C7",fontWeight:700}}>👉 {cant.charAt(0).toUpperCase()+cant.slice(1)}</div>
          <div style={{fontSize:11,color:"#92400E",marginTop:4}}>worth {usd(nominal)} at retirement</div>
        </div>

        {/* ── Both pain meters, always shown ── */}
        <div style={{marginBottom:16}}>
          {/* Monthly scale */}
          <div style={{marginBottom:13}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:11,marginBottom:6}}>
              <span style={{color:C.t2}}>
                💳 vs Monthly Budget
                <span style={{fontSize:9,color:C.t3,marginLeft:5}}>· Monthly Scale</span>
              </span>
              <span style={{color:monthlySev.col,fontWeight:700,fontSize:10}}>{monthlySev.lbl}</span>
            </div>
            <div style={{background:"rgba(255,255,255,.12)",borderRadius:99,height:9,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,width:`${Math.max(2,monthlyBar)}%`,
                background:`linear-gradient(90deg,${C.green},${monthlySev.col})`,
                transition:"width 1s cubic-bezier(.34,1.56,.64,1)"}}/>
            </div>
            <div style={{fontSize:11,color:C.t3,marginTop:4}}>{monthlyDetail}</div>
          </div>

          {/* Retirement scale */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:11,marginBottom:6}}>
              <span style={{color:C.t2}}>
                ⚰️ vs Total Retirement
                <span style={{fontSize:9,color:C.t3,marginLeft:5}}>· Retirement Scale</span>
              </span>
              <span style={{color:retireSev.col,fontWeight:700,fontSize:10}}>{retireSev.lbl}</span>
            </div>
            <div style={{background:"rgba(255,255,255,.12)",borderRadius:99,height:9,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,width:`${Math.max(2,retirePct)}%`,
                background:`linear-gradient(90deg,${C.green},${retireSev.col})`,
                transition:"width 1s cubic-bezier(.34,1.56,.64,1)"}}/>
            </div>
            <div style={{fontSize:11,color:C.t3,marginTop:4}}>{retireDetail}</div>
          </div>
        </div>
        <button onClick={onShare} style={{width:"100%",padding:14,background:"rgba(16,240,122,.08)",
          border:`1px solid ${C.green}44`,borderRadius:14,color:C.green,fontWeight:800,
          cursor:"pointer",fontSize:15,letterSpacing:.5,fontFamily:"inherit"}}>
          📤 Share the Pain
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARE MODAL
══════════════════════════════════════════════════════════════ */
function ShareModal({result,quote,char,settings,onClose}){
  const{nominal,months,yrs,amount,freq,presetObj}=result;
  const freqLbl=FREQS.find(f=>f.id===freq)?.label.toLowerCase()||"";
  const item=presetObj?`${presetObj.e} ${presetObj.label}`:usd2(amount);
  const[copied,setCopied]=useState(false);
  const[urlCopied,setUrlCopied]=useState(false);
  const[imgBusy,setImgBusy]=useState(false);
  const shareText=["💸 Frugal Calculator","",`My ${freqLbl} ${item} = ${usd(nominal)} at retirement.`,
    `That's ${months} months of retirement income GONE! 😱`,"",
    `${char.av} "${quote.substring(0,100)}..."`,""," 📲 frugalcalculator.app",].join("\n");
  const shareUrl=encodeUrl(result,settings);
  const copyText=()=>navigator.clipboard.writeText(shareText).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  const copyUrl=()=>navigator.clipboard.writeText(shareUrl).then(()=>{setUrlCopied(true);setTimeout(()=>setUrlCopied(false),2500);});
  const downloadImage=()=>{
    setImgBusy(true);
    try{const d=generateShareImage({nominal,real:0,months,yrs,amount,freq,presetObj,char,quote,settings});
      Object.assign(document.createElement("a"),{href:d,download:"frugal-shame.png"}).click();
    }catch(e){alert("Couldn't generate image: "+e.message);}
    finally{setImgBusy(false);}
  };
  const shareImage=async()=>{
    setImgBusy(true);
    try{const d=generateShareImage({nominal,real:0,months,yrs,amount,freq,presetObj,char,quote,settings});
      const res=await fetch(d);const blob=await res.blob();
      const file=new File([blob],"frugal-calculator.png",{type:"image/png"});
      if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:"Frugal Calculator"});
      else downloadImage();
    }catch(e){if(e.name!=="AbortError")downloadImage();}
    finally{setImgBusy(false);}
  };
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,
      background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",
      padding:20,zIndex:200,backdropFilter:"blur(14px)"}}>
      <div style={{background:"#0D0A25",border:`1px solid ${C.border}`,borderRadius:24,
        padding:24,width:"100%",maxWidth:360,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{background:`linear-gradient(135deg,#0A0818,${char.col}18)`,
          border:`1px solid ${char.col}44`,borderRadius:16,padding:20,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:11,color:char.col,fontWeight:800,letterSpacing:2,marginBottom:6}}>💸 FRUGAL CALCULATOR</div>
          <div style={{fontSize:12,color:C.t3,marginBottom:8}}>{freqLbl} {item}</div>
          <div style={{...MONO,fontSize:36,fontWeight:700,color:C.green,letterSpacing:-1}}>{usd(nominal)}</div>
          <div style={{fontSize:11,color:C.t3,marginBottom:10}}>at retirement · {yrs} years</div>
          <div style={{padding:"8px 14px",background:"rgba(251,146,60,.12)",border:"1px solid rgba(251,146,60,.3)",
            borderRadius:10,display:"inline-flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>⏳</span>
            <span style={{fontSize:13,color:C.orange,fontWeight:800}}>{months} months stolen</span>
          </div>
          <div style={{marginTop:10,fontSize:10,color:C.t4,fontStyle:"italic"}}>
            {char.av} "{quote.substring(0,80)}..."</div>
        </div>
        <button onClick={copyText} style={{width:"100%",padding:13,marginBottom:8,fontFamily:"inherit",
          background:copied?"rgba(16,240,122,.2)":"rgba(16,240,122,.08)",
          border:`1px solid ${copied?C.green:C.green+"44"}`,borderRadius:14,
          color:C.green,fontWeight:700,cursor:"pointer",fontSize:14,transition:"all .2s"}}>
          {copied?"✅ Copied!":"📋 Copy Share Text"}
        </button>
        <button onClick={shareImage} disabled={imgBusy} style={{width:"100%",padding:13,marginBottom:8,
          fontFamily:"inherit",background:"rgba(167,139,250,.08)",border:`1px solid ${C.purple}44`,
          borderRadius:14,color:C.purple,fontWeight:700,cursor:imgBusy?"wait":"pointer",
          fontSize:14,transition:"all .2s",opacity:imgBusy?0.6:1}}>
          {imgBusy?"⏳ Generating...":"🖼️ Share as Image"}
        </button>
        <div style={{background:"rgba(255,255,255,.03)",border:`1px solid ${C.border}`,borderRadius:14,padding:14,marginBottom:8}}>
          <div style={{fontSize:11,color:C.t3,marginBottom:8,fontWeight:600}}>🔗 Shareable Link</div>
          <div style={{...MONO,fontSize:10,color:C.t4,wordBreak:"break-all",lineHeight:1.6,marginBottom:10,
            padding:"6px 8px",background:"rgba(0,0,0,.2)",borderRadius:8}}>
            {shareUrl.length>80?shareUrl.substring(0,80)+"...":shareUrl}
          </div>
          <button onClick={copyUrl} style={{width:"100%",padding:10,fontFamily:"inherit",
            background:urlCopied?"rgba(34,211,238,.2)":"rgba(34,211,238,.08)",
            border:`1px solid ${urlCopied?C.cyan:C.cyan+"44"}`,borderRadius:10,
            color:C.cyan,fontWeight:700,cursor:"pointer",fontSize:13,transition:"all .2s"}}>
            {urlCopied?"✅ Link Copied!":"📎 Copy Link"}
          </button>
        </div>
        {typeof navigator!=="undefined"&&navigator.share&&(
          <button onClick={()=>navigator.share({title:"Frugal Calculator",text:shareText,url:shareUrl}).catch(()=>{})}
            style={{width:"100%",padding:13,marginBottom:8,background:"rgba(255,255,255,.04)",
              border:`1px solid ${C.border}`,borderRadius:14,color:C.t1,
              fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:"inherit"}}>📤 Share via…</button>
        )}
        <button onClick={onClose} style={{width:"100%",padding:11,background:"none",
          border:`1px solid ${C.border}`,borderRadius:14,color:C.t3,cursor:"pointer",
          fontSize:13,fontFamily:"inherit"}}>Close</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SETTINGS TAB
══════════════════════════════════════════════════════════════ */
function SettingsTab({settings:s,onChange,onExport,onImport,launchCount,onForcePopup,onResetLaunches}){
  const upd=(k,v)=>onChange(p=>({...p,[k]:v}));
  const lifeQuip=
    s.lifeExpectancy<=70?"You okay? That seems low. Maybe talk to someone. 💙"
    :s.lifeExpectancy<=75?"Bold and pessimistic. Planning ahead is still smart."
    :s.lifeExpectancy<=80?"Statistically reasonable. Very middle-of-the-road of you."
    :s.lifeExpectancy<=85?"Optimistic! We like the spirit. Compound interest agrees. 💪"
    :s.lifeExpectancy<=90?"You feel great and it shows. We respect this number."
    :s.lifeExpectancy<=95?"Okay, immortal, calm down. But also: good for you."
    :"100+? At this point you're just flexing. We respect it. 👑";
  return(
    <div style={{paddingTop:10}}>
      <Card>
        <SL c="📊 Your Profile"/>
        <Slider label="Current Age" value={s.currentAge} min={18} max={Math.min(69,s.retirementAge-1)} onChange={v=>upd("currentAge",v)} color={C.cyan}/>
        <Slider label="Retirement Age" value={s.retirementAge} min={s.currentAge+1} max={Math.min(s.lifeExpectancy-1,80)} onChange={v=>upd("retirementAge",v)} color={C.cyan}/>
        <Slider label="⚰️ Planned Checkout Age" value={s.lifeExpectancy} min={s.retirementAge+1} max={100} onChange={v=>upd("lifeExpectancy",v)} color="#94A3B8"/>
        <div style={{fontSize:11,color:C.t3,marginTop:-12,marginBottom:8,lineHeight:1.6,fontStyle:"italic"}}>{lifeQuip}</div>
        <div style={{...MONO,fontSize:11,color:C.t3}}>📅 {s.retirementAge-s.currentAge} yrs until retirement · {s.lifeExpectancy-s.retirementAge} yrs in retirement</div>
      </Card>
      <Card>
        <SL c="💰 Investment Assumptions"/>
        <Slider label="Annual Growth Rate" value={s.growthRate} min={1} max={15} step={0.5} unit="%" onChange={v=>upd("growthRate",v)}/>
        <div style={{fontSize:11,color:C.t3,marginTop:-12,marginBottom:16,lineHeight:1.6}}>S&P 500 historical: ~10% nominal / ~7% real (after inflation)</div>
        <Slider label="Inflation Rate" value={s.inflationRate} min={0} max={8} step={0.5} unit="%" onChange={v=>upd("inflationRate",v)} color={C.orange}/>
        <Slider label="Monthly Retirement Budget" value={s.monthlyExpense} min={500} max={10000} step={100} unit="$" onChange={v=>upd("monthlyExpense",v)} color={C.purple}/>
        <div style={{fontSize:11,color:C.t3,marginTop:-10}}>Also the threshold between Monthly and Retirement pain scales</div>
      </Card>
      <Card>
        <SL c="🎭 Your Financial Advisor"/>
        <Toggle value={s.randomizeAdvisor} onChange={v=>upd("randomizeAdvisor",v)} label="🎲 Randomize advisor each roast (default)"/>
        {!s.randomizeAdvisor&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
            {CHARS.map(c=>(
              <button key={c.id} onClick={()=>upd("characterId",c.id)} style={{padding:"12px 8px",cursor:"pointer",
                textAlign:"center",border:"none",background:s.characterId===c.id?c.bg:"rgba(255,255,255,.03)",
                outline:`2px solid ${s.characterId===c.id?c.col:"transparent"}`,borderRadius:14,color:C.t1,
                fontFamily:"inherit",transition:"all .15s",transform:s.characterId===c.id?"scale(1.02)":"scale(1)"}}>
                <div style={{fontSize:26}}>{c.av}</div>
                <div style={{fontSize:11,fontWeight:700,marginTop:4,color:s.characterId===c.id?c.col:C.t2}}>{c.name}</div>
                <div style={{fontSize:9,color:C.t3,marginTop:3,lineHeight:1.3}}>{c.tag}</div>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card><SL c="🖥️ Display"/><Toggle value={s.showPresets} onChange={v=>upd("showPresets",v)} label="Show quick-tap spending presets"/></Card>
      <Card>
        <SL c="💾 Data"/>
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <button onClick={onExport} style={{flex:1,padding:10,background:"rgba(16,240,122,.06)",border:`1px solid ${C.green}33`,borderRadius:11,color:C.green,fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>📤 Export JSON</button>
          <button onClick={onImport} style={{flex:1,padding:10,background:"rgba(251,146,60,.06)",border:`1px solid ${C.orange}33`,borderRadius:11,color:C.orange,fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>📥 Import JSON</button>
        </div>
        <div style={{fontSize:11,color:C.t3,textAlign:"center"}}>Settings auto-save to this device</div>
      </Card>
      <Card><SL c="📲 Install as App (PWA)"/>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.9}}>
          <b style={{color:C.t1}}>iOS Safari:</b> Tap Share ⎋ → "Add to Home Screen"<br/>
          <b style={{color:C.t1}}>Android Chrome:</b> Tap ⋮ → "Add to Home Screen"<br/>
          <span style={{color:C.t3}}>Fully offline after first load. ✅</span>
        </div>
      </Card>
      <Card><SL c="ℹ️ The Math"/>
        <div style={{...MONO,fontSize:11,color:C.t3,lineHeight:2.2}}>
          <div>One-time:     FV = PV × (1+r)ⁿ</div>
          <div>Recurring:    FV = PMT × ((1+r)ⁿ−1) / r</div>
          <div>Real return:  (1+nominal) / (1+inflation) − 1</div>
          <div>─────────────────────────────────────</div>
          <div>Months stolen = FV ÷ monthly budget</div>
          <div>Retire months = (checkout − retire age) × 12</div>
          <div style={{marginTop:4,color:C.t2}}>Pain meter — two scales:</div>
          <div>· FV &lt; 1 month → % of one paycheck</div>
          <div>· FV ≥ 1 month → months ÷ retire months</div>
        </div>
      </Card>
      <Card accent="#EF4444"><SL c="🐛 Debug"/>
        <div style={{...MONO,fontSize:12,color:C.t2,marginBottom:12}}>Launch count: <span style={{color:C.t1,fontWeight:700}}>{launchCount}</span></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          <button onClick={onForcePopup} style={{padding:"8px 12px",background:"rgba(251,146,60,.1)",border:`1px solid ${C.orange}44`,borderRadius:10,color:C.orange,fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>🔔 Force Popup</button>
          <button onClick={onResetLaunches} style={{padding:"8px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,color:C.t2,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Reset Count</button>
          <button onClick={()=>{if(window.confirm("Clear ALL settings?")){{onChange({...DEF});try{localStorage.removeItem("fc_v1");}catch{}};}}}
            style={{padding:"8px 12px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,color:C.red,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>🗑️ Clear All</button>
        </div>
        <details>
          <summary style={{fontSize:11,color:C.t3,cursor:"pointer",marginBottom:8,userSelect:"none"}}>▶ View settings JSON</summary>
          <pre style={{...MONO,fontSize:10,color:C.t3,background:"rgba(0,0,0,.3)",padding:10,borderRadius:10,overflow:"auto",maxHeight:180,marginTop:8}}>{JSON.stringify(s,null,2)}</pre>
        </details>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CALC TAB
══════════════════════════════════════════════════════════════ */
function CalcTab({dispStr,freq,presetId,showPresets,pendingOp,onPress,onFreq,onPreset,onShowResults,resultPreview,ctaTriggerVersion}){
  const[orderedPresets]=useState(()=>shuffle(PRESETS));

  // Count-up for CTA: animates on version bump (preset tap / result first appears),
  // silently tracks target when just typing digits
  const animNominal = useCountUpVersioned(resultPreview?.nominal || 0, 850, ctaTriggerVersion);

  const BTNS=[
    {l:"AC",t:"AC"},{l:"+/-",t:"fn"},{l:"%",t:"fn"},{l:"÷",t:"op"},
    {l:"7",t:"d"}, {l:"8",t:"d"},   {l:"9",t:"d"},{l:"×",t:"op"},
    {l:"4",t:"d"}, {l:"5",t:"d"},   {l:"6",t:"d"},{l:"−",t:"op"},
    {l:"1",t:"d"}, {l:"2",t:"d"},   {l:"3",t:"d"},{l:"+",t:"op"},
    {l:"0",t:"z"}, {l:".",t:"d"},   {l:"=",t:"eq"},
  ];
  const isActive=l=>pendingOp===(l==="−"?"-":l);
  const bStyle=(t,l)=>{
    const base={border:"none",cursor:"pointer",borderRadius:13,fontWeight:700,fontFamily:"inherit",
      display:"flex",alignItems:"center",justifyContent:l==="0"?"flex-start":"center",
      userSelect:"none",height:56,fontSize:19,transition:"opacity .1s,transform .08s"};
    if(t==="eq") return{...base,background:`linear-gradient(135deg,${C.green},#059669)`,color:"#000",fontSize:22};
    if(t==="z")  return{...base,background:"#1A1830",color:C.t1,gridColumn:"span 2",paddingLeft:24};
    if(t==="op") return{...base,background:isActive(l)?"#5B21B6":"#2D1B4E",color:isActive(l)?C.t1:C.purple};
    if(t==="AC") return{...base,background:"#3D1212",color:"#FC8181"};
    if(t==="fn") return{...base,background:"#1E1B3A",color:C.t2};
    return{...base,background:"#1A1830",color:C.t1};
  };
  const handle=b=>{
    if(b.t==="d"||b.t==="z")onPress("digit",b.l);
    else if(b.t==="op")onPress("op",b.l==="−"?"-":b.l);
    else if(b.t==="eq")onPress("=","=");
    else onPress(b.t,b.l);
  };

  const ctaTag=resultPreview
    ?resultPreview.nominal>=1e6?"💀 Million-dollar mistake detected"
    :resultPreview.nominal>=1e5?"😱 Retirement damage: severe"
    :resultPreview.nominal>=1e4?"🤕 Brace yourself..."
    :"👀 You sure about this?":null;

  const numFontSize=animNominal>=1e7?28:animNominal>=1e6?32:animNominal>=1e5?36:42;

  return(
    <div>
      {showPresets&&(
        <div style={{display:"flex",overflowX:"auto",gap:7,padding:"8px 0",scrollbarWidth:"none"}}>
          {orderedPresets.map(p=>(
            <button key={p.id} onClick={()=>onPreset(p)} style={{flexShrink:0,display:"flex",
              alignItems:"center",gap:4,padding:"5px 10px",cursor:"pointer",whiteSpace:"nowrap",
              fontSize:11,border:"none",background:presetId===p.id?"rgba(16,240,122,.12)":"rgba(255,255,255,.05)",
              outline:`1px solid ${presetId===p.id?C.green+"66":C.border}`,borderRadius:99,
              color:presetId===p.id?C.green:C.t2,fontWeight:presetId===p.id?700:400,fontFamily:"inherit"}}>
              {p.e} {p.label}
            </button>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:5,margin:"8px 0"}}>
        {FREQS.map(f=>(
          <button key={f.id} onClick={()=>onFreq(f.id)} style={{flex:1,padding:"7px 2px",cursor:"pointer",
            fontSize:11,border:"none",background:freq===f.id?"rgba(16,240,122,.1)":"rgba(255,255,255,.04)",
            outline:`1px solid ${freq===f.id?C.green+"55":C.border}`,borderRadius:9,
            color:freq===f.id?C.green:C.t2,fontWeight:freq===f.id?700:400,fontFamily:"inherit"}}>
            {f.short}
          </button>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,
        borderRadius:18,padding:"10px 16px 12px",marginBottom:8}}>
        <div style={{fontSize:10,color:C.t3,marginBottom:2}}>{FREQS.find(f=>f.id===freq)?.label} spend</div>
        <div style={{...MONO,
          fontSize:dispStr.length>18?20:dispStr.length>14?26:dispStr.length>10?32:40,
          fontWeight:400,letterSpacing:-1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",
          whiteSpace:"nowrap",minHeight:48,display:"flex",alignItems:"center",justifyContent:"flex-end",color:C.t1}}>
          {dispStr}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:10}}>
        {BTNS.map((b,i)=>(
          <button key={i} style={bStyle(b.t,b.l)} onClick={()=>handle(b)}
            onPointerDown={e=>{e.currentTarget.style.opacity=".5";e.currentTarget.style.transform="scale(.91)";}}
            onPointerUp={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="scale(1)";}}
            onPointerLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="scale(1)";}}>
            {b.l}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          CTA BUTTON — PULSE RINGS design
          · 3 concentric rings emanate outward (sonar effect)
          · Spinning conic-gradient creates a rotating border
          · Number counts up via useCountUpVersioned
          · Horizontal › › › chevrons on the right
      ════════════════════════════════════════════════════════ */}
      <div
        onClick={resultPreview ? onShowResults : undefined}
        onPointerDown={e=>{if(resultPreview)e.currentTarget.style.transform="scale(.98)";}}
        onPointerUp={e=>e.currentTarget.style.transform="scale(1)"}
        onPointerLeave={e=>e.currentTarget.style.transform="scale(1)"}
        style={{
          position:"relative",
          cursor:resultPreview?"pointer":"default",
          transition:"transform .1s",
          /* Let rings overflow freely — no overflow:hidden here */
        }}
      >
        {/* Expanding sonar rings — only show when there's a result */}
        {resultPreview && [0,1,2].map(i=>(
          <div key={i} style={{
            position:"absolute", inset:0, borderRadius:18,
            border:`1px solid rgba(16,240,122,${0.55 - i*0.15})`,
            animation:`ringExpand 2.6s ease-out ${i*.87}s infinite`,
            pointerEvents:"none", zIndex:0,
          }}/>
        ))}

        {/* Border wrapper — overflow:hidden clips the spinning disc to a 2 px border strip */}
        <div style={{
          position:"relative", zIndex:1,
          borderRadius:18, padding:resultPreview?2:1.5,
          overflow:"hidden",
          background:resultPreview?"transparent":C.border,
        }}>
          {/* Spinning disc — ONLY this element rotates; content above is unaffected */}
          {resultPreview&&(
            <div style={{
              position:"absolute", top:"50%", left:"50%",
              width:"300%", height:"300%",
              marginLeft:"-150%", marginTop:"-150%",
              background:"conic-gradient(#10F07A 0deg,#A78BFA 110deg,rgba(9,12,24,0) 165deg,rgba(9,12,24,0) 285deg,#10F07A 360deg)",
              animation:"borderSpin 3s linear infinite",
              pointerEvents:"none",
            }}/>
          )}
          {/* Inner card — z-index:1 keeps it above the disc; it never rotates */}
          <div style={{
            position:"relative", zIndex:1, borderRadius:16,
            background:resultPreview?"linear-gradient(140deg,#090E1C,#0D1428)":"rgba(255,255,255,.03)",
            padding:resultPreview?"17px 16px":"13px 16px",
            animation:resultPreview?"v1glow 2.5s ease-in-out infinite":"none",
          }}>
            {resultPreview ? (
              <div style={{display:"flex",alignItems:"center"}}>
                {/* Left spacer mirrors chevron width for perfect centering */}
                <div style={{width:72,flexShrink:0}}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:12,color:C.t2,fontWeight:600}}>{ctaTag}</span>
                  <span style={{
                    ...MONO, fontSize:numFontSize,
                    fontWeight:700, color:C.green,
                    letterSpacing:-2, lineHeight:1.1,
                    animation:"numberGlow 2.5s ease-in-out infinite",
                  }}>
                    {usd(animNominal)}
                  </span>
                  <span style={{fontSize:11,color:C.t2,fontWeight:500}}>
                    in {resultPreview.yrs} yrs · tap to witness the carnage
                  </span>
                </div>
                {/* Horizontal side-by-side chevrons */}
                <Chevrons color={C.green}/>
              </div>
            ) : (
              <div style={{textAlign:"center"}}>
                <span style={{fontSize:13,color:C.t3}}>Enter an amount to calculate impact</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED SCENARIO BANNER
══════════════════════════════════════════════════════════════ */
function SharedBanner({onDismiss}){
  return(
    <div style={{margin:"8px 0",padding:"10px 14px",background:"rgba(34,211,238,.08)",
      border:`1px solid ${C.cyan}44`,borderRadius:14,display:"flex",
      alignItems:"center",justifyContent:"space-between",gap:8}}>
      <span style={{fontSize:12,color:C.cyan}}>🔗 Viewing a shared scenario — settings pre-loaded from link</span>
      <button onClick={onDismiss} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:16,lineHeight:1,fontFamily:"inherit"}}>×</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════ */
export default function App(){
  const[settings,setSettings]=useState(()=>{
    try{const s=localStorage.getItem("fc_v1");return s?{...DEF,...JSON.parse(s)}:DEF;}
    catch{return DEF;}
  });
  useEffect(()=>{try{localStorage.setItem("fc_v1",JSON.stringify(settings));}catch{}},[settings]);

  const[tab,        setTab]         =useState("calc");
  const[display,    setDisplay]     =useState("0");
  const[stored,     setStored]      =useState(null);
  const[pendingOp,  setPendingOp]   =useState(null);
  const[fresh,      setFresh]       =useState(false);
  const[freq,       setFreq]        =useState("once");
  const[presetId,   setPresetId]    =useState(null);
  const[result,     setResult]      =useState(null);
  const[quote,      setQuote]       =useState("");
  const[activeChar, setActiveChar]  =useState(CHARS[0]);
  const[showResults,setShowResults] =useState(false);
  const[showShare,  setShowShare]   =useState(false);
  const[showPC,     setShowPC]      =useState(false);
  const[launchCount,setLaunchCount] =useState(0);
  const[isShared,   setIsShared]    =useState(false);
  // Version counter that triggers count-up animation in CTA
  const[ctaTriggerVersion,setCtaTriggerVersion]=useState(0);
  const hadResultRef=useRef(false);

  // Boot: PWA + launch count + URL decode
  useEffect(()=>{
    injectPWA();
    try{
      const cnt=parseInt(localStorage.getItem("fc_launches")||"0")+1;
      localStorage.setItem("fc_launches",String(cnt));
      setLaunchCount(cnt);
      const shared=decodeUrl();
      if(shared){
        setDisplay(String(shared.amount));setFreq(shared.freq);
        if(Object.keys(shared.settings).length)setSettings(prev=>({...prev,...shared.settings}));
        setIsShared(true);
        setTimeout(()=>setShowResults(true),900);
        window.history.replaceState({},"",window.location.pathname);
      }else if(cnt===1||cnt%10===0){
        setTimeout(()=>setShowPC(true),900);
      }
    }catch{}
  },[]);

  // Auto-calc FV
  useEffect(()=>{
    const amount=parseFloat(display);
    if(!amount||amount<=0){setResult(null);return;}
    const{nominal,real,yrs}=calcFV({amount,freq,...settings});
    if(nominal<=0){setResult(null);return;}
    const months=Math.max(0,Math.round(nominal/settings.monthlyExpense));
    const presetObj=PRESETS.find(p=>p.id===presetId)||null;
    setResult({amount,freq,nominal,real,months,yrs,presetObj});
  },[display,freq,presetId,settings]);

  // Trigger CTA count-up when a result first appears (was null, now has value)
  useEffect(()=>{
    const hasResult=!!(result?.nominal>0);
    if(hasResult&&!hadResultRef.current){
      setCtaTriggerVersion(v=>v+1);
    }
    hadResultRef.current=hasResult;
  },[result?.nominal]);

  const reRoast=useCallback(()=>{
    if(!result)return;
    const ch=settings.randomizeAdvisor
      ?CHARS[~~(Math.random()*CHARS.length)]
      :(CHARS.find(c=>c.id===settings.characterId)||CHARS[0]);
    setActiveChar(ch);
    setQuote(ch.q({amount:result.amount,fv:result.nominal,months:result.months,
      label:result.presetObj?.label,freq:result.freq}));
  },[result,settings]);
  useEffect(()=>{if(result?.nominal>0)reRoast();},[result?.nominal,settings.characterId,settings.randomizeAdvisor]);// eslint-disable-line

  const press=useCallback((type,val)=>{
    switch(type){
      case"AC":setDisplay("0");setStored(null);setPendingOp(null);setFresh(false);break;
      case"+/-":setDisplay(d=>d==="0"?"0":d.startsWith("-")?d.slice(1):"-"+d);break;
      case"%":setDisplay(d=>{const v=parseFloat(d)/100;return isNaN(v)?"0":String(parseFloat(v.toFixed(10)));});break;
      case"digit":
        if(fresh){setDisplay(val==="0"?"0":val);setFresh(false);}
        else setDisplay(d=>d==="0"?val:d==="-0"?"-"+val:d.length<12?d+val:d);break;
      case".":
        if(fresh){setDisplay("0.");setFresh(false);}
        else setDisplay(d=>d.includes(".")?d:d+".");break;
      case"op":{
        const curr=parseFloat(display);
        if(stored!==null&&!fresh){
          const res=doCalc(stored,curr,pendingOp);
          const str=String(parseFloat(res.toFixed(10)));
          setDisplay(str==="-0"?"0":str);setStored(parseFloat(str));
        }else setStored(curr);
        setPendingOp(val);setFresh(true);break;
      }
      case"=":{
        if(pendingOp===null||stored===null)break;
        const res=doCalc(stored,parseFloat(display),pendingOp);
        const str=String(parseFloat(res.toFixed(10)));
        setDisplay(str==="-0"?"0":str);setStored(null);setPendingOp(null);setFresh(true);break;
      }
    }
  },[display,stored,pendingOp,fresh]);

  const pressRef=useRef(press),freshRef=useRef(fresh);
  useEffect(()=>{pressRef.current=press;},[press]);
  useEffect(()=>{freshRef.current=fresh;},[fresh]);
  useEffect(()=>{
    const h=e=>{
      if(e.target.tagName==="INPUT")return;
      if("0123456789".includes(e.key))pressRef.current("digit",e.key);
      else if(e.key===".")pressRef.current("digit",".");
      else if(e.key==="+")pressRef.current("op","+");
      else if(e.key==="-")pressRef.current("op","-");
      else if(e.key==="*")pressRef.current("op","×");
      else if(e.key==="/"){e.preventDefault();pressRef.current("op","÷");}
      else if(e.key==="Enter"||e.key==="=")pressRef.current("=","=");
      else if(e.key==="Backspace")setDisplay(d=>d.length>1&&!freshRef.current?d.slice(0,-1):"0");
      else if(e.key==="Escape")pressRef.current("AC","AC");
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[]);

  const exportSettings=()=>{
    const b=new Blob([JSON.stringify(settings,null,2)],{type:"application/json"});
    Object.assign(document.createElement("a"),{href:URL.createObjectURL(b),download:"frugal-settings.json"}).click();
  };
  const importSettings=()=>{
    const inp=Object.assign(document.createElement("input"),{type:"file",accept:".json"});
    inp.onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=ev=>{try{setSettings(p=>({...p,...JSON.parse(ev.target.result)}));}catch{alert("Invalid file");}};
      r.readAsText(f);
    };inp.click();
  };

  const selectPreset=p=>{
    const same=p.id===presetId;setPresetId(same?null:p.id);
    if(!same){
      setDisplay(String(p.amount));setFreq(p.freq);
      setStored(null);setPendingOp(null);setFresh(false);
      // Trigger the count-up animation in the CTA
      setCtaTriggerVersion(v=>v+1);
    }
  };

  return(
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        body{background:${C.bg};overflow-x:hidden}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;
          border-radius:50%;cursor:pointer;background:currentColor;box-shadow:0 1px 6px rgba(0,0,0,.5)}
        ::-webkit-scrollbar{display:none}
        button{font-family:inherit}
        details>summary{list-style:none}
        details>summary::-webkit-details-marker{display:none}

        /* ── Results panel ────────────────────── */
        @keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}

        /* ── Pulse Ring CTA ───────────────────── */
        @keyframes ringExpand{
          0%  {transform:scale(1);   opacity:.65}
          100%{transform:scale(1.7); opacity:0}
        }
        @keyframes borderSpin{
          from{transform:rotate(0deg)}
          to  {transform:rotate(360deg)}
        }
        @keyframes v1glow{
          0%,100%{box-shadow:0 0 0 rgba(16,240,122,0)}
          50%    {box-shadow:0 0 28px rgba(16,240,122,.25),
                             0 0 56px rgba(16,240,122,.1)}
        }
        @keyframes numberGlow{
          0%,100%{text-shadow:0 0 16px rgba(16,240,122,.4)}
          50%    {text-shadow:0 0 32px rgba(16,240,122,.95),
                               0 0 64px rgba(16,240,122,.4)}
        }

        /* ── Horizontal chevrons ──────────────── */
        @keyframes chevSlide{
          0%,100%{transform:translateX(-4px);opacity:.15}
          50%    {transform:translateX(7px); opacity:1}
        }
      `}</style>

      <div style={{minHeight:"100vh",maxWidth:430,margin:"0 auto",
        background:`linear-gradient(160deg,${C.bg} 0%,#0F0822 100%)`,
        color:C.t1,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        display:"flex",flexDirection:"column"}}>

        <div style={{padding:"14px 16px 6px",flexShrink:0}}>
          <div style={{fontSize:19,fontWeight:900,letterSpacing:-.5}}>💸 Frugal Calculator</div>
          <div style={{fontSize:10,color:C.t3,marginTop:1}}>Your future self is watching. And crying.</div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"2px 14px 80px"}}>
          {isShared&&<SharedBanner onDismiss={()=>setIsShared(false)}/>}
          {tab==="calc"
            ?<CalcTab
                dispStr={fmtDisp(display)} freq={freq} presetId={presetId}
                showPresets={settings.showPresets} pendingOp={pendingOp}
                onPress={press} onFreq={setFreq} onPreset={selectPreset}
                onShowResults={()=>{if(result?.nominal>0){reRoast();setShowResults(true);}}}
                resultPreview={result}
                ctaTriggerVersion={ctaTriggerVersion}/>
            :<SettingsTab settings={settings} onChange={setSettings}
                onExport={exportSettings} onImport={importSettings}
                launchCount={launchCount}
                onForcePopup={()=>setShowPC(true)}
                onResetLaunches={()=>{try{localStorage.setItem("fc_launches","0");setLaunchCount(0);}catch{}}}/>
          }
        </div>

        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:430,zIndex:100,background:"rgba(7,7,26,.97)",
          backdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,
          display:"flex",paddingBottom:"max(env(safe-area-inset-bottom,0px),8px)"}}>
          {[{id:"calc",icon:"🧮",label:"Calculator"},{id:"settings",icon:"⚙️",label:"Settings"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",
              cursor:"pointer",color:tab===t.id?C.green:C.t3,
              padding:"10px 0 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:22}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:tab===t.id?700:400}}>{t.label}</span>
            </button>
          ))}
        </div>

        {result&&<ResultsPanel visible={showResults} onClose={()=>setShowResults(false)}
          result={result} quote={quote} char={activeChar} settings={settings}
          onShare={()=>setShowShare(true)} onReRoast={reRoast}/>}

        {showShare&&result&&<ShareModal result={result} quote={quote} char={activeChar}
          settings={settings} onClose={()=>setShowShare(false)}/>}

        {showPC&&<ParamCheckPopup settings={settings} launchCount={launchCount}
          onConfirm={()=>setShowPC(false)}
          onSettings={()=>{setShowPC(false);setTab("settings");}}/>}
      </div>
    </>
  );
}
