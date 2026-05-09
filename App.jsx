import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════ UTILS ══════════════════════════════════════ */
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
const usd=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const usd2=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n||0);
const short=n=>{
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
  if(fv>=5e6)return"a yacht AND waterfront property";
  if(fv>=2e6)return"two vacation homes";
  if(fv>=1e6)return"a vacation home outright";
  if(fv>=500000)return"a full house down payment";
  if(fv>=200000)return"a brand-new Tesla Model S";
  if(fv>=100000)return"one year of private school tuition";
  if(fv>=50000)return"a fully-loaded SUV";
  if(fv>=20000)return"a dream trip to Japan, first class";
  if(fv>=10000)return"a full kitchen renovation";
  if(fv>=5000)return"a business-class flight to Europe";
  if(fv>=2000)return"3 months of car payments";
  if(fv>=500)return"a month of groceries";
  return"a nice dinner every week";
}
function getPain(pct){
  if(pct<1) return{col:"#22D469",lbl:"A rounding error 🪶",emoji:"🟢"};
  if(pct<3) return{col:"#4ADE80",lbl:"Barely a scratch... for now 😏"};
  if(pct<6) return{col:"#A3E635",lbl:"Oh it tingles 👀"};
  if(pct<10)return{col:"#EAB308",lbl:"Oof. There goes a vacation ✈️❌"};
  if(pct<15)return{col:"#F59E0B",lbl:"That was a new laptop 💻🔥"};
  if(pct<22)return{col:"#F97316",lbl:"A whole car. Just... gone 🚗💨"};
  if(pct<32)return{col:"#EF4444",lbl:"Half a year of rent. POOF 🔥"};
  if(pct<45)return{col:"#DC2626",lbl:"Retiring 2 years later. Enjoy 🕰️"};
  if(pct<60)return{col:"#B91C1C",lbl:"Working till 78, bestie 👴⚰️"};
  if(pct<80)return{col:"#991B1B",lbl:"🚨 FINANCIAL CRIMES DETECTED"};
  return      {col:"#7F1D1D",lbl:"☢️ TOTAL RETIREMENT ANNIHILATION"};
}

/* ═══════════════════════════════ DATA ═══════════════════════════════════════ */
const CHARS=[
  {id:"grumpy",name:"Future You",av:"👴",tag:"Back in MY day, we SAVED.",col:"#FF6B35",bg:"rgba(255,107,53,.13)",
   q({amount,fv,months,label,freq}){
    const i=label||"that",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    const fs=freq==="daily"?"every day":freq==="weekly"?"every week":freq==="monthly"?"every month":freq==="annually"?"every year":"that one time";
    return[
      `*shuffles in* ${a} on ${i.toUpperCase()}, ${fs}?! That's ${f} from MY retirement. Give. It. Back. RIGHT NOW.`,
      `${f}. That's what this becomes. I could've had ${cant}. But you chose ${i}. I am writing you out of the will.`,
      `${months} months. You stole ${months} months of retirement for ${i}. I hobbled here from the future just to tell you that.`,
      `I eat store-brand crackers with no cheese because ${a}, ${fs}, compounded = ${f}. That was ${cant}. MY FUTURE. GONE.`,
      `*slams walker* ${f.toUpperCase()}!! That's ${cant.toUpperCase()}!! But sure! Enjoy the ${i}! I'll be at WALMART GREETING PEOPLE!`,
      `I called to yell. Got your voicemail. So I'm HERE, IN PERSON. ${a} = ${f} = no ${cant}. ARE YOU HAPPY NOW.`,
      `Every time you buy ${i} ${fs}, a little piece of my ${cant} dies. Today was a particularly large piece. ${f} worth.`,
      `This is fine. Everything is fine. *eye twitch* ${f} is just gone. The ${cant} wasn't that important anyway. *eye twitch*`,
    ][~~(Math.random()*8)];
   }},
  {id:"bro",name:"Finance Bro Kevin",av:"🧢",tag:"Have you heard of index funds?",col:"#4ECDC4",bg:"rgba(78,205,196,.13)",
   q({amount,fv,months,label,freq}){
    const i=label||"that",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    const fs=freq==="daily"?"daily":freq==="weekly"?"weekly":freq==="monthly"?"monthly":"";
    return[
      `Wow. Not everyone needs ${cant}. Really inspirational that you chose ${a} on ${i} ${fs} over ${f}. Truly. 👏`,
      `Bold — sacrificing ${f} for ${a} ${fs} on ${i}. Buffett would never, but your risk tolerance is... unique. 😊`,
      `I have a 34-slide deck: why ${a} ${fs} compounds to ${f}. Slide 1: Stop buying ${i}. Slide 34: I told you so.`,
      `Just to clarify: you traded ${cant} (valued at ${f}) for ${i}. I'm not upset. I'm just 📊 deeply, professionally concerned.`,
      `${f} opportunity cost. The nursing home looked nice though. Communal TV. Shuffleboard Tuesdays. Could be worse. 🙂`,
      `Fun fact: ${a} invested ${fs} becomes ${f}. That's ${cant}. You spent it on ${i} instead. Not fun. That was not the fun fact.`,
      `Sir/ma'am, I'm going to need you to look at this compound interest chart. *points at ${f}* This was YOU. It's gone.`,
      `New financial literacy lesson: ${a} × compound interest = ${cant} you won't have. Class dismissed. No extra credit. 📈`,
    ][~~(Math.random()*8)];
   }},
  {id:"grandma",name:"Disappointed Grandma",av:"👵",tag:"Not mad. Just... disappointed.",col:"#C77DFF",bg:"rgba(199,125,255,.13)",
   q({amount,fv,months,label,freq}){
    const i=label||"this",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    const fs=freq==="daily"?"every morning":freq==="weekly"?"every week":freq==="monthly"?"every month":"";
    return[
      `Oh sweetie... *heavy sigh* ...Grandpa skipped lunch for 12 years so you could have ${cant}. But enjoy ${i}, dear.`,
      `I'm not mad. *knits 40% faster* I'm just thinking about those ${months} retirement months you gave away. Quietly. In the dark.`,
      `We reused rubber bands. Saved tin foil. Never wasted a crumb. And here you are, ${a} on ${i} ${fs} like it's nothing.`,
      `That ${f} was going to be your golden years. ${cant.charAt(0).toUpperCase()+cant.slice(1)}. A little joy. But here we are. *dabs eye*`,
      `*looks at ${i}* *looks at ${f}* *looks at ${i}* *looks at ${f}* *very long, very quiet sigh* ...Have you called your mother?`,
      `Grandpa ate sandwiches for 20 years to build savings. You have ${a} ${fs} for ${i}. The irony is not lost on this old lady.`,
      `I raised you better. I raised you to know ${a} ${fs} is ${f} is ${cant}. And yet. AND YET. Here we are. With ${i}.`,
      `Don't tell me how much you spent. *you tell her* ...Oh. *sets down knitting* Oh. *picks knitting back up, knits FURIOUSLY*`,
    ][~~(Math.random()*8)];
   }},
  {id:"bard",name:"Bard of Broke",av:"🎭",tag:"To spend, or not to spend...",col:"#FCD34D",bg:"rgba(252,211,77,.1)",
   q({amount,fv,months,label,freq}){
    const i=label||"this trinket",a=usd2(amount),f=short(fv),cant=cannotAfford(fv);
    return[
      `O WRETCHED MORTAL! For ${a} in silver thou hast condemned thyself to ${months} forsaken moons of poverty! THE COMPOUND GODS WEEP!`,
      `Hark! What fool — to trade ${cant} (worth ${f}!) for today's fleeting ${i}?! The great ledger records this in RED INK, eternally!`,
      `All the world's a stage, thou hast chosen: "Person Who Cannot Afford ${cant.charAt(0).toUpperCase()+cant.slice(1)}." Curtain falls. ${f} — exit.`,
      `Act I: ${a} spent on ${i}. Act II: ${f} disappears. Act III: No ${cant}. Act IV: Working at 78. *mournful lute plays softly*`,
      `'Twas only ${a}! cried the mortal! Yet ${f} heard the cry and wept, for it shall never be! TO BE FRUGAL, OR NOT — THOU CHOSE NOT!`,
      `Methinks ${f} doth vanish like morning dew upon the cold stones of thy ${i}-filled, ${cant}-less future. ALAS AND ALACK!`,
      `Thus the cosmic accountant tallies: ${a} × time × compound interest = ${f} = ${cant} = GONE. *slams abacus dramatically*`,
      `Prithee, reconsider! For ${f} is not just coin — 'tis ${cant}! 'Tis ${months} moons of peaceful rest! 'Tis EVERYTHING! *collapses*`,
    ][~~(Math.random()*8)];
   }},
];

const PRESETS=[
  {id:"latte",  e:"☕",label:"Daily Latte",   amount:6,    freq:"daily"  },
  {id:"netflix",e:"📺",label:"Netflix",        amount:15.99,freq:"monthly"},
  {id:"airpods",e:"🎧",label:"AirPods Pro",    amount:249,  freq:"once"  },
  {id:"brunch", e:"🥑",label:"Brunch",         amount:45,   freq:"weekly" },
  {id:"pizza",  e:"🍕",label:"Pizza Night",    amount:30,   freq:"weekly" },
  {id:"sneakers",e:"👟",label:"Sneakers",      amount:150,  freq:"once"  },
  {id:"bar",    e:"🍺",label:"Bar Night",      amount:80,   freq:"weekly" },
  {id:"trip",   e:"✈️",label:"Weekend Trip",   amount:500,  freq:"once"  },
  {id:"iphone", e:"📱",label:"New iPhone",     amount:1099, freq:"once"  },
  {id:"car",    e:"🚗",label:"Car Payment",    amount:450,  freq:"monthly"},
  {id:"gym",    e:"💪",label:"Gym",            amount:50,   freq:"monthly"},
  {id:"eats",   e:"🛵",label:"Uber Eats/wk",  amount:35,   freq:"weekly" },
];
const FREQS=[
  {id:"once",    short:"1×",    label:"One-time"},
  {id:"daily",   short:"Daily", label:"Daily"   },
  {id:"weekly",  short:"Weekly",label:"Weekly"  },
  {id:"monthly", short:"Mo.",   label:"Monthly" },
  {id:"annually",short:"Yr.",   label:"Yearly"  },
];
const DEF={currentAge:28,retirementAge:65,growthRate:7,inflationRate:3,monthlyExpense:3000,
           characterId:"grumpy",showPresets:true,randomizeAdvisor:true};

/* ═══════════════════════════════ PWA ICON ═══════════════════════════════════ */
function injectPWA(){
  try{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1E0A3C"/><stop offset="100%" stop-color="#07071A"/>
      </linearGradient></defs>
      <rect width="192" height="192" rx="42" fill="url(#g)"/>
      <text x="96" y="116" dominant-baseline="auto" text-anchor="middle"
        font-family="-apple-system,Helvetica,sans-serif" font-size="98" font-weight="900" fill="#10F07A">$</text>
      <line x1="38" y1="84" x2="154" y2="84" stroke="#FB923C" stroke-width="11" stroke-linecap="round"/>
      <text x="96" y="170" text-anchor="middle" dominant-baseline="auto"
        font-family="-apple-system,Helvetica,sans-serif" font-size="12" font-weight="700"
        fill="#10F07A" letter-spacing="3" opacity="0.55">FRUGAL</text>
    </svg>`;
    const uri=`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    const tl=document.createElement("link");tl.rel="apple-touch-icon";tl.href=uri;
    const fl=document.createElement("link");fl.rel="icon";fl.type="image/svg+xml";fl.href=uri;
    document.head.appendChild(tl);document.head.appendChild(fl);
    const mblob=new Blob([JSON.stringify({name:"Frugal Calculator",short_name:"Frugal",
      description:"Your future self is watching. And crying.",start_url:".",display:"standalone",
      background_color:"#07071A",theme_color:"#07071A",
      icons:[{src:uri,sizes:"192x192",type:"image/svg+xml"}]})],{type:"application/json"});
    const ml=document.createElement("link");ml.rel="manifest";ml.href=URL.createObjectURL(mblob);
    document.head.appendChild(ml);
  }catch{}
}

/* ═══════════════════════════════ SHARED UI ══════════════════════════════════ */
const MONO={fontFamily:"'SF Mono','Fira Code',Consolas,monospace"};
const C={green:"#10F07A",purple:"#A78BFA",orange:"#FB923C",red:"#F87171",
         gold:"#FCD34D",cyan:"#22D3EE",bg:"#07071A",surface:"rgba(255,255,255,.04)",
         border:"rgba(255,255,255,.08)",t1:"#F1F5F9",t2:"#94A3B8",t3:"#475569",t4:"#334155"};

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
              style={{width:88,padding:"3px 8px",background:"#1A1535",border:`1px solid ${color}`,borderRadius:8,color:C.t1,fontSize:13,...MONO,textAlign:"right",outline:"none"}}
              onBlur={e=>commit(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditing(false);}}/>
          :<span onClick={()=>setEditing(true)} style={{...MONO,color:C.t1,fontWeight:700,fontSize:13,cursor:"pointer",padding:"3px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface}}>
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
const SL=({children})=>(
  <div style={{fontSize:10,fontWeight:800,color:C.t3,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>
    {children}
  </div>
);
function Toggle({value,onChange,label}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <span style={{color:C.t2,fontSize:13}}>{label}</span>
      <button onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",position:"relative",background:value?C.green:"rgba(255,255,255,.12)",transition:"background .2s",flexShrink:0}}>
        <div style={{position:"absolute",top:2,left:value?22:2,width:20,height:20,borderRadius:10,background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}/>
      </button>
    </div>
  );
}

/* ═══════════════════════════════ PARAM CHECK ════════════════════════════════ */
const PARAM_MSGS=[
  (lc,s)=>({
    title:"⚠️ Your Future Self Filed a Complaint",
    body:lc===1?`First visit! Before we calculate your financial regret, are these numbers actually you?`:`Launch #${lc}. Your future self requires a settings audit every 10 uses. Compliance is not optional.`
  }),
  ()=>({title:"📋 Mandatory Regret Audit",body:`Your future self rang. Couldn't hear much over the crying, but "CHECK YOUR SETTINGS" came through loud and clear.`}),
  ()=>({title:"👴 Certified Letter from Future You",body:`"ARE THOSE SETTINGS STILL CORRECT?? I'm eating crackers at 74. Please. Just. Verify. The. Settings."`}),
  (lc)=>({title:"🔔 Biennial Financial Wellness Check",body:`${lc} launches in and we STILL haven't confirmed you're not pretending to be 28 forever. Are you?`}),
];

function ParamCheckPopup({settings,launchCount,onConfirm,onSettings}){
  const m=PARAM_MSGS[Math.min(~~((launchCount-1)/10),PARAM_MSGS.length-1)](launchCount,settings);
  const rows=[
    {l:"Your age",v:`${settings.currentAge}`},
    {l:"Retirement age",v:`${settings.retirementAge}`},
    {l:"Growth rate",v:`${settings.growthRate}%`},
    {l:"Inflation",v:`${settings.inflationRate}%`},
    {l:"Monthly budget",v:usd(settings.monthlyExpense)},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(10px)",padding:"0 16px 16px",paddingBottom:"max(16px,env(safe-area-inset-bottom))"}}>
      <div style={{background:"#120F30",border:`1px solid ${C.purple}44`,borderRadius:24,padding:22,width:"100%",maxWidth:400,animation:"slideUp .35s cubic-bezier(.34,1.56,.64,1)"}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:8,color:C.t1}}>{m.title}</div>
        <div style={{fontSize:13,color:C.t3,lineHeight:1.65,marginBottom:16}}>{m.body}</div>
        <div style={{background:"rgba(255,255,255,.04)",borderRadius:14,padding:14,marginBottom:18}}>
          {rows.map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<rows.length-1?`1px solid rgba(255,255,255,.05)`:"none"}}>
              <span style={{color:C.t3,fontSize:12}}>{r.l}</span>
              <span style={{...MONO,color:C.t2,fontSize:12,fontWeight:700}}>{r.v}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onSettings} style={{flex:1,padding:12,background:"rgba(255,255,255,.06)",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>⚙️ Fix it</button>
          <button onClick={onConfirm} style={{flex:2,padding:12,background:C.green,border:"none",borderRadius:12,color:"#000",fontWeight:900,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>✅ Looks right!</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ RESULTS PANEL ══════════════════════════════ */
function ResultsPanel({visible,onClose,result,quote,char,settings,onShare,onReRoast}){
  if(!result||result.nominal<=0)return null;
  const{nominal,real,months,yrs,amount,presetObj}=result;
  const multi=amount>0?Math.round(nominal/amount):0;
  const painPct=Math.min(100,(months/((settings.retirementAge-settings.currentAge)*12))*100);
  const{col:painCol,lbl:painLbl}=getPain(painPct);
  const cant=cannotAfford(nominal);

  return(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,
      background:`linear-gradient(160deg,${C.bg} 0%,#100A2A 100%)`,
      transform:`translateX(${visible?"0":"100%"})`,
      transition:"transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)",
      zIndex:150,overflowY:"auto",overflowX:"hidden",maxWidth:430,margin:"0 auto"}}>

      {/* Sticky header */}
      <div style={{position:"sticky",top:0,background:"rgba(7,7,26,.96)",backdropFilter:"blur(20px)",
        padding:"14px 16px",borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",gap:12,zIndex:1}}>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:10,
          width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",color:C.t2,fontSize:18,flexShrink:0,fontFamily:"inherit"}}>←</button>
        <div>
          <div style={{fontSize:13,fontWeight:800,color:C.t1}}>Retirement Impact</div>
          <div style={{fontSize:10,color:C.t4}}>Your future self is not doing okay</div>
        </div>
      </div>

      <div style={{padding:"0 16px 100px"}}>
        {/* Quote bubble */}
        <div style={{margin:"14px 0",background:char.bg,border:`1px solid ${char.col}44`,borderRadius:20,padding:16}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
            <span style={{fontSize:34,flexShrink:0,lineHeight:1}}>{char.av}</span>
            <div>
              <div style={{fontSize:9,color:char.col,fontWeight:800,letterSpacing:1.5,marginBottom:4}}>{char.name.toUpperCase()}</div>
              <div style={{fontSize:13,color:"#E2E8F0",lineHeight:1.6,fontStyle:"italic"}}>"{quote}"</div>
            </div>
          </div>
          <button onClick={onReRoast} style={{padding:"5px 12px",fontSize:11,background:"rgba(255,255,255,.06)",
            border:"none",borderRadius:10,color:C.t3,cursor:"pointer",fontFamily:"inherit"}}>
            🎲 Roast me again
          </button>
        </div>

        {/* Big FV number */}
        <div style={{textAlign:"center",padding:"18px 0 14px"}}>
          <div style={{fontSize:11,color:C.t4,marginBottom:5}}>Future value in {yrs} yrs · {settings.growthRate}% return</div>
          <div style={{...MONO,fontSize:nominal>9999999?30:nominal>999999?36:46,fontWeight:700,
            color:C.green,letterSpacing:-2,lineHeight:1}}>{usd(nominal)}</div>
          <div style={{fontSize:11,color:C.t4,marginTop:5}}>Today's dollars: {usd(real)}</div>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div style={{background:"rgba(251,146,60,.08)",border:"1px solid rgba(251,146,60,.2)",borderRadius:14,padding:12,textAlign:"center"}}>
            <div style={{fontSize:20}}>⏳</div>
            <div style={{...MONO,fontSize:26,fontWeight:700,color:C.orange,lineHeight:1.1}}>{months}</div>
            <div style={{fontSize:10,color:C.orange,fontWeight:700}}>MONTHS STOLEN</div>
            <div style={{fontSize:9,color:C.t3}}>from retirement</div>
          </div>
          <div style={{background:"rgba(16,240,122,.07)",border:"1px solid rgba(16,240,122,.2)",borderRadius:14,padding:12,textAlign:"center"}}>
            <div style={{fontSize:20}}>🚀</div>
            <div style={{...MONO,fontSize:26,fontWeight:700,color:C.green,lineHeight:1.1}}>{multi}×</div>
            <div style={{fontSize:10,color:C.green,fontWeight:700}}>GROWTH</div>
            <div style={{fontSize:9,color:C.t3}}>if invested now</div>
          </div>
        </div>

        {/* What you could've had */}
        <div style={{background:"rgba(252,211,77,.06)",border:"1px solid rgba(252,211,77,.15)",borderRadius:16,padding:14,marginBottom:12}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:5}}>💎 WHAT YOU COULD'VE HAD</div>
          <div style={{fontSize:15,color:"#FEF3C7",fontWeight:700}}>👉 {cant.charAt(0).toUpperCase()+cant.slice(1)}</div>
          <div style={{fontSize:10,color:"#78350F",marginTop:3}}>worth {usd(nominal)} at retirement</div>
        </div>

        {/* Pain meter */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:7}}>
            <span style={{color:C.t3}}>💀 Retirement Pain Meter</span>
            <span style={{color:painCol,fontWeight:700,fontSize:10}}>{painLbl}</span>
          </div>
          <div style={{background:"#0D0D1E",borderRadius:99,height:10,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:`${Math.max(2,painPct)}%`,
              background:`linear-gradient(90deg,${C.green},${painCol})`,
              transition:"width 1s cubic-bezier(.34,1.56,.64,1)"}}/>
          </div>
          <div style={{fontSize:9,color:"#1E293B",marginTop:4}}>{Math.round(painPct)}% of your total retirement impact</div>
        </div>

        <button onClick={onShare} style={{width:"100%",padding:14,background:`rgba(16,240,122,.08)`,
          border:`1px solid ${C.green}44`,borderRadius:14,color:C.green,fontWeight:800,
          cursor:"pointer",fontSize:15,letterSpacing:.5,fontFamily:"inherit"}}>
          📤 Share the Pain
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ SHARE MODAL ════════════════════════════════ */
function ShareModal({result,quote,char,settings,onClose}){
  const{nominal,months,yrs,amount,freq,presetObj}=result;
  const freqLbl=FREQS.find(f=>f.id===freq)?.label.toLowerCase()||"";
  const item=presetObj?`${presetObj.e} ${presetObj.label}`:usd2(amount);
  const[copied,setCopied]=useState(false);
  const text=["💸 Frugal Calculator","",`My ${freqLbl} ${item} = ${usd(nominal)} at retirement.`,`That's ${months} months of income GONE! 😱`,"",`${char.av} "${quote.substring(0,100)}..."`,""," 📲 Frugal Calculator — your retirement roaster"].join("\n");
  const copy=()=>navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:200,backdropFilter:"blur(14px)"}}>
      <div style={{background:"#0D0A25",border:`1px solid ${C.border}`,borderRadius:24,padding:24,width:"100%",maxWidth:360}}>
        <div style={{background:`linear-gradient(135deg,#0A0818,${char.col}18)`,border:`1px solid ${char.col}44`,borderRadius:16,padding:20,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:11,color:char.col,fontWeight:800,letterSpacing:2,marginBottom:6}}>💸 FRUGAL CALCULATOR</div>
          <div style={{fontSize:12,color:C.t3,marginBottom:8}}>{freqLbl} {item}</div>
          <div style={{...MONO,fontSize:36,fontWeight:700,color:C.green,letterSpacing:-1}}>{usd(nominal)}</div>
          <div style={{fontSize:11,color:C.t4,marginBottom:10}}>at retirement · {yrs} years of growth</div>
          <div style={{padding:"8px 14px",background:"rgba(251,146,60,.12)",border:"1px solid rgba(251,146,60,.3)",borderRadius:10,display:"inline-flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>⏳</span>
            <span style={{fontSize:13,color:C.orange,fontWeight:800}}>{months} months stolen</span>
          </div>
          <div style={{marginTop:10,fontSize:10,color:"#1E293B",fontStyle:"italic"}}>{char.av} "{quote.substring(0,80)}..."</div>
        </div>
        <button onClick={copy} style={{width:"100%",padding:13,marginBottom:8,background:copied?"rgba(16,240,122,.2)":"rgba(16,240,122,.08)",border:`1px solid ${copied?C.green:C.green+"44"}`,borderRadius:14,color:C.green,fontWeight:700,cursor:"pointer",fontSize:14,transition:"all .2s",fontFamily:"inherit"}}>
          {copied?"✅ Copied!":"📋 Copy Share Text"}
        </button>
        {typeof navigator!=="undefined"&&navigator.share&&(
          <button onClick={()=>navigator.share({title:"Frugal Calculator",text}).catch(()=>{})} style={{width:"100%",padding:13,marginBottom:8,background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:14,color:C.t1,fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:"inherit"}}>📤 Share</button>
        )}
        <button onClick={onClose} style={{width:"100%",padding:11,background:"none",border:`1px solid ${C.border}`,borderRadius:14,color:C.t3,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Close</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ SETTINGS TAB ═══════════════════════════════ */
function SettingsTab({settings:s,onChange,onExport,onImport,launchCount,onForcePopup,onResetLaunches}){
  const upd=(k,v)=>onChange(p=>({...p,[k]:v}));
  return(
    <div style={{paddingTop:10}}>
      <Card>
        <SL>📊 Your Profile</SL>
        <Slider label="Current Age" value={s.currentAge} min={18} max={Math.min(69,s.retirementAge-1)} onChange={v=>upd("currentAge",v)} color={C.cyan}/>
        <Slider label="Retirement Age" value={s.retirementAge} min={s.currentAge+1} max={80} onChange={v=>upd("retirementAge",v)} color={C.cyan}/>
        <div style={{...MONO,fontSize:11,color:C.t4}}>📅 {s.retirementAge-s.currentAge} years of compounding ahead</div>
      </Card>

      <Card>
        <SL>💰 Investment Assumptions</SL>
        <Slider label="Annual Growth Rate" value={s.growthRate} min={1} max={15} step={0.5} unit="%" onChange={v=>upd("growthRate",v)}/>
        <div style={{fontSize:10,color:C.t4,marginTop:-12,marginBottom:16,lineHeight:1.6}}>S&P 500 historical avg: ~10% nominal / ~7% real (after inflation)</div>
        <Slider label="Inflation Rate" value={s.inflationRate} min={0} max={8} step={0.5} unit="%" onChange={v=>upd("inflationRate",v)} color={C.orange}/>
        <Slider label="Monthly Retirement Budget" value={s.monthlyExpense} min={500} max={10000} step={100} unit="$" onChange={v=>upd("monthlyExpense",v)} color={C.purple}/>
        <div style={{fontSize:10,color:C.t4,marginTop:-10}}>"Months stolen" = Future Value ÷ this budget</div>
      </Card>

      <Card>
        <SL>🎭 Your Financial Advisor</SL>
        <Toggle value={s.randomizeAdvisor} onChange={v=>upd("randomizeAdvisor",v)} label="🎲 Randomize advisor each roast (default)"/>
        {!s.randomizeAdvisor&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
            {CHARS.map(c=>(
              <button key={c.id} onClick={()=>upd("characterId",c.id)} style={{padding:"12px 8px",cursor:"pointer",textAlign:"center",border:"none",background:s.characterId===c.id?c.bg:"rgba(255,255,255,.03)",outline:`2px solid ${s.characterId===c.id?c.col:"transparent"}`,borderRadius:14,color:C.t1,fontFamily:"inherit",transition:"all .15s",transform:s.characterId===c.id?"scale(1.02)":"scale(1)"}}>
                <div style={{fontSize:26}}>{c.av}</div>
                <div style={{fontSize:11,fontWeight:700,marginTop:4,color:s.characterId===c.id?c.col:C.t3}}>{c.name}</div>
                <div style={{fontSize:9,color:C.t4,marginTop:3,lineHeight:1.3}}>{c.tag}</div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SL>🖥️ Display</SL>
        <Toggle value={s.showPresets} onChange={v=>upd("showPresets",v)} label="Show quick-tap spending presets"/>
      </Card>

      <Card>
        <SL>💾 Data</SL>
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <button onClick={onExport} style={{flex:1,padding:10,background:"rgba(16,240,122,.06)",border:`1px solid ${C.green}33`,borderRadius:11,color:C.green,fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>📤 Export JSON</button>
          <button onClick={onImport} style={{flex:1,padding:10,background:"rgba(251,146,60,.06)",border:`1px solid ${C.orange}33`,borderRadius:11,color:C.orange,fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>📥 Import JSON</button>
        </div>
        <div style={{fontSize:10,color:C.t4,textAlign:"center"}}>Settings auto-save to this device</div>
      </Card>

      <Card>
        <SL>📲 Install as App (PWA)</SL>
        <div style={{fontSize:12,color:C.t3,lineHeight:1.9}}>
          <b style={{color:C.t2}}>iOS Safari:</b> Tap Share ⎋ → "Add to Home Screen"<br/>
          <b style={{color:C.t2}}>Android Chrome:</b> Tap ⋮ → "Add to Home Screen"<br/>
          Fully offline after first load. ✅
        </div>
      </Card>

      <Card>
        <SL>ℹ️ The Math</SL>
        <div style={{...MONO,fontSize:11,color:C.t4,lineHeight:2}}>
          <div>One-time:    FV = PV × (1+r)ⁿ</div>
          <div>Recurring:   FV = PMT × ((1+r)ⁿ−1) / r</div>
          <div>Real return: (1+nominal) / (1+inflation) − 1</div>
          <div>Months stolen = FV ÷ monthly budget</div>
        </div>
      </Card>

      <Card accent="#EF4444">
        <SL>🐛 Debug</SL>
        <div style={{...MONO,fontSize:12,color:C.t3,marginBottom:12}}>
          Launch count: <span style={{color:C.t1,fontWeight:700}}>{launchCount}</span>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          <button onClick={onForcePopup} style={{padding:"8px 12px",background:"rgba(251,146,60,.1)",border:`1px solid ${C.orange}44`,borderRadius:10,color:C.orange,fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>🔔 Force Popup</button>
          <button onClick={onResetLaunches} style={{padding:"8px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,color:C.t3,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Reset Count</button>
          <button onClick={()=>{if(window.confirm("Clear ALL settings and data?")){{onChange({...DEF});try{localStorage.removeItem("fc_v1");}catch{}};}}} style={{padding:"8px 12px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,color:C.red,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>🗑️ Clear All</button>
        </div>
        <details>
          <summary style={{fontSize:11,color:C.t3,cursor:"pointer",marginBottom:8,userSelect:"none"}}>▶ View settings JSON</summary>
          <pre style={{...MONO,fontSize:10,color:C.t4,background:"rgba(0,0,0,.3)",padding:10,borderRadius:10,overflow:"auto",maxHeight:180,marginTop:8}}>{JSON.stringify(s,null,2)}</pre>
        </details>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════ CALC TAB ═══════════════════════════════════ */
function CalcTab({dispStr,freq,presetId,showPresets,pendingOp,onPress,onFreq,onPreset,onShowResults,resultPreview}){
  const BTNS=[
    {l:"AC",t:"AC"},{l:"+/-",t:"+/-"},{l:"%",t:"%"},{l:"÷",t:"op"},
    {l:"7",t:"d"},{l:"8",t:"d"},{l:"9",t:"d"},{l:"×",t:"op"},
    {l:"4",t:"d"},{l:"5",t:"d"},{l:"6",t:"d"},{l:"−",t:"op"},
    {l:"1",t:"d"},{l:"2",t:"d"},{l:"3",t:"d"},{l:"+",t:"op"},
    {l:"0",t:"z"},{l:".",t:"."},{l:"=",t:"="},
  ];
  const isActive=l=>pendingOp===(l==="−"?"-":l);
  const bStyle=(t,l)=>{
    const base={border:"none",cursor:"pointer",borderRadius:13,fontWeight:700,fontFamily:"inherit",
      display:"flex",alignItems:"center",justifyContent:l==="0"?"flex-start":"center",
      userSelect:"none",height:56,fontSize:19,transition:"opacity .1s,transform .08s"};
    if(t==="=") return{...base,background:`linear-gradient(135deg,${C.green},#059669)`,color:"#000",fontSize:22,gridColumn:1};
    if(t==="z") return{...base,background:"#1A1830",color:C.t1,gridColumn:"span 2",paddingLeft:24};
    if(t==="op") return{...base,background:isActive(l)?"#5B21B6":"#2D1B4E",color:isActive(l)?C.t1:C.purple};
    if(["AC","+/-","%"].includes(t)) return{...base,background:"#1E1B3A",color:C.t2};
    return{...base,background:"#1A1830",color:C.t1};
  };
  const handle=b=>{
    if(b.t==="d"||b.t==="z")onPress("digit",b.l);
    else if(b.t==="op")onPress("op",b.l==="−"?"-":b.l);
    else onPress(b.t,b.l);
  };

  return(
    <div>
      {showPresets&&(
        <div style={{display:"flex",overflowX:"auto",gap:7,padding:"8px 0",scrollbarWidth:"none"}}>
          {PRESETS.map(p=>(
            <button key={p.id} onClick={()=>onPreset(p)} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,padding:"5px 10px",cursor:"pointer",whiteSpace:"nowrap",fontSize:11,border:"none",background:presetId===p.id?"rgba(16,240,122,.12)":"rgba(255,255,255,.05)",outline:`1px solid ${presetId===p.id?C.green+"66":C.border}`,borderRadius:99,color:presetId===p.id?C.green:C.t3,fontWeight:presetId===p.id?700:400,fontFamily:"inherit"}}>
              {p.e} {p.label}
            </button>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:5,margin:"8px 0"}}>
        {FREQS.map(f=>(
          <button key={f.id} onClick={()=>onFreq(f.id)} style={{flex:1,padding:"7px 2px",cursor:"pointer",fontSize:11,border:"none",background:freq===f.id?"rgba(16,240,122,.1)":"rgba(255,255,255,.03)",outline:`1px solid ${freq===f.id?C.green+"55":C.border}`,borderRadius:9,color:freq===f.id?C.green:C.t3,fontWeight:freq===f.id?700:400,fontFamily:"inherit"}}>
            {f.short}
          </button>
        ))}
      </div>

      {/* Display */}
      <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${C.border}`,borderRadius:18,padding:"10px 16px 12px",marginBottom:8}}>
        <div style={{fontSize:10,color:C.t4,marginBottom:2}}>{FREQS.find(f=>f.id===freq)?.label} spend</div>
        <div style={{...MONO,fontSize:dispStr.length>18?20:dispStr.length>14?26:dispStr.length>10?32:40,fontWeight:400,letterSpacing:-1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minHeight:48,display:"flex",alignItems:"center",justifyContent:"flex-end",color:C.t1}}>
          {dispStr}
        </div>
      </div>

      {/* Button grid */}
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

      {/* Results CTA */}
      <button onClick={onShowResults} disabled={!resultPreview} style={{width:"100%",padding:13,
        background:resultPreview?"rgba(16,240,122,.1)":"rgba(255,255,255,.03)",
        border:`1px solid ${resultPreview?C.green+"44":C.border}`,
        borderRadius:14,color:resultPreview?C.green:C.t4,fontWeight:800,
        cursor:resultPreview?"pointer":"default",fontSize:14,letterSpacing:.3,
        fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        transition:"all .2s"}}>
        {resultPreview
          ?<>💥 {short(resultPreview.nominal)} at retirement &nbsp;→</>
          :<>Enter an amount above</>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════ MAIN APP ═══════════════════════════════════ */
export default function App(){
  const[settings,setSettings]=useState(()=>{
    try{const s=localStorage.getItem("fc_v1");return s?{...DEF,...JSON.parse(s)}:DEF;}
    catch{return DEF;}
  });
  useEffect(()=>{try{localStorage.setItem("fc_v1",JSON.stringify(settings));}catch{}},[settings]);

  const[tab,setTab]=useState("calc");
  const[display,setDisplay]=useState("0");
  const[stored,setStored]=useState(null);
  const[pendingOp,setPendingOp]=useState(null);
  const[fresh,setFresh]=useState(false);
  const[freq,setFreq]=useState("once");
  const[presetId,setPresetId]=useState(null);
  const[result,setResult]=useState(null);
  const[quote,setQuote]=useState("");
  const[activeChar,setActiveChar]=useState(CHARS[0]);
  const[showResults,setShowResults]=useState(false);
  const[showShare,setShowShare]=useState(false);
  const[showParamCheck,setShowParamCheck]=useState(false);
  const[launchCount,setLaunchCount]=useState(0);

  // PWA + launch tracking
  useEffect(()=>{
    injectPWA();
    try{
      const cnt=parseInt(localStorage.getItem("fc_launches")||"0")+1;
      localStorage.setItem("fc_launches",String(cnt));
      setLaunchCount(cnt);
      if(cnt===1||cnt%10===0)setTimeout(()=>setShowParamCheck(true),900);
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

  const reRoast=useCallback(()=>{
    if(!result)return;
    const ch=settings.randomizeAdvisor
      ?CHARS[~~(Math.random()*CHARS.length)]
      :(CHARS.find(c=>c.id===settings.characterId)||CHARS[0]);
    setActiveChar(ch);
    setQuote(ch.q({amount:result.amount,fv:result.nominal,months:result.months,label:result.presetObj?.label,freq:result.freq}));
  },[result,settings]);

  useEffect(()=>{if(result?.nominal>0)reRoast();},[result?.nominal,settings.characterId,settings.randomizeAdvisor]);// eslint-disable-line

  // Calculator press handler
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

  // Keyboard support
  const pressRef=useRef(press);
  const freshRef=useRef(fresh);
  useEffect(()=>{pressRef.current=press;},[press]);
  useEffect(()=>{freshRef.current=fresh;},[fresh]);
  useEffect(()=>{
    const h=e=>{
      if(e.target.tagName==="INPUT")return;
      if("0123456789".includes(e.key))pressRef.current("digit",e.key);
      else if(e.key===".")pressRef.current(".",".");
      else if(e.key==="+")pressRef.current("op","+");
      else if(e.key==="-")pressRef.current("op","-");
      else if(e.key==="*")pressRef.current("op","×");
      else if(e.key==="/"){e.preventDefault();pressRef.current("op","÷");}
      else if(e.key==="Enter"||e.key==="=")pressRef.current("=","=");
      else if(e.key==="Backspace")setDisplay(d=>d.length>1&&!freshRef.current?d.slice(0,-1):"0");
      else if(e.key==="Escape")pressRef.current("AC","AC");
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);

  const exportSettings=()=>{
    const b=new Blob([JSON.stringify(settings,null,2)],{type:"application/json"});
    Object.assign(document.createElement("a"),{href:URL.createObjectURL(b),download:"frugal-calculator-settings.json"}).click();
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
    if(!same){setDisplay(String(p.amount));setFreq(p.freq);setStored(null);setPendingOp(null);setFresh(false);}
  };
  const handleShowResults=()=>{
    if(result&&result.nominal>0){reRoast();setShowResults(true);}
  };

  return(
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        body{background:${C.bg}}
        input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;background:currentColor;box-shadow:0 1px 6px rgba(0,0,0,.5)}
        ::-webkit-scrollbar{display:none}
        button{font-family:inherit}
        details>summary{list-style:none}
        details>summary::-webkit-details-marker{display:none}
        @keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{minHeight:"100vh",maxWidth:430,margin:"0 auto",
        background:`linear-gradient(160deg,${C.bg} 0%,#0F0822 100%)`,
        color:C.t1,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{padding:"14px 16px 6px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:19,fontWeight:900,letterSpacing:-.5}}>💸 Frugal Calculator</div>
            <div style={{fontSize:10,color:C.t4,marginTop:1}}>Your future self is watching. And crying.</div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:"auto",padding:"2px 14px 80px"}}>
          {tab==="calc"
            ?<CalcTab
                dispStr={fmtDisp(display)} freq={freq} presetId={presetId}
                showPresets={settings.showPresets} pendingOp={pendingOp}
                onPress={press} onFreq={setFreq} onPreset={selectPreset}
                onShowResults={handleShowResults} resultPreview={result}/>
            :<SettingsTab
                settings={settings} onChange={setSettings}
                onExport={exportSettings} onImport={importSettings}
                launchCount={launchCount}
                onForcePopup={()=>setShowParamCheck(true)}
                onResetLaunches={()=>{try{localStorage.setItem("fc_launches","0");setLaunchCount(0);}catch{}}}/>
          }
        </div>

        {/* Bottom Nav */}
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:100,
          background:"rgba(7,7,26,.97)",backdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,
          display:"flex",paddingBottom:"max(env(safe-area-inset-bottom,0px),8px)"}}>
          {[{id:"calc",icon:"🧮",label:"Calculator"},{id:"settings",icon:"⚙️",label:"Settings"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",
              color:tab===t.id?C.green:C.t4,
              padding:"10px 0 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:22}}>{t.icon}</span>
              <span style={{fontSize:10,fontWeight:tab===t.id?700:400}}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Slide-in Results Panel */}
        {result&&<ResultsPanel visible={showResults} onClose={()=>setShowResults(false)}
          result={result} quote={quote} char={activeChar} settings={settings}
          onShare={()=>setShowShare(true)} onReRoast={reRoast}/>}

        {/* Share Modal */}
        {showShare&&result&&<ShareModal result={result} quote={quote} char={activeChar}
          settings={settings} onClose={()=>setShowShare(false)}/>}

        {/* Param Check */}
        {showParamCheck&&<ParamCheckPopup settings={settings} launchCount={launchCount}
          onConfirm={()=>setShowParamCheck(false)}
          onSettings={()=>{setShowParamCheck(false);setTab("settings");}}/>}
      </div>
    </>
  );
}
