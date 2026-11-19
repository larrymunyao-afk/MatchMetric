import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CalendarDays,
  Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Copy, ExternalLink,
  Filter, Goal, LayoutDashboard, ListFilter, LockKeyhole, Menu, Plus, Search,
  ShieldCheck, Sparkles, Target, Trophy, TrendingUp, X, Zap
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { demoPredictions, getPredictions } from "./lib/data";
import type { Prediction, PredictionStatus } from "./types";

type Page = "Overview" | "Today's Tips" | "Accumulators" | "Goals Market" | "Double Chance" | "Results & History" | "Statistics" | "Admin";
const nav: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Today's Tips", icon: Target },
  { label: "Accumulators", icon: Zap }, { label: "Goals Market", icon: Goal },
  { label: "Double Chance", icon: ShieldCheck }, { label: "Results & History", icon: CalendarDays },
  { label: "Statistics", icon: BarChart3 }
];

const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
const fmtTime = (s: string) => new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const settled = (p: Prediction[]) => p.filter(x => x.status === "won" || x.status === "lost");
const accuracy = (p: Prediction[]) => {
  const s = settled(p); return s.length ? Math.round(s.filter(x => x.status === "won").length / s.length * 100) : 0;
};
const demoChart = [{ day: "Mon", value: 62 }, { day: "Tue", value: 68 }, { day: "Wed", value: 65 }, { day: "Thu", value: 71 }, { day: "Fri", value: 69 }, { day: "Sat", value: 74 }, { day: "Sun", value: 72 }];

function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [predictions, setPredictions] = useState<Prediction[]>(demoPredictions);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("All markets");
  const [statusFilter, setStatusFilter] = useState("All results");
  const [selected, setSelected] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setPredictions(await getPredictions()); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not load predictions."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user?.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const today = predictions.filter(p => new Date(p.kickoff_at).toDateString() === new Date().toDateString());
  const history = predictions.filter(p => p.status !== "pending");
  const wins = predictions.filter(p => p.status === "won").length;
  const losses = predictions.filter(p => p.status === "lost").length;
  const currentAccuracy = accuracy(predictions);
  const filtered = useMemo(() => predictions.filter(p => {
    const matchesQuery = `${p.home_team} ${p.away_team} ${p.competition} ${p.selection}`.toLowerCase().includes(query.toLowerCase());
    const matchesMarket = marketFilter === "All markets" || p.market === marketFilter;
    const matchesStatus = statusFilter === "All results" || p.status === statusFilter.toLowerCase();
    const matchesPage = page === "Goals Market" ? p.market === "Goals" : page === "Double Chance" ? p.market === "Double Chance" : true;
    return matchesQuery && matchesMarket && matchesStatus && matchesPage;
  }), [predictions, query, marketFilter, statusFilter, page]);

  function toggleSelection(id: string) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }
  const selectedPredictions = predictions.filter(p => selected.includes(p.id));
  const combinedOdds = selectedPredictions.reduce((n, p) => n * Number(p.odds), 1);
  async function copySlip() {
    const text = selectedPredictions.map(p => `${p.home_team} v ${p.away_team} — ${p.selection} @ ${p.odds}`).join("\n") + `\nCombined odds: ${combinedOdds.toFixed(2)}`;
    await navigator.clipboard.writeText(text);
    setNotice("Your selections have been copied.");
  }

  async function login() {
    if (!supabase) { setNotice("Connect Supabase first using the setup guide."); return; }
    const email = prompt("Administrator email");
    const password = prompt("Password");
    if (!email || !password) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setNotice(error ? error.message : "Signed in.");
  }
  async function logout() { if (supabase) await supabase.auth.signOut(); setUserEmail(null); }

  const isDemo = !isSupabaseConfigured;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Activity size={20}/></div><div><b>matchmetric</b><span>FOOTBALL INTELLIGENCE</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X/></button></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.label} className={`nav-link ${page === item.label ? "active" : ""}`} onClick={() => { setPage(item.label); setMobileOpen(false); }}><item.icon size={17}/><span>{item.label}</span>{item.label === "Today's Tips" && <i className="nav-count">{today.length}</i>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="free-card"><div className="free-icon"><Sparkles size={16}/></div><b>Always free.</b><p>Independent football analysis. No subscriptions, no locked tips.</p></div>
        <button className="nav-link admin-link" onClick={() => { setPage("Admin"); setMobileOpen(false); }}><LockKeyhole size={17}/>Admin workspace<ArrowRight size={14}/></button>
        <div className="profile-row"><div className="avatar">MM</div><div><b>MatchMetric</b><span>{userEmail ?? "Public access"}</span></div><button title="Admin sign in" onClick={login}><ExternalLink size={15}/></button></div>
      </div>
    </aside>
    {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)}/>}
    <main className="main">
      <header className="topbar"><div className="top-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu/></button><div className="breadcrumb">MATCHMETRIC <span>/</span> {page.toUpperCase()}</div></div><div className="top-actions"><div className="live-pill"><span/> LIVE PLATFORM</div><button className="icon-btn" title="Search" onClick={() => document.getElementById("global-search")?.focus()}><Search size={17}/></button><button className="top-date"><CalendarDays size={15}/>{new Date().toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"})}</button></div></header>
      <div className="content">
        {isDemo && <div className="demo-banner"><CircleHelp size={16}/><span><b>Preview mode:</b> showing clearly labelled demonstration data. Connect Supabase and publish real predictions before going live.</span><button onClick={() => setPage("Admin")}>Setup admin <ArrowRight size={14}/></button></div>}
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {page === "Overview" && <Overview predictions={predictions} today={today} wins={wins} losses={losses} accuracy={currentAccuracy} onNavigate={setPage} onSelect={toggleSelection} selected={selected}/>}
        {page === "Accumulators" && <AccumulatorPage predictions={predictions} selected={selected} toggle={toggleSelection} odds={combinedOdds} onCopy={copySlip}/>}
        {page === "Statistics" && <Statistics predictions={predictions} wins={wins} losses={losses} accuracy={currentAccuracy}/>}
        {page === "Admin" && <Admin userEmail={userEmail} onLogin={login} onLogout={logout} onRefresh={refresh} onNotice={setNotice}/>}
        {page !== "Overview" && page !== "Accumulators" && page !== "Statistics" && page !== "Admin" && <PredictionPage page={page} data={filtered} loading={loading} query={query} setQuery={setQuery} marketFilter={marketFilter} setMarketFilter={setMarketFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} selected={selected} toggle={toggleSelection}/>}
        {showDisclaimer && <div className="disclaimer"><ShieldCheck size={16}/><div><b>Predictions are opinions, not guarantees.</b><span>Football is unpredictable. Past performance does not guarantee future results. Please bet responsibly and never stake money you cannot afford to lose.</span></div><button onClick={() => setShowDisclaimer(false)}><X size={15}/></button></div>}
        <footer className="footer"><span>© {new Date().getFullYear()} MatchMetric. Independent football analysis.</span><div><button>Responsible betting</button><button>Privacy</button><button>Contact</button></div></footer>
      </div>
    </main>
  </div>;
}

function PageHeading({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:React.ReactNode}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Metric({label,value,change,icon:Icon,positive=true}:{label:string;value:string;change:string;icon:typeof Activity;positive?:boolean}) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={17}/></div></div><div className="metric-value">{value}</div><div className={`metric-change ${positive?"positive":"neutral"}`}>{positive?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {change}</div></div>;
}
function Overview({predictions,today,wins,losses,accuracy,onNavigate,onSelect,selected}:{predictions:Prediction[];today:Prediction[];wins:number;losses:number;accuracy:number;onNavigate:(p:Page)=>void;onSelect:(id:string)=>void;selected:string[]}) {
  return <>
    <section className="hero"><div className="hero-copy"><div className="hero-kicker"><span/> INDEPENDENT FOOTBALL ANALYSIS</div><h1>Read the game.<br/><em>Back your judgment.</em></h1><p>Free football predictions, thoughtful analysis and a performance record you can verify. No hype. No guaranteed wins. Just the work.</p><div className="hero-actions"><button className="btn-primary" onClick={() => onNavigate("Today's Tips")}>Explore today's tips <ArrowRight size={16}/></button><button className="btn-ghost" onClick={() => onNavigate("Results & History")}>View track record</button></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-ball"><span>⚽</span></div><div className="floating-stat stat-a"><span>90 DAY RECORD</span><b>Transparent</b><small>Every settled pick</small></div><div className="floating-stat stat-b"><span>ACCESS</span><b>100% Free</b><small>Always open</small></div><div className="hero-grid"/></div><div className="hero-foot"><span><CheckCircle2 size={14}/> Every result recorded</span><span><CheckCircle2 size={14}/> No paid picks</span><span><CheckCircle2 size={14}/> Independent analysis</span></div></section>
    <div className="section-head"><div><div className="eyebrow">THE NUMBERS</div><h2>Performance snapshot</h2><p>Calculated from published and settled predictions.</p></div><button className="text-link" onClick={() => onNavigate("Statistics")}>Full analytics <ArrowRight size={14}/></button></div>
    <div className="metrics-grid"><Metric label="Prediction accuracy" value={`${accuracy}%`} change="Settled picks only" icon={Target}/><Metric label="Correct predictions" value={String(wins)} change="All-time in loaded data" icon={Trophy}/><Metric label="Incorrect predictions" value={String(losses)} change="Losses remain visible" icon={Activity} positive={false}/><Metric label="Today's fixtures" value={String(today.length)} change="Published selections" icon={CalendarDays}/></div>
    <div className="dashboard-grid"><div className="panel picks-panel"><div className="panel-heading"><div><div className="eyebrow">LATEST RELEASE</div><h3>Today's predictions</h3></div><button className="text-link" onClick={() => onNavigate("Today's Tips")}>View all <ArrowRight size={14}/></button></div>{today.length ? today.slice(0,4).map(p=><PickRow key={p.id} p={p} selected={selected.includes(p.id)} onSelect={()=>onSelect(p.id)}/>) : <Empty text="No predictions published for today yet."/>}</div><div className="panel chart-panel"><div className="panel-heading"><div><div className="eyebrow">RECENT TREND</div><h3>Accuracy movement</h3></div><span className="range-tag">DEMO TREND</span></div><div className="chart-summary"><b>{accuracy}%</b><span>Current loaded sample accuracy</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={demoChart}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#21c997" stopOpacity={0.25}/><stop offset="100%" stopColor="#21c997" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#233441" vertical={false}/><XAxis dataKey="day" tick={{fill:"#718392",fontSize:11}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fill:"#718392",fontSize:11}} axisLine={false} tickLine={false} width={28}/><Tooltip contentStyle={{background:"#14212c",border:"1px solid #2a3b48",borderRadius:10,color:"#fff"}}/><Area type="monotone" dataKey="value" stroke="#21c997" strokeWidth={2.5} fill="url(#chartFill)"/></AreaChart></ResponsiveContainer></div><span className="chart-note">Illustrative trend until real historical data is connected.</span></div></div>
    <div className="section-head compact"><div><div className="eyebrow">CHOOSE YOUR MARKET</div><h2>Find your angle</h2></div></div><div className="market-grid"><MarketCard icon={Goal} title="Goals market" desc="Over / under goals and both teams to score." count={predictions.filter(p=>p.market==="Goals").length} onClick={()=>onNavigate("Goals Market")}/><MarketCard icon={ShieldCheck} title="Double chance" desc="1X, X2 and 12 selections." count={predictions.filter(p=>p.market==="Double Chance").length} onClick={()=>onNavigate("Double Chance")}/><MarketCard icon={Zap} title="Accumulators" desc="Build a shortlist from available predictions." count={0} onClick={()=>onNavigate("Accumulators")}/></div>
    <div className="trust-strip"><div className="trust-icon"><ShieldCheck/></div><div><b>A record you can check. Wins and losses, together.</b><span>Our results archive is designed to show every settled prediction—not just the successful ones.</span></div><button className="btn-outline" onClick={()=>onNavigate("Results & History")}>Explore results <ArrowRight size={15}/></button></div>
  </>;
}
function MarketCard({icon:Icon,title,desc,count,onClick}:{icon:typeof Activity;title:string;desc:string;count:number;onClick:()=>void}) {
  return <button className="market-card" onClick={onClick}><div className="market-icon"><Icon size={20}/></div><div className="market-card-copy"><b>{title}</b><span>{desc}</span><small>{count} available selections</small></div><ArrowRight size={17}/></button>;
}
function PickRow({p,selected,onSelect}:{p:Prediction;selected:boolean;onSelect:()=>void}) {
  return <div className="pick-row"><div className="pick-match"><div className="league">{p.competition} <span>·</span> {p.country}</div><b>{p.home_team} <span>vs</span> {p.away_team}</b><small><Clock3 size={12}/> {fmtDate(p.kickoff_at)} · {fmtTime(p.kickoff_at)}</small></div><div className="pick-selection"><span>{p.market}</span><b>{p.selection}</b></div><div className="pick-odds"><span>ODDS</span><b>{Number(p.odds).toFixed(2)}</b></div><button className={`add-pick ${selected?"added":""}`} onClick={onSelect}>{selected?<Check size={16}/>:<Plus size={16}/>}</button></div>;
}
function PredictionPage({page,data,loading,query,setQuery,marketFilter,setMarketFilter,statusFilter,setStatusFilter,selected,toggle}:{page:Page;data:Prediction[];loading:boolean;query:string;setQuery:(s:string)=>void;marketFilter:string;setMarketFilter:(s:string)=>void;statusFilter:string;setStatusFilter:(s:string)=>void;selected:string[];toggle:(id:string)=>void}) {
  const history = page === "Results & History";
  return <><PageHeading eyebrow={history?"THE FULL RECORD":"PREDICTION CENTRE"} title={page} description={history?"Every settled selection stays on the record. Filter by market, outcome or match.":"Browse published football selections, compare the markets and build your own shortlist."} action={<div className="record-chip"><span/> {data.length} RECORDS</div>}/><div className="toolbar"><div className="search-field"><Search size={16}/><input id="global-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search teams, leagues or selections..."/></div><div className="select-wrap"><ListFilter size={15}/><select value={marketFilter} onChange={e=>setMarketFilter(e.target.value)}><option>All markets</option><option>Goals</option><option>Double Chance</option><option>1X2</option></select><ChevronDown size={14}/></div>{history&&<div className="select-wrap"><Filter size={15}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All results</option><option value="won">Won</option><option value="lost">Lost</option><option value="void">Void</option><option value="pending">Pending</option></select><ChevronDown size={14}/></div>}</div><div className="panel table-panel"><div className="table-title"><div><b>{history?"Results archive":"Available selections"}</b><span>{history?"Published picks and their recorded outcomes":"Select individual tips to add them to your accumulator shortlist."}</span></div><span className="range-tag">LAST 90 DAYS</span></div>{loading?<div className="loading">Loading predictions…</div>:data.length===0?<Empty text="No records match these filters."/>:<div className="table-scroll"><table><thead><tr><th>FIXTURE</th><th>MARKET</th><th>SELECTION</th><th>ODDS</th><th>KICKOFF</th><th>STATUS</th><th></th></tr></thead><tbody>{data.map(p=><tr key={p.id}><td><b>{p.home_team} <span className="muted">vs</span> {p.away_team}</b><small>{p.competition}</small></td><td>{p.market}</td><td><b className="selection-text">{p.selection}</b></td><td className="odds-cell">{Number(p.odds).toFixed(2)}</td><td>{fmtDate(p.kickoff_at)}<small>{fmtTime(p.kickoff_at)}</small></td><td><Status status={p.status}/>{p.status!=="pending"&&p.home_score!==null&&<small>Score {p.home_score}–{p.away_score}</small>}</td><td>{p.status==="pending"&&<button className={`add-pick ${selected.includes(p.id)?"added":""}`} onClick={()=>toggle(p.id)}>{selected.includes(p.id)?<Check size={15}/>:<Plus size={15}/>}</button>}</td></tr>)}</tbody></table></div>}</div><p className="footnote">Historical results should represent selections genuinely published before kick-off. Demonstration records are not real betting results.</p></>;
}
function Status({status}:{status:PredictionStatus}) { return <span className={`status status-${status}`}><i/>{status}</span>; }
function Empty({text}:{text:string}) { return <div className="empty-state"><div><CircleHelp size={21}/></div><b>Nothing to show yet</b><span>{text}</span></div>; }

function AccumulatorPage({predictions,selected,toggle,odds,onCopy}:{predictions:Prediction[];selected:string[];toggle:(id:string)=>void;odds:number;onCopy:()=>void}) {
  const available=predictions.filter(p=>p.status==="pending");
  return <><PageHeading eyebrow="BUILD YOUR SHORTLIST" title="Accumulator builder" description="Choose the selections you want to combine. The combined odds update automatically as you build your slip." action={<span className="free-tag"><Sparkles size={14}/> FREE TOOL</span>}/><div className="acc-layout"><div className="panel acc-choices"><div className="panel-heading"><div><div className="eyebrow">AVAILABLE PICKS</div><h3>Choose your selections</h3></div><span className="range-tag">{available.length} OPEN</span></div>{available.length?available.map(p=><div className="choice-row" key={p.id}><button className={`choice-check ${selected.includes(p.id)?"checked":""}`} onClick={()=>toggle(p.id)}>{selected.includes(p.id)&&<Check size={13}/>}</button><div className="choice-teams"><b>{p.home_team} <span>vs</span> {p.away_team}</b><small>{p.competition} · {p.selection}</small></div><b className="odds-cell">{Number(p.odds).toFixed(2)}</b></div>):<Empty text="No open selections are available."/>}</div><div className="panel slip-panel"><div className="eyebrow">YOUR BET BUILDER</div><h3>Selection slip</h3><div className="slip-count">{selected.length}<span> selections added</span></div>{selected.length?selected.map(p=>{const x=predictions.find(q=>q.id===p);return x?<div className="slip-item" key={p}><div><b>{x.home_team} v {x.away_team}</b><span>{x.selection}</span></div><b>{Number(x.odds).toFixed(2)}</b><button onClick={()=>toggle(p)}><X size={14}/></button></div>:null;}):<div className="slip-empty"><Plus size={19}/><span>Your selected fixtures will appear here.</span></div>}<div className="slip-total"><span>COMBINED DECIMAL ODDS</span><b>{selected.length?odds.toFixed(2):"—"}</b></div><button className="btn-primary full" disabled={!selected.length} onClick={onCopy}><Copy size={15}/> Copy selections</button><p className="risk-note">An accumulator generally requires every selection to win. Adding more legs increases the difficulty of winning the full combination. Odds are indicative and may change.</p></div></div></>;
}
function Statistics({predictions,wins,losses,accuracy}:{predictions:Prediction[];wins:number;losses:number;accuracy:number}) {
  const markets=["Goals","Double Chance","1X2","Other"];
  return <><PageHeading eyebrow="PERFORMANCE INTELLIGENCE" title="Statistics & analysis" description="A transparent breakdown of the prediction record. Pending selections are excluded from accuracy."/><div className="metrics-grid"><Metric label="Overall accuracy" value={`${accuracy}%`} change={`${wins+losses} settled selections`} icon={Target}/><Metric label="Wins" value={String(wins)} change="Correct selections" icon={Trophy}/><Metric label="Losses" value={String(losses)} change="Incorrect selections" icon={Activity} positive={false}/><Metric label="Pending" value={String(predictions.filter(p=>p.status==="pending").length)} change="Not included in accuracy" icon={Clock3} positive={false}/></div><div className="panel market-performance"><div className="panel-heading"><div><div className="eyebrow">MARKET BREAKDOWN</div><h3>Accuracy by market</h3></div></div>{markets.map(m=>{const list=predictions.filter(p=>p.market===m);const a=accuracy(list);return <div className="market-stat" key={m}><div><b>{m}</b><span>{settled(list).length} settled picks</span></div><div className="progress"><i style={{width:`${a}%`}}/></div><strong>{settled(list).length?a+"%":"—"}</strong></div>})}</div><p className="footnote">Percentages are descriptive, not predictive. Always consider the number of settled selections behind each figure. Return on investment cannot be calculated without recorded stakes and settlement prices.</p></>;
}

function Admin({userEmail,onLogin,onLogout,onRefresh,onNotice}:{userEmail:string|null;onLogin:()=>void;onLogout:()=>void;onRefresh:()=>void;onNotice:(s:string)=>void}) {
  const [form,setForm]=useState({home_team:"",away_team:"",competition:"",kickoff_at:"",market:"Goals",selection:"Over 1.5 Goals",odds:"1.50",confidence:"65",analysis:""});
  const [saving,setSaving]=useState(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault();
    if(!supabase){onNotice("Connect Supabase before adding live predictions.");return;}
    setSaving(true);
    const {error}=await supabase.from("predictions").insert({
      home_team:form.home_team,away_team:form.away_team,competition:form.competition,
      kickoff_at:new Date(form.kickoff_at).toISOString(),market:form.market,selection:form.selection,
      odds:Number(form.odds),confidence:Number(form.confidence),analysis:form.analysis,
      status:"pending",is_published:true,published_at:new Date().toISOString()
    });
    setSaving(false);
    if(error) onNotice(error.message); else {onNotice("Prediction published.");setForm({...form,home_team:"",away_team:"",analysis:""});onRefresh();}
  }
  if(!userEmail) return <><PageHeading eyebrow="RESTRICTED AREA" title="Admin workspace" description="Manage predictions, publish selections and maintain your public record."/><div className="panel admin-gate"><div className="gate-icon"><LockKeyhole size={24}/></div><h3>Administrator access required</h3><p>Sign in using an administrator account created in Supabase Authentication. Public visitors cannot publish or settle predictions.</p><button className="btn-primary" onClick={onLogin}>Administrator sign in <ArrowRight size={15}/></button><p className="admin-help">After signing in, your Supabase profile must have the <code>admin</code> role.</p></div></>;
  return <><PageHeading eyebrow="CONTROL ROOM" title="Admin workspace" description={`Signed in as ${userEmail}. Create and publish predictions from here.`} action={<button className="btn-outline" onClick={onLogout}>Sign out</button>}/><div className="admin-grid"><div className="panel admin-form-panel"><div className="panel-heading"><div><div className="eyebrow">PUBLISH A PICK</div><h3>New prediction</h3></div><span className="secure-tag"><LockKeyhole size={13}/> ADMIN</span></div><form onSubmit={submit} className="admin-form"><div className="form-grid"><label>Home team<input required value={form.home_team} onChange={e=>setForm({...form,home_team:e.target.value})}/></label><label>Away team<input required value={form.away_team} onChange={e=>setForm({...form,away_team:e.target.value})}/></label><label>Competition<input required value={form.competition} onChange={e=>setForm({...form,competition:e.target.value})}/></label><label>Kickoff time<input required type="datetime-local" value={form.kickoff_at} onChange={e=>setForm({...form,kickoff_at:e.target.value})}/></label><label>Market<select value={form.market} onChange={e=>setForm({...form,market:e.target.value})}><option>Goals</option><option>Double Chance</option><option>1X2</option><option>Other</option></select></label><label>Selection<input required value={form.selection} onChange={e=>setForm({...form,selection:e.target.value})}/></label><label>Decimal odds<input required type="number" min="1.01" step="0.01" value={form.odds} onChange={e=>setForm({...form,odds:e.target.value})}/></label><label>Confidence (0–100)<input type="number" min="0" max="100" value={form.confidence} onChange={e=>setForm({...form,confidence:e.target.value})}/></label></div><label>Analysis / reasoning<textarea rows={4} value={form.analysis} onChange={e=>setForm({...form,analysis:e.target.value})} placeholder="Explain the reasoning behind this selection..."/></label><button className="btn-primary" disabled={saving}>{saving?"Publishing…":"Publish prediction"} <ArrowRight size={15}/></button></form></div><div className="panel admin-checklist"><div className="eyebrow">ADMIN CHECKLIST</div><h3>Before you publish</h3><div className="checkline"><CheckCircle2/><span>Verify the fixture and kick-off time.</span></div><div className="checkline"><CheckCircle2/><span>Record the odds available at publication.</span></div><div className="checkline"><CheckCircle2/><span>Write a reasoned, honest analysis.</span></div><div className="checkline"><CheckCircle2/><span>Publish before the match begins.</span></div><div className="checkline"><CheckCircle2/><span>Settle every prediction after the match.</span></div><div className="admin-warning"><ShieldCheck size={16}/><span>Never delete losing predictions or edit published odds to improve the historical record. Corrections should be auditable.</span></div></div></div></>;
}

export default App;
