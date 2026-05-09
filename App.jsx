import { useState, useEffect, useCallback } from "react";

/* ─── Pure functions ──────────────────────────────────────────── */
const doCalc = (a, b, op) => ({ "+":a+b, "-":a-b, "×":a*b, "÷":b?a/b:0 }[op] ?? b);

function calcFV({ amount, freq, currentAge, retirementAge, growthRate, inflationRate }) {
  const yrs = retirementAge - currentAge;
  if (yrs <= 0 || amount <= 0) return { nominal:0, real:0, yrs:0 };
  const r = growthRate/100, inf = inflationRate/100, rr = (1+r)/(1+inf)-1;
  if (freq === "once") return { nominal: amount*(1+r)**yrs, real: amount*(1+rr)**yrs, yrs };
  const ppy = { daily:365, weekly:52, monthly:12, annually:1 }[freq] ?? 12;
  const n = yrs*ppy, rp = (1+r)**(1/ppy)-1, rrp = (1+rr)**(1/ppy)-1;
  return {
    nominal: rp>0 ? amount*((1+rp)**n-1)/rp : amount*n,
    real:    rrp>0 ? amount*((1+rrp)**n-1)/rrp : amount*n,
    yrs,
  };
}

const usd  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const usd2 = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n||0);
const short = n => {
  if (!n||!isFinite(n)||n<0) return "$0";
  if (n>=1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n>=1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n>=1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
};
function fmtDisp(raw) {
  if (!raw || raw==="0") return "$0";
  if (raw==="-0") return "$0";
  if (raw.endsWith(".")) return (raw.startsWith("-")?"-$":"$") + (raw.startsWith("-")?raw.slice(1):raw);
  const num = parseFloat(raw); if (isNaN(num)) return raw;
  const dot = raw.indexOf(".");
  if (dot===-1) return usd(num);
  const dec = raw.length-dot-1;
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:dec,maximumFractionDigits:dec}).format(num);
}

/* ─── Data ────────────────────────────────────────────────────── */
const CHARS = [
  { id:"grumpy", name:"Future You", av:"👴", tag:"Back in MY day, we SAVED.",
    col:"#FF6B35", bg:"rgba(255,107,53,.12)",
    q({amount,fv,months,label}){
      const i=label||"that", a=usd2(amount);
      return [
        `*shuffles in* ${a} on ${i.toUpperCase()}?! That's ${short(fv)} you STOLE from my retirement! Hand. It. Back.`,
        `You know what ${short(fv)} buys? Everything. Food. Rent. Dignity. You traded it for ${i}. I genuinely cannot.`,
        `${months} months. You stole ${months} months of my retirement for ${i}. I hope it was worth YOUR SOUL.`,
        `Store-brand noodles at 72. THIS is why. ${a} = ${short(fv)}. For. ${i.toUpperCase()}. I'm done.`,
        `*slams walker* THIS is why I still work at Walmart! ${a} today = ${short(fv)} at retirement!!`,
      ][Math.floor(Math.random()*5)];
    }
  },
  { id:"bro", name:"Finance Bro Kevin", av:"🧢", tag:"Have you heard of index funds?",
    col:"#4ECDC4", bg:"rgba(78,205,196,.12)",
    q({amount,fv,months,label}){
      const i=label||"that", a=usd2(amount);
      return [
        `Not everyone needs ${months} months of retirement. Some enjoy working at 75. Totally valid life choice. 👏`,
        `Bold move: sacrifice ${short(fv)} to spend ${a} today. Very contrarian. Very, very wrong. 😊`,
        `Not saying you're bad with money. Just noting Buffett has never bought ${i}. Correlation? 📈`,
        `${short(fv)} opportunity cost. The nursing home brochures looked okay. Shared rooms. Cozy vibe. 🙂`,
        `${a} on ${i}! Love the confidence of someone running a negative retirement plan. 🔥`,
      ][Math.floor(Math.random()*5)];
    }
  },
  { id:"grandma", name:"Disappointed Grandma", av:"👵", tag:"I'm not mad. Just... disappointed.",
    col:"#C77DFF", bg:"rgba(199,125,255,.12)",
    q({amount,fv,months,label}){
      const i=label||"this", a=usd2(amount);
      return [
        `Oh sweetie... *heavy sigh* ...Grandpa worked 40 years for what could've been ${short(fv)}. But enjoy ${i}, dear.`,
        `I'm not mad. *knits faster* Just thinking about the ${months} retirement months you just gave away. Quietly.`,
        `We reused tin foil. Saved every penny. Now ${a} on ${i} like it means nothing. *dabs eye slowly*`,
        `That ${short(fv)} was your golden years, sweetheart. Have ${i}. Grandma will clip more coupons.`,
        `My 70th birthday? A card from a nursing home. Because nobody saved their ${short(fv)}. Now you know why.`,
      ][Math.floor(Math.random()*5)];
    }
  },
  { id:"bard", name:"Bard of Broke", av:"🎭", tag:"To spend, or not to spend...",
    col:"#FFD700", bg:"rgba(255,215,0,.12)",
    q({amount,fv,months,label}){
      const i=label||"trinket", a=usd2(amount);
      return [
        `O WRETCHED MORTAL! For ${a} in silver, thou hast condemned thyself to ${months} forsaken moons of poverty! WOE!`,
        `Hark! What fool — to trade ${short(fv)} for today's fleeting ${i}! The compound gods weep!`,
        `All the world's a stage. Thou hast chosen: "Person Who Retires Broke." Curtain falls. ${short(fv)} — exit.`,
        `Thus with a single swipe, fiscal imprudence finds its mark most true. ${short(fv)} — hence to oblivion!`,
        `Methinks ${short(fv)} doth vanish like morning dew upon the cold stones of thine empty future. ALAS.`,
      ][Math.floor(Math.random()*5)];
    }
  },
];

const PRESETS = [
  { id:"latte",   e:"☕", label:"Daily Latte",   amount:6,    freq:"daily"   },
  { id:"netflix", e:"📺", label:"Netflix",        amount:15.99,freq:"monthly" },
  { id:"airpods", e:"🎧", label:"AirPods Pro",    amount:249,  freq:"once"    },
  { id:"brunch",  e:"🥑", label:"Brunch",         amount:45,   freq:"weekly"  },
  { id:"pizza",   e:"🍕", label:"Pizza Night",    amount:30,   freq:"weekly"  },
  { id:"sneakers",e:"👟", label:"Sneakers",       amount:150,  freq:"once"    },
  { id:"bar",     e:"🍺", label:"Bar Night",      amount:80,   freq:"weekly"  },
  { id:"trip",    e:"✈️", label:"Weekend Trip",   amount:500,  freq:"once"    },
  { id:"iphone",  e:"📱", label:"New iPhone",     amount:1099, freq:"once"    },
  { id:"car",     e:"🚗", label:"Car Payment",    amount:450,  freq:"monthly" },
  { id:"gym",     e:"💪", label:"Gym",            amount:50,   freq:"monthly" },
  { id:"eats",    e:"🛵", label:"Uber Eats/wk",  amount:35,   freq:"weekly"  },
];

const FREQS = [
  { id:"once",    short:"1×",    label:"One-time" },
  { id:"daily",   short:"Daily", label:"Daily"    },
  { id:"weekly",  short:"Weekly",label:"Weekly"   },
  { id:"monthly", short:"Mo.",   label:"Monthly"  },
  { id:"annually",short:"Yr.",   label:"Yearly"   },
];

const DEF = { currentAge:28, retirementAge:65, growthRate:7, inflationRate:3, monthlyExpense:3000, characterId:"grumpy" };

/* ─── Shared UI ───────────────────────────────────────────────── */
const MONO = { fontFamily:"'SF Mono','Fira Code',Consolas,monospace" };

function Slider({ label, value, min, max, step=1, unit="", onChange, color="#22C55E" }) {
  const pct = ((value-min)/(max-min))*100;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ color:"#888", fontSize:13 }}>{label}</span>
        <span style={{ ...MONO, color:"#fff", fontWeight:700, fontSize:13 }}>
          {unit==="$" ? usd(value) : `${value}${unit}`}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width:"100%", accentColor:color,
          background:`linear-gradient(to right,${color} ${pct}%,#1E1E35 ${pct}%)` }} />
    </div>
  );
}

function Card({ children, accent }) {
  return (
    <div style={{ background:"rgba(255,255,255,.025)", borderRadius:22, padding:16, marginBottom:12,
      border:`1px solid ${accent ? accent+"44" : "rgba(255,255,255,.07)"}` }}>
      {children}
    </div>
  );
}

const SL = ({ children }) => (
  <div style={{ fontSize:10, fontWeight:800, color:"#444", letterSpacing:1.5,
    textTransform:"uppercase", marginBottom:14 }}>
    {children}
  </div>
);

/* ─── Settings ────────────────────────────────────────────────── */
function SettingsTab({ settings:s, onChange, onExport, onImport }) {
  const upd = (k,v) => onChange(p => ({ ...p, [k]:v }));
  return (
    <div style={{ paddingTop:12 }}>
      <Card>
        <SL>📊 Your Profile</SL>
        <Slider label="Current Age" value={s.currentAge} min={18} max={Math.min(69,s.retirementAge-1)} onChange={v=>upd("currentAge",v)} color="#4ECDC4" />
        <Slider label="Retirement Age" value={s.retirementAge} min={s.currentAge+1} max={80} onChange={v=>upd("retirementAge",v)} color="#4ECDC4" />
        <div style={{ ...MONO, fontSize:11, color:"#444" }}>📅 {s.retirementAge-s.currentAge} years of compounding ahead</div>
      </Card>

      <Card>
        <SL>💰 Investment Assumptions</SL>
        <Slider label="Annual Growth Rate" value={s.growthRate} min={1} max={15} step={0.5} unit="%" onChange={v=>upd("growthRate",v)} />
        <p style={{ fontSize:10, color:"#333", marginTop:-14, marginBottom:16, lineHeight:1.6 }}>
          Historical S&amp;P 500: ~10% nominal / ~7% real (after inflation)
        </p>
        <Slider label="Inflation Rate" value={s.inflationRate} min={0} max={8} step={0.5} unit="%" onChange={v=>upd("inflationRate",v)} color="#FF9F0A" />
        <Slider label="Monthly Retirement Budget" value={s.monthlyExpense} min={500} max={10000} step={100} unit="$" onChange={v=>upd("monthlyExpense",v)} color="#C77DFF" />
        <p style={{ fontSize:10, color:"#333", marginTop:-14 }}>"Months stolen" = Future Value ÷ this amount</p>
      </Card>

      <Card>
        <SL>🎭 Your Financial Advisor</SL>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {CHARS.map(c => (
            <button key={c.id} onClick={() => upd("characterId",c.id)} style={{
              padding:"14px 8px", cursor:"pointer", textAlign:"center", border:"none",
              background: s.characterId===c.id ? c.bg : "rgba(255,255,255,.03)",
              outline:`2px solid ${s.characterId===c.id ? c.col : "transparent"}`,
              borderRadius:16, color:"white", fontFamily:"inherit",
              transform: s.characterId===c.id ? "scale(1.03)" : "scale(1)",
              transition:"all .15s",
            }}>
              <div style={{ fontSize:28 }}>{c.av}</div>
              <div style={{ fontSize:11, fontWeight:700, marginTop:6, color:s.characterId===c.id?c.col:"#666" }}>{c.name}</div>
              <div style={{ fontSize:9, color:"#444", marginTop:4, lineHeight:1.4 }}>{c.tag}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SL>💾 Export / Import</SL>
        <div style={{ display:"flex", gap:10, marginBottom:10 }}>
          <button onClick={onExport} style={{ flex:1, padding:11, background:"rgba(255,255,255,.03)", border:"1px solid #22C55E44", borderRadius:12, color:"#22C55E", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>📤 Export JSON</button>
          <button onClick={onImport} style={{ flex:1, padding:11, background:"rgba(255,255,255,.03)", border:"1px solid #FF9F0A44", borderRadius:12, color:"#FF9F0A", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>📥 Import JSON</button>
        </div>
        <div style={{ fontSize:10, color:"#333", textAlign:"center" }}>All settings auto-save to this device</div>
      </Card>

      <Card>
        <SL>📲 Add to Home Screen (PWA)</SL>
        <div style={{ fontSize:12, color:"#555", lineHeight:1.9 }}>
          <b style={{ color:"#777" }}>iOS Safari:</b> Tap Share ⎋ → "Add to Home Screen"<br/>
          <b style={{ color:"#777" }}>Android Chrome:</b> Tap ⋮ → "Add to Home Screen"<br/>
          Works fully offline once installed. ✅
        </div>
      </Card>

      <Card>
        <SL>ℹ️ The Science</SL>
        <div style={{ ...MONO, fontSize:11, color:"#3A3A55", lineHeight:2 }}>
          <div>One-time:    FV = PV × (1+r)ⁿ</div>
          <div>Recurring:   FV = PMT × ((1+r)ⁿ−1) / r</div>
          <div>Real return: (1+nominal) / (1+inflation) − 1</div>
          <div>Months stolen = FV ÷ monthly budget</div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Result Card ─────────────────────────────────────────────── */
function ResultCard({ result, quote, char, settings, onShare, onReRoast }) {
  if (!result || result.nominal <= 0) return null;
  const { nominal, real, months, yrs, amount } = result;
  const multi = amount > 0 ? Math.round(nominal/amount) : 0;
  const painPct = Math.min(100, (months/((settings.retirementAge-settings.currentAge)*12))*100);
  const [pc,lbl] = painPct<5  ? ["#22C55E","Minor Ouch 🟢"]  :
                   painPct<20 ? ["#FFD700","Hurts a bit 🟡"] :
                   painPct<50 ? ["#FF9F0A","That Hurts! 🟠"] : ["#FF4444","CATASTROPHIC 🔴"];
  return (
    <div style={{ border:`1px solid ${char.col}33`, borderRadius:22, overflow:"hidden",
      marginBottom:16, background:"rgba(255,255,255,.02)",
      animation:"popIn .4s cubic-bezier(.34,1.56,.64,1)" }}>

      {/* Quote bubble */}
      <div style={{ background:char.bg, padding:"14px 16px", borderBottom:`1px solid ${char.col}22` }}>
        <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
          <span style={{ fontSize:32, flexShrink:0, lineHeight:1 }}>{char.av}</span>
          <div>
            <div style={{ fontSize:9, color:char.col, fontWeight:800, letterSpacing:1.5, marginBottom:5 }}>
              {char.name.toUpperCase()}
            </div>
            <div style={{ fontSize:13, color:"#DDD", lineHeight:1.6, fontStyle:"italic" }}>
              "{quote}"
            </div>
          </div>
        </div>
        <button onClick={onReRoast} style={{ marginTop:10, padding:"5px 12px", fontSize:11,
          background:"rgba(255,255,255,.06)", border:"none", borderRadius:10, color:"#666",
          cursor:"pointer", fontFamily:"inherit" }}>
          🎲 Roast me again
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding:16 }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#444", marginBottom:4 }}>
            Future value in {yrs} yrs · {settings.growthRate}% annual return
          </div>
          <div style={{ ...MONO, fontSize:nominal>9999999?32:nominal>999999?38:46,
            fontWeight:700, color:"#22C55E", letterSpacing:-2, lineHeight:1 }}>
            {usd(nominal)}
          </div>
          <div style={{ fontSize:11, color:"#3A3A55", marginTop:4 }}>
            In today's dollars: {usd(real)}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div style={{ background:"rgba(255,107,53,.08)", border:"1px solid rgba(255,107,53,.2)", borderRadius:14, padding:12, textAlign:"center" }}>
            <div style={{ fontSize:22 }}>⏳</div>
            <div style={{ ...MONO, fontSize:28, fontWeight:700, color:"#FF6B35", lineHeight:1.1 }}>{months}</div>
            <div style={{ fontSize:10, color:"#FF6B35", fontWeight:700 }}>MONTHS STOLEN</div>
            <div style={{ fontSize:9, color:"#444" }}>from retirement</div>
          </div>
          <div style={{ background:"rgba(34,197,94,.07)", border:"1px solid rgba(34,197,94,.2)", borderRadius:14, padding:12, textAlign:"center" }}>
            <div style={{ fontSize:22 }}>🚀</div>
            <div style={{ ...MONO, fontSize:28, fontWeight:700, color:"#22C55E", lineHeight:1.1 }}>{multi}×</div>
            <div style={{ fontSize:10, color:"#22C55E", fontWeight:700 }}>YOUR MONEY</div>
            <div style={{ fontSize:9, color:"#444" }}>would have grown</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#444", marginBottom:7 }}>
            <span>💀 Retirement Pain Meter</span>
            <span style={{ color:pc, fontWeight:700 }}>{lbl}</span>
          </div>
          <div style={{ background:"#111125", borderRadius:99, height:8, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:99, width:`${painPct}%`, background:pc,
              transition:"width .8s cubic-bezier(.34,1.56,.64,1)" }} />
          </div>
        </div>

        <button onClick={onShare} style={{ width:"100%", padding:14,
          background:"rgba(34,197,94,.08)", border:"1px solid #22C55E55",
          borderRadius:14, color:"#22C55E", fontWeight:800, cursor:"pointer",
          fontSize:15, letterSpacing:.5, fontFamily:"inherit" }}>
          📤 Share the Pain
        </button>
      </div>
    </div>
  );
}

/* ─── Share Modal ─────────────────────────────────────────────── */
function ShareModal({ result, quote, char, settings, onClose }) {
  const { nominal, months, yrs, amount, freq, presetObj } = result;
  const freqLbl = FREQS.find(f=>f.id===freq)?.label.toLowerCase() || "";
  const item = presetObj ? `${presetObj.e} ${presetObj.label}` : usd2(amount);
  const [copied, setCopied] = useState(false);

  const text = [
    "💸 Don't Spend It", "",
    `My ${freqLbl} ${item} would grow to ${usd(nominal)} by retirement.`,
    `That's ${months} months of income GONE! 😱`, "",
    `${char.av} "${quote.substring(0,100)}..."`, "",
    "📲 Don't Spend It — retirement calculator",
  ].join("\n");

  const copy = () => navigator.clipboard.writeText(text).then(() => {
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  });

  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.92)", display:"flex",
      alignItems:"center", justifyContent:"center", padding:20, zIndex:200, backdropFilter:"blur(14px)" }}>
      <div style={{ background:"#0C0C1F", border:"1px solid rgba(255,255,255,.1)",
        borderRadius:24, padding:24, width:"100%", maxWidth:360 }}>

        {/* Preview card */}
        <div style={{ background:`linear-gradient(135deg,#0A0A1E,${char.col}18)`,
          border:`1px solid ${char.col}44`, borderRadius:16, padding:22, marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:11, color:char.col, fontWeight:800, letterSpacing:2, marginBottom:6 }}>
            💸 DON'T SPEND IT
          </div>
          <div style={{ fontSize:12, color:"#555", marginBottom:8 }}>{freqLbl} {item}</div>
          <div style={{ ...MONO, fontSize:40, fontWeight:700, color:"#22C55E", letterSpacing:-1 }}>{usd(nominal)}</div>
          <div style={{ fontSize:11, color:"#444", marginBottom:12 }}>at retirement · {yrs} years of growth</div>
          <div style={{ padding:"10px 16px", background:"rgba(255,107,53,.12)",
            border:"1px solid rgba(255,107,53,.3)", borderRadius:10,
            display:"inline-flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>⏳</span>
            <span style={{ fontSize:14, color:"#FF6B35", fontWeight:800 }}>{months} months stolen</span>
          </div>
          <div style={{ marginTop:12, fontSize:10, color:"#2A2A40", fontStyle:"italic" }}>
            {char.av} "{quote.substring(0,90)}..."
          </div>
        </div>

        <button onClick={copy} style={{ width:"100%", padding:14, marginBottom:8, fontFamily:"inherit",
          background: copied?"rgba(34,197,94,.2)":"rgba(34,197,94,.08)",
          border:`1px solid ${copied?"#22C55E":"#22C55E44"}`,
          borderRadius:14, color:"#22C55E", fontWeight:700, cursor:"pointer",
          fontSize:14, transition:"all .2s" }}>
          {copied ? "✅ Copied!" : "📋 Copy Share Text"}
        </button>

        {typeof navigator !== "undefined" && navigator.share && (
          <button onClick={() => navigator.share({ title:"Don't Spend It", text }).catch(()=>{})}
            style={{ width:"100%", padding:14, marginBottom:8, background:"rgba(255,255,255,.04)",
              border:"1px solid rgba(255,255,255,.1)", borderRadius:14, color:"white",
              fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>
            📤 Share
          </button>
        )}

        <button onClick={onClose} style={{ width:"100%", padding:12, background:"none",
          border:"1px solid rgba(255,255,255,.07)", borderRadius:14, color:"#555",
          cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ─── Calculator Tab ──────────────────────────────────────────── */
function CalcTab({ dispStr, freq, presetId, result, quote, char, settings, pendingOp, onPress, onFreq, onPreset, onShare, onReRoast }) {
  const BTNS = [
    {l:"AC",t:"AC"}, {l:"+/-",t:"+/-"}, {l:"%",t:"%"}, {l:"÷",t:"op"},
    {l:"7",t:"d"},   {l:"8",t:"d"},     {l:"9",t:"d"}, {l:"×",t:"op"},
    {l:"4",t:"d"},   {l:"5",t:"d"},     {l:"6",t:"d"}, {l:"−",t:"op"},
    {l:"1",t:"d"},   {l:"2",t:"d"},     {l:"3",t:"d"}, {l:"+",t:"op"},
    {l:"0",t:"z"},   {l:".",t:"."},     {l:"=",t:"="},
  ];

  const active = l => pendingOp === (l==="−" ? "-" : l);

  const bStyle = (t,l) => {
    const base = { border:"none", cursor:"pointer", borderRadius:16, fontWeight:600,
      display:"flex", alignItems:"center", justifyContent: l==="0"?"flex-start":"center",
      userSelect:"none", minHeight:66, fontSize:20, transition:"opacity .1s,transform .1s",
      fontFamily:"inherit" };
    if (t==="=")   return { ...base, background:"#22C55E", color:"#000", fontSize:26, gridColumn:1 };
    if (t==="z")   return { ...base, background:"#1E1E32", color:"#FFF", gridColumn:"span 2", paddingLeft:26 };
    if (t==="op")  return { ...base, background:active(l)?"#FF9F0A":"#252540", color:active(l)?"#000":"#FF9F0A", aspectRatio:"1" };
    if (["AC","+/-","%"].includes(t)) return { ...base, background:"#252540", color:"#CCC", aspectRatio:"1" };
    return { ...base, background:"#1E1E32", color:"#FFF", aspectRatio:"1" };
  };

  const handle = b => {
    if (b.t==="d"||b.t==="z") onPress("digit", b.l);
    else if (b.t==="op")      onPress("op", b.l==="−"?"-":b.l);
    else                      onPress(b.t, b.l);
  };

  return (
    <div>
      {/* Preset chips */}
      <div style={{ display:"flex", overflowX:"auto", gap:8, padding:"12px 0 8px", scrollbarWidth:"none" }}>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => onPreset(p)} style={{
            flexShrink:0, display:"flex", alignItems:"center", gap:5,
            padding:"7px 13px", cursor:"pointer", whiteSpace:"nowrap", fontSize:12, border:"none",
            background: presetId===p.id ? "rgba(34,197,94,.12)" : "rgba(255,255,255,.04)",
            outline: `1px solid ${presetId===p.id ? "#22C55E77" : "rgba(255,255,255,.07)"}`,
            borderRadius:99, color: presetId===p.id ? "#22C55E" : "#777",
            fontWeight: presetId===p.id ? 700 : 400, fontFamily:"inherit" }}>
            {p.e} {p.label}
          </button>
        ))}
      </div>

      {/* Frequency */}
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {FREQS.map(f => (
          <button key={f.id} onClick={() => onFreq(f.id)} style={{
            flex:1, padding:"8px 2px", cursor:"pointer", fontSize:11, border:"none",
            background: freq===f.id ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.03)",
            outline: `1px solid ${freq===f.id ? "#22C55E66" : "rgba(255,255,255,.06)"}`,
            borderRadius:10, color: freq===f.id ? "#22C55E" : "#555",
            fontWeight: freq===f.id ? 700 : 400, fontFamily:"inherit" }}>
            {f.short}
          </button>
        ))}
      </div>

      {/* Display */}
      <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)",
        borderRadius:20, padding:"12px 20px 14px", marginBottom:12 }}>
        <div style={{ fontSize:10, color:"#3A3A55", marginBottom:2 }}>
          {FREQS.find(f=>f.id===freq)?.label} spend
        </div>
        <div style={{ ...MONO,
          fontSize: dispStr.length>18?20 : dispStr.length>14?26 : dispStr.length>10?32 : 42,
          fontWeight:400, letterSpacing:-1, textAlign:"right",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          minHeight:52, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
          {dispStr}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {BTNS.map((b,i) => (
          <button key={i} style={bStyle(b.t,b.l)} onClick={() => handle(b)}
            onPointerDown={e => { e.currentTarget.style.opacity=".6"; e.currentTarget.style.transform="scale(.93)"; }}
            onPointerUp={e =>   { e.currentTarget.style.opacity="1";  e.currentTarget.style.transform="scale(1)";   }}
            onPointerLeave={e =>{ e.currentTarget.style.opacity="1";  e.currentTarget.style.transform="scale(1)";   }}>
            {b.l}
          </button>
        ))}
      </div>

      {result && result.nominal > 0 && (
        <ResultCard result={result} quote={quote} char={char}
          settings={settings} onShare={onShare} onReRoast={onReRoast} />
      )}
    </div>
  );
}

/* ─── Main App ────────────────────────────────────────────────── */
export default function App() {
  const [settings, setSettings] = useState(() => {
    try { const s = localStorage.getItem("dsi_v2"); return s ? { ...DEF, ...JSON.parse(s) } : DEF; }
    catch { return DEF; }
  });
  useEffect(() => {
    try { localStorage.setItem("dsi_v2", JSON.stringify(settings)); } catch {}
  }, [settings]);

  const [tab,       setTab]       = useState("calc");
  const [display,   setDisplay]   = useState("0");
  const [stored,    setStored]    = useState(null);
  const [pendingOp, setPendingOp] = useState(null);
  const [fresh,     setFresh]     = useState(false);
  const [freq,      setFreq]      = useState("once");
  const [presetId,  setPresetId]  = useState(null);
  const [result,    setResult]    = useState(null);
  const [quote,     setQuote]     = useState("");
  const [showShare, setShowShare] = useState(false);

  const char = CHARS.find(c => c.id === settings.characterId) || CHARS[0];

  /* ── Calculator logic ─── */
  const press = useCallback((type, val) => {
    switch (type) {
      case "AC": setDisplay("0"); setStored(null); setPendingOp(null); setFresh(false); break;
      case "+/-": setDisplay(d => d==="0" ? "0" : d.startsWith("-") ? d.slice(1) : "-"+d); break;
      case "%":   setDisplay(d => { const v=parseFloat(d)/100; return isNaN(v)?"0":String(parseFloat(v.toFixed(10))); }); break;
      case "digit":
        if (fresh) { setDisplay(val==="0"?"0":val); setFresh(false); }
        else setDisplay(d => d==="0" ? val : d==="-0" ? "-"+val : d.length<12 ? d+val : d);
        break;
      case ".":
        if (fresh) { setDisplay("0."); setFresh(false); }
        else setDisplay(d => d.includes(".")? d : d+".");
        break;
      case "op": {
        const curr = parseFloat(display);
        if (stored !== null && !fresh) {
          const res = doCalc(stored, curr, pendingOp);
          const str = String(parseFloat(res.toFixed(10)));
          setDisplay(str==="-0"?"0":str); setStored(parseFloat(str));
        } else setStored(curr);
        setPendingOp(val); setFresh(true); break;
      }
      case "=": {
        if (pendingOp===null || stored===null) break;
        const res = doCalc(stored, parseFloat(display), pendingOp);
        const str = String(parseFloat(res.toFixed(10)));
        setDisplay(str==="-0"?"0":str); setStored(null); setPendingOp(null); setFresh(true); break;
      }
    }
  }, [display, stored, pendingOp, fresh]);

  /* ── Auto-calculate FV ─── */
  useEffect(() => {
    const amount = parseFloat(display);
    if (!amount || amount <= 0) { setResult(null); return; }
    const { nominal, real, yrs } = calcFV({ amount, freq, ...settings });
    if (nominal <= 0) { setResult(null); return; }
    const months   = Math.max(0, Math.round(nominal / settings.monthlyExpense));
    const presetObj = PRESETS.find(p => p.id === presetId) || null;
    setResult({ amount, freq, nominal, real, months, yrs, presetObj });
  }, [display, freq, presetId, settings]);

  /* ── Roast ─── */
  const reRoast = useCallback(() => {
    if (!result) return;
    setQuote(char.q({ amount:result.amount, fv:result.nominal, months:result.months, label:result.presetObj?.label }));
  }, [result, char]);
  useEffect(() => { if (result?.nominal > 0) reRoast(); }, [result?.nominal, char.id]); // eslint-disable-line

  /* ── Keyboard ─── */
  useEffect(() => {
    const h = e => {
      if (e.target.tagName==="INPUT") return;
      if ("0123456789".includes(e.key)) press("digit", e.key);
      else if (e.key===".") press(".",".");
      else if (e.key==="+") press("op","+");
      else if (e.key==="-") press("op","-");
      else if (e.key==="*") press("op","×");
      else if (e.key==="/") { e.preventDefault(); press("op","÷"); }
      else if (e.key==="Enter"||e.key==="=") press("=","=");
      else if (e.key==="Backspace") setDisplay(d => d.length>1&&!fresh ? d.slice(0,-1) : "0");
      else if (e.key==="Escape") press("AC","AC");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [press, fresh]);

  /* ── Export / Import ─── */
  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings,null,2)], { type:"application/json" });
    Object.assign(document.createElement("a"), { href:URL.createObjectURL(blob), download:"dont-spend-it-settings.json" }).click();
  };
  const importSettings = () => {
    const inp = Object.assign(document.createElement("input"), { type:"file", accept:".json" });
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = ev => { try { setSettings(p => ({ ...p, ...JSON.parse(ev.target.result) })); } catch { alert("Invalid file"); } };
      r.readAsText(f);
    }; inp.click();
  };

  /* ── Preset selection ─── */
  const selectPreset = p => {
    const same = p.id === presetId; setPresetId(same ? null : p.id);
    if (!same) { setDisplay(String(p.amount)); setFreq(p.freq); setStored(null); setPendingOp(null); setFresh(false); }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #07071A; }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 99px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; transition: transform .15s; }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }
        ::-webkit-scrollbar { display: none; }
        button { font-family: inherit; }
        @keyframes popIn { from { opacity:0; transform:translateY(16px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>

      <div style={{ minHeight:"100vh", maxWidth:430, margin:"0 auto",
        background:"linear-gradient(160deg,#07071A 0%,#0D0D22 100%)",
        color:"#fff", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
        display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"20px 20px 6px", textAlign:"center", flexShrink:0 }}>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:-.5 }}>💸 Don't Spend It</div>
          <div style={{ fontSize:11, color:"#2A2A44", marginTop:3 }}>Your future self is watching. And crying.</div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 16px 90px" }}>
          {tab==="calc"
            ? <CalcTab dispStr={fmtDisp(display)} freq={freq} presetId={presetId} result={result}
                quote={quote} char={char} settings={settings} pendingOp={pendingOp}
                onPress={press} onFreq={setFreq} onPreset={selectPreset}
                onShare={() => setShowShare(true)} onReRoast={reRoast} />
            : <SettingsTab settings={settings} onChange={setSettings}
                onExport={exportSettings} onImport={importSettings} />
          }
        </div>

        {/* Bottom Nav */}
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:"100%", maxWidth:430, zIndex:100, background:"rgba(7,7,26,.97)",
          backdropFilter:"blur(20px)", borderTop:"1px solid rgba(255,255,255,.06)",
          display:"flex", paddingBottom:"max(env(safe-area-inset-bottom,0px),8px)" }}>
          {[{id:"calc",icon:"🧮",label:"Calculator"},{id:"settings",icon:"⚙️",label:"Settings"}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, background:"none", border:"none", cursor:"pointer",
              color: tab===t.id ? "#22C55E" : "#2E2E44",
              padding:"10px 0 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <span style={{ fontSize:10, fontWeight: tab===t.id ? 700 : 400 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {showShare && result && (
          <ShareModal result={result} quote={quote} char={char}
            settings={settings} onClose={() => setShowShare(false)} />
        )}
      </div>
    </>
  );
}
