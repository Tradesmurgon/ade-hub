import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Users, Wrench, Package, BarChart3, Printer, Plus,
  X, Smartphone, Search, ChevronRight, Trash2, Clock, CheckCircle2,
  AlertTriangle, DollarSign, Copy, QrCode, Lock, LogOut, ShieldCheck,
  Eye, EyeOff, UserPlus, Timer, FileText
} from "lucide-react";
import {
  supabase,
  fetchAll, fetchProfiles, fetchCompany,
  saveCompanyToDB,
  diffAndSyncJobs, diffAndSyncParts, diffAndSyncClients,
  applySync,
} from "./lib/supabase.js";

/* ── Helpers ──────────────────────────────────────────────── */

const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ============================================================
   SEED DATA — typical manufacturing/multi-trade workshop
   ============================================================ */
const SEED_PARTS = [
  // Welding consumables
  { name: "MIG Wire 0.8mm (5kg spool)",         sku: "MIG-08-5K",   cost: 42.00,  qty: 8,  reorderAt: 3,  supplier: "BOC / Lincoln Electric",  category: "Welding" },
  { name: "MIG Wire 0.9mm (5kg spool)",         sku: "MIG-09-5K",   cost: 44.00,  qty: 6,  reorderAt: 3,  supplier: "BOC / Lincoln Electric",  category: "Welding" },
  { name: "TIG Filler Rod 2.4mm ER70S-2 (5kg)",sku: "TIG-24-5K",   cost: 68.00,  qty: 4,  reorderAt: 2,  supplier: "BOC",                     category: "Welding" },
  { name: "Welding Electrode 3.2mm (5kg)",      sku: "ELEC-32-5K",  cost: 38.00,  qty: 5,  reorderAt: 2,  supplier: "Lincoln Electric",        category: "Welding" },
  { name: "MIG Contact Tips 0.8mm (Pkt 10)",   sku: "TIP-08-10",   cost: 12.50,  qty: 20, reorderAt: 8,  supplier: "BOC",                     category: "Welding" },
  { name: "MIG Contact Tips 0.9mm (Pkt 10)",   sku: "TIP-09-10",   cost: 12.50,  qty: 18, reorderAt: 8,  supplier: "BOC",                     category: "Welding" },
  { name: "MIG Shroud / Nozzle (Pkt 5)",       sku: "NOZZLE-5PK",  cost: 22.00,  qty: 10, reorderAt: 4,  supplier: "BOC",                     category: "Welding" },
  { name: "Argon/CO2 Mix Gas Cylinder (D-size)",sku: "GAS-ARGCO2-D",cost: 145.00, qty: 3,  reorderAt: 1,  supplier: "BOC",                     category: "Welding" },
  { name: "Pure Argon Gas Cylinder (D-size)",  sku: "GAS-ARG-D",   cost: 160.00, qty: 2,  reorderAt: 1,  supplier: "BOC",                     category: "Welding" },
  { name: "Welding Helmet Lens (Clear) Pkt 10",sku: "LENS-CLR-10",  cost: 9.50,   qty: 12, reorderAt: 5,  supplier: "Cigweld",                 category: "Welding" },
  { name: "Welding Helmet Lens (Shade 11) x5", sku: "LENS-SH11-5",  cost: 18.00,  qty: 6,  reorderAt: 3,  supplier: "Cigweld",                 category: "Welding" },
  // Grinding & cutting
  { name: "Grinding Disc 125mm x 6.5mm (Pkt 10)", sku: "GRIND-125-10", cost: 28.00, qty: 15, reorderAt: 6, supplier: "Norton / Pferd",       category: "Abrasives" },
  { name: "Cut-Off Wheel 125mm x 1mm (Pkt 25)",   sku: "CUTOFF-125-25",cost: 32.00, qty: 12, reorderAt: 5, supplier: "Norton / Pferd",       category: "Abrasives" },
  { name: "Flap Disc 125mm 40 Grit (Pkt 10)",     sku: "FLAP-125-40",  cost: 35.00, qty: 10, reorderAt: 4, supplier: "Pferd",                category: "Abrasives" },
  { name: "Flap Disc 125mm 80 Grit (Pkt 10)",     sku: "FLAP-125-80",  cost: 35.00, qty: 10, reorderAt: 4, supplier: "Pferd",                category: "Abrasives" },
  { name: "Wire Cup Brush 115mm",                  sku: "WBRUSH-115",   cost: 18.50, qty: 8,  reorderAt: 3, supplier: "Pferd",                category: "Abrasives" },
  { name: "HSS Drill Bit Set 1–13mm (25pc)",       sku: "DRILL-HSS-25", cost: 55.00, qty: 4,  reorderAt: 2, supplier: "Sutton Tools",         category: "Cutting Tools" },
  { name: "Carbide Hole Saw 20mm",                 sku: "HSAW-20",      cost: 22.00, qty: 5,  reorderAt: 2, supplier: "Sutton Tools",         category: "Cutting Tools" },
  // Laser consumables
  { name: "Laser Focus Lens 1.5\" (F=38.1mm)",  sku: "LASER-LENS-15",cost: 95.00,  qty: 4,  reorderAt: 2,  supplier: "Cloudray / Reci",     category: "Laser" },
  { name: "Laser Nozzle D1.0mm Single (Pkt 5)",sku: "LASER-NOZ-10", cost: 38.00,  qty: 6,  reorderAt: 3,  supplier: "Cloudray",            category: "Laser" },
  { name: "Laser Nozzle D1.5mm Single (Pkt 5)",sku: "LASER-NOZ-15", cost: 38.00,  qty: 6,  reorderAt: 3,  supplier: "Cloudray",            category: "Laser" },
  { name: "Nitrogen Assist Gas Cylinder (G-size)",sku:"GAS-N2-G",    cost: 185.00, qty: 2,  reorderAt: 1,  supplier: "BOC",                 category: "Laser" },
  { name: "Oxygen Assist Gas Cylinder (G-size)", sku: "GAS-O2-G",   cost: 165.00, qty: 2,  reorderAt: 1,  supplier: "BOC",                 category: "Laser" },
  // Electrical
  { name: "Cable Ties 200mm Black (Pkt 100)",   sku: "CTIE-200-100", cost: 8.50,  qty: 20, reorderAt: 5,  supplier: "Cabac / RS Components", category: "Electrical" },
  { name: "Heat Shrink Assortment Pack",         sku: "HSHRINK-ASST", cost: 22.00, qty: 8,  reorderAt: 3,  supplier: "RS Components",        category: "Electrical" },
  { name: "Electrical Insulation Tape (10 roll)",sku: "ETAPE-10",     cost: 14.00, qty: 6,  reorderAt: 2,  supplier: "3M / Cabac",           category: "Electrical" },
  { name: "Crimp Terminal Assortment (500pc)",   sku: "CRIMP-500",    cost: 35.00, qty: 5,  reorderAt: 2,  supplier: "Cabac",                category: "Electrical" },
  { name: "DIN Rail Terminal Block 4mm² (Pkt 50)",sku:"TERM-DIN-50", cost: 28.00, qty: 4,  reorderAt: 2,  supplier: "Wago / Phoenix",       category: "Electrical" },
  { name: "Mini Circuit Breaker 10A 1P",         sku: "MCB-10A-1P",  cost: 18.50, qty: 10, reorderAt: 4,  supplier: "Schneider / ABB",      category: "Electrical" },
  { name: "Mini Circuit Breaker 20A 1P",         sku: "MCB-20A-1P",  cost: 19.50, qty: 8,  reorderAt: 3,  supplier: "Schneider / ABB",      category: "Electrical" },
  { name: "Fuse 10A Automotive (Pkt 10)",        sku: "FUSE-10A-10", cost: 6.50,  qty: 15, reorderAt: 5,  supplier: "Narva",                category: "Electrical" },
  // Diesel / mechanical
  { name: "Engine Oil 15W-40 (20L)",            sku: "OIL-15W40-20", cost: 88.00, qty: 4,  reorderAt: 2,  supplier: "Castrol / Mobil",      category: "Diesel/Mechanical" },
  { name: "Hydraulic Oil ISO 46 (20L)",         sku: "OIL-HYD46-20", cost: 95.00, qty: 3,  reorderAt: 1,  supplier: "Castrol",              category: "Diesel/Mechanical" },
  { name: "Multi-Purpose Grease (500g)",         sku: "GREASE-500",   cost: 18.00, qty: 6,  reorderAt: 2,  supplier: "CRC / Castrol",        category: "Diesel/Mechanical" },
  { name: "Spin-On Oil Filter (Universal)",      sku: "FILT-OIL-UNI", cost: 14.50, qty: 8,  reorderAt: 3,  supplier: "Ryco / Wesfil",       category: "Diesel/Mechanical" },
  { name: "Coolant Concentrate 5L",             sku: "COOLANT-5L",   cost: 32.00, qty: 4,  reorderAt: 2,  supplier: "Nulon / Penrite",      category: "Diesel/Mechanical" },
  { name: "Silicone Gasket Maker RTV (90g)",    sku: "GASKET-RTV",   cost: 12.00, qty: 8,  reorderAt: 3,  supplier: "Permatex",             category: "Diesel/Mechanical" },
  // General workshop consumables
  { name: "WD-40 Lubricant Spray 400g",         sku: "WD40-400",     cost: 9.50,  qty: 12, reorderAt: 4,  supplier: "WD-40",                category: "Workshop General" },
  { name: "CRC Inox Spray 400g",                sku: "INOX-400",     cost: 11.00, qty: 10, reorderAt: 4,  supplier: "CRC",                  category: "Workshop General" },
  { name: "Cutting & Tapping Oil 500ml",        sku: "CUTOIL-500",   cost: 14.50, qty: 6,  reorderAt: 2,  supplier: "Rocol / CRC",          category: "Workshop General" },
  { name: "Anti-Spatter Spray 400g",            sku: "ANTISPAT-400", cost: 10.50, qty: 10, reorderAt: 4,  supplier: "Cigweld",              category: "Workshop General" },
  { name: "Degreaser / Parts Cleaner 5L",       sku: "DEGREASE-5L",  cost: 28.00, qty: 4,  reorderAt: 2,  supplier: "CRC / Chemtech",       category: "Workshop General" },
  { name: "Marking-Out Blue Aerosol 300g",      sku: "MKBLUE-300",   cost: 13.00, qty: 5,  reorderAt: 2,  supplier: "Dykem / Inox",         category: "Workshop General" },
  { name: "Masking Tape 48mm x 50m",            sku: "MTAPE-48-50",  cost: 7.50,  qty: 10, reorderAt: 4,  supplier: "3M / Scotch",          category: "Workshop General" },
  { name: "Workshop Rags / Wiper Roll",         sku: "RAGS-ROLL",    cost: 18.00, qty: 8,  reorderAt: 3,  supplier: "Kimberley-Clark",      category: "Workshop General" },
  { name: "Safety Gloves Leather (Pair)",       sku: "GLOVE-LTH-PR", cost: 14.00, qty: 15, reorderAt: 5,  supplier: "Prochoice / Tuff",     category: "PPE" },
  { name: "Nitrile Disposable Gloves (Box 100)",sku: "GLOVE-NIT-100",cost: 16.00, qty: 10, reorderAt: 4,  supplier: "Ansell",               category: "PPE" },
  { name: "Safety Glasses Clear",               sku: "SAFETY-GLASS", cost: 6.50,  qty: 20, reorderAt: 6,  supplier: "Prochoice",            category: "PPE" },
  { name: "P2 Dust Masks (Box 20)",             sku: "MASK-P2-20",   cost: 28.00, qty: 6,  reorderAt: 2,  supplier: "3M / Prochoice",       category: "PPE" },
  { name: "Ear Plugs Disposable (Box 200)",     sku: "EARPLUG-200",  cost: 18.00, qty: 4,  reorderAt: 2,  supplier: "3M / Prochoice",       category: "PPE" },
  // Fasteners
  { name: "Hex Bolt M8 x 25mm Gr8.8 (Box 100)",sku: "BOLT-M8-25",   cost: 22.00, qty: 5,  reorderAt: 2,  supplier: "Boltmaster / Hafner",  category: "Fasteners" },
  { name: "Hex Bolt M10 x 30mm Gr8.8 (Box 50)",sku: "BOLT-M10-30",  cost: 24.00, qty: 4,  reorderAt: 2,  supplier: "Boltmaster / Hafner",  category: "Fasteners" },
  { name: "Hex Nut M8 (Box 100)",               sku: "NUT-M8-100",   cost: 12.00, qty: 6,  reorderAt: 2,  supplier: "Boltmaster",           category: "Fasteners" },
  { name: "Flat Washer M8 (Box 100)",           sku: "WASH-M8-100",  cost: 9.00,  qty: 6,  reorderAt: 2,  supplier: "Boltmaster",           category: "Fasteners" },
  { name: "Spring Washer M8 (Box 100)",         sku: "SWASH-M8-100", cost: 9.00,  qty: 6,  reorderAt: 2,  supplier: "Boltmaster",           category: "Fasteners" },
  { name: "Self-Tapping Screw 10g x 25mm (Box 100)",sku:"STS-10-25", cost: 11.00, qty: 8,  reorderAt: 3,  supplier: "Boltmaster",           category: "Fasteners" },
  { name: "Pop Rivet 4mm x 10mm (Box 500)",    sku: "RIVET-4-10",   cost: 16.00, qty: 6,  reorderAt: 2,  supplier: "Boltmaster",           category: "Fasteners" },
];

function seedParts() {
  return SEED_PARTS.map((p) => ({
    id: uid("part"),
    name: p.name,
    sku: p.sku,
    cost: p.cost,
    qty: p.qty,
    reorderAt: p.reorderAt,
    supplier: p.supplier,
    category: p.category || "",
  }));
}

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateShort = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");

const PERMISSIONS = [
  { key: "jobs",                label: "Job Cards",               desc: "View and update job cards" },
  { key: "time",                label: "Time Log",                desc: "Log hours against jobs" },
  { key: "parts",               label: "Parts & Consumables",     desc: "View stock and adjust quantities" },
  { key: "inventory",           label: "Inventory",               desc: "View and manage full inventory catalog" },
  { key: "inventory_checklist", label: "Inventory Checklist",     desc: "Complete and submit stock count checklists" },
  { key: "materials",           label: "Add Materials to Jobs",   desc: "Record parts used when logging time" },
  { key: "sds",                 label: "SDS Library",             desc: "View, print and download Safety Data Sheets" },
];

const STATUSES = ["Booked In", "In Progress", "Awaiting Parts", "Ready for Pickup", "Completed"];
const STATUS_COLOR = {
  "Booked In": "#5C6B7A",
  "In Progress": "#C9760C",
  "Awaiting Parts": "#A23B2E",
  "Ready for Pickup": "#1E6E4E",
  "Completed": "#2C2F33",
};
const PRIORITIES = ["Standard", "Urgent", "Hold"];

/* ============================================================
   ROOT APP — Supabase auth + real-time data
   ============================================================ */
export default function WorkshopApp() {
  const [loaded, setLoaded] = useState(false);
  const [clients, setClients] = useState([]);
  const [parts, setParts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* Refs to track previous state for diff-based sync */
  const prevJobs = React.useRef([]);
  const prevParts = React.useRef([]);
  const prevClients = React.useRef([]);
  useEffect(() => { prevJobs.current = jobs; }, [jobs]);
  useEffect(() => { prevParts.current = parts; }, [parts]);
  useEffect(() => { prevClients.current = clients; }, [clients]);

  /* ── Supabase auth listener ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) loadUserAndData(s);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s) loadUserAndData(s);
      else { setSession(null); setLoaded(false); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUserAndData(supaSession) {
    try {
      const [profile, data, profiles] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", supaSession.user.id).single().then(r => r.data),
        fetchAll(),
        fetchProfiles(),
      ]);
      if (!profile) { await supabase.auth.signOut(); setAuthLoading(false); return; }
      setSession({ id: profile.id, name: profile.name, email: profile.email, role: profile.role, permissions: profile.permissions || [], token: supaSession.access_token });
      setJobs(data.jobs); setParts(data.parts); setClients(data.clients);
      setStaffUsers(profiles);
      if (data.parts.length === 0) {
        const seeded = seedParts();
        setParts(seeded);
        const { applySync: sync, partToDb } = await import("./lib/supabase.js");
        await sync("parts", { deleted: [], upserted: seeded.map(partToDb) });
      }
      setLoaded(true);
    } catch (e) {
      console.error("load error", e);
    } finally {
      setAuthLoading(false);
    }
  }

  /* ── Real-time subscriptions + polling fallback ── */
  useEffect(() => {
    if (!loaded) return;
    const reload = async () => {
      const data = await fetchAll();
      setJobs(data.jobs); setParts(data.parts); setClients(data.clients);
    };
    // Supabase realtime (instant updates when Replication is enabled)
    const channel = supabase.channel("ade-hub-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "parts" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfiles().then(setStaffUsers))
      .subscribe();
    // Polling fallback every 15 seconds — catches any updates missed by realtime
    const poll = setInterval(reload, 15000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [loaded]);

  /* ── Persist helpers — diff-based sync to Supabase ── */
  const persistJobs = useCallback((next) => {
    const diff = diffAndSyncJobs(prevJobs.current, next);
    setJobs(next);
    applySync("jobs", diff).catch(console.error);
  }, []);
  const persistParts = useCallback((next) => {
    const diff = diffAndSyncParts(prevParts.current, next);
    setParts(next);
    applySync("parts", diff).catch(console.error);
  }, []);
  const persistClients = useCallback((next) => {
    const diff = diffAndSyncClients(prevClients.current, next);
    setClients(next);
    applySync("clients", diff).catch(console.error);
  }, []);
  const persistStaff = useCallback((next) => {
    setStaffUsers(next); // profiles managed via /api/staff
  }, []);

  if (authLoading) {
    return <Shell><div style={{ padding: 40, textAlign: "center", color: "#9A9D9F" }}>Loading…</div></Shell>;
  }
  if (!session) {
    return <Shell><AuthGate /></Shell>;
  }
  if (!loaded) {
    return <Shell><div style={{ padding: 40, textAlign: "center", color: "#9A9D9F" }}>Loading workshop data…</div></Shell>;
  }

  return (
    <Shell>
      <MainApp
        session={session}
        onLogout={() => supabase.auth.signOut()}
        clients={clients} parts={parts} jobs={jobs} staffUsers={staffUsers}
        persistClients={persistClients} persistParts={persistParts} persistJobs={persistJobs} persistStaff={persistStaff}
      />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#15171A", fontFamily: "Inter, system-ui, sans-serif", color: "#E8E6DF" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .wj-h { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.04em; }
        .wj-btn { font-family: Inter, sans-serif; cursor: pointer; border: none; transition: filter .12s ease, transform .05s ease; }
        .wj-btn:active { transform: scale(0.97); }
        .wj-amber { background: #FF8A1E; color: #1A1300; }
        .wj-amber:hover { filter: brightness(1.08); }
        .wj-ghost { background: transparent; border: 1px solid #3A3D42; color: #E8E6DF; }
        .wj-ghost:hover { border-color: #FF8A1E; color: #FF8A1E; }
        .wj-card { background: #1E2024; border: 1px solid #2C2F33; border-radius: 10px; }
        input, select, textarea { font-family: Inter, sans-serif; background: #15171A; border: 1px solid #3A3D42; color: #E8E6DF; border-radius: 6px; padding: 9px 11px; font-size: 14px; outline: none; width: 100%; }
        input:focus, select:focus, textarea:focus { border-color: #FF8A1E; }
        label { font-size: 12px; color: #9A9D9F; display: block; margin-bottom: 5px; font-weight: 500; }
        ::placeholder { color: #5C6065; }

        /* ── Responsive layout ── */
        .ade-desktop-only { display: flex !important; }
        .ade-mobile-only  { display: none  !important; }
        .ade-sidebar      { display: block !important; }
        .ade-mob-pad      { padding: 24px 28px; }

        @media (max-width: 767px) {
          .ade-desktop-only { display: none  !important; }
          .ade-mobile-only  { display: flex  !important; }
          .ade-sidebar      { display: none  !important; }
          .ade-mob-pad      { padding: 14px 12px 80px; }
          input, select, textarea { font-size: 16px !important; padding: 11px 12px !important; }
          label { font-size: 13px !important; }
        }

        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      {children}
    </div>
  );
}

/* ============================================================
   AUTH
   ============================================================ */
function AuthGate() {
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("loading"); // "loading" | "login" | "setup" | "direct"
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [showSetupPw, setShowSetupPw] = useState(false);

  useEffect(() => {
    fetchProfiles()
      .then((p) => {
        setProfiles(p);
        if (p.length === 0) {
          setMode("setup");
        } else {
          setMode("login");
        }
      })
      .catch(() => {
        // If profiles can't be loaded, fall back to direct email login
        setMode("direct");
      });
  }, []);

  const handleLogin = async () => {
    if (!selectedId) { setError("Select your name."); return; }
    if (!password) { setError("Enter your password."); return; }
    const profile = profiles.find((p) => p.id === selectedId);
    if (!profile) { setError("Account not found."); return; }
    setLoading(true); setError("");
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: profile.email, password });
    setLoading(false);
    if (authErr) setError("Incorrect password. Please try again.");
  };

  const handleDirectLogin = async () => {
    if (!email.trim()) { setError("Enter your email."); return; }
    if (!password) { setError("Enter your password."); return; }
    setLoading(true); setError("");
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authErr) setError("Incorrect email or password.");
  };

  const handleSetup = async () => {
    if (!setupName.trim()) { setError("Enter your name."); return; }
    if (!setupEmail.trim()) { setError("Enter your email address."); return; }
    if (setupPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      const { data, error: signupErr } = await supabase.auth.signUp({
        email: setupEmail.trim(),
        password: setupPassword,
      });
      if (signupErr) { setError(signupErr.message); setLoading(false); return; }
      if (!data?.user) { setError("Signup failed — please try again."); setLoading(false); return; }
      const { error: profileErr } = await supabase.rpc("create_owner_profile", {
        user_id: data.user.id,
        user_name: setupName.trim(),
        user_email: setupEmail.trim(),
      });
      if (profileErr) { setError("Profile error: " + profileErr.message); setLoading(false); return; }
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: setupEmail.trim(),
        password: setupPassword,
      });
      if (loginErr) { setError("Account created — please sign in."); setLoading(false); }
    } catch (e) {
      setError("Unexpected error: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="wj-card" style={{ width: 380, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, background: "#FF8A1E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={18} color="#1A1300" />
          </div>
          <div className="wj-h" style={{ fontSize: 18, fontWeight: 700 }}>ADE Hub</div>
        </div>

        {mode === "loading" && (
          <div style={{ textAlign: "center", color: "#9A9D9F", fontSize: 13.5, padding: "20px 0" }}>Loading…</div>
        )}

        {mode === "login" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>Sign in</div>
            <div style={{ marginBottom: 12 }}>
              <label>Who are you?</label>
              <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setError(""); }}>
                <option value="">Select your name…</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Password</label>
              <PasswordInput value={password} onChange={setPassword} show={showPw} setShow={setShowPw} onEnter={handleLogin} />
            </div>
            {error && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button className="wj-btn wj-amber" style={{ width: "100%", padding: "11px 0", borderRadius: 6, fontWeight: 700, fontSize: 13.5 }} onClick={handleLogin} disabled={loading}>
              <Lock size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button className="wj-btn" onClick={() => setMode("direct")} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 6, fontSize: 12, background: "transparent", color: "#5C6065" }}>
              Sign in with email instead
            </button>
          </>
        )}

        {mode === "direct" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18 }}>Sign in with email</div>
            <div style={{ marginBottom: 12 }}>
              <label>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Password</label>
              <PasswordInput value={password} onChange={setPassword} show={showPw} setShow={setShowPw} onEnter={handleDirectLogin} />
            </div>
            {error && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button className="wj-btn wj-amber" style={{ width: "100%", padding: "11px 0", borderRadius: 6, fontWeight: 700, fontSize: 13.5 }} onClick={handleDirectLogin} disabled={loading}>
              <Lock size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
              {loading ? "Signing in…" : "Sign in"}
            </button>
            {profiles.length > 0 && (
              <button className="wj-btn" onClick={() => setMode("login")} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 6, fontSize: 12, background: "transparent", color: "#5C6065" }}>
                ← Back to name selection
              </button>
            )}
          </>
        )}

        {mode === "setup" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <ShieldCheck size={15} color="#FF8A1E" />
              <div style={{ fontSize: 13, fontWeight: 700 }}>Create the owner account</div>
            </div>
            <div style={{ fontSize: 12.5, color: "#9A9D9F", marginBottom: 18, lineHeight: 1.5 }}>
              First-time setup. Create the owner login — full access to everything.
            </div>
            <div style={{ marginBottom: 12 }}><label>Your name</label><input value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="e.g. Don" /></div>
            <div style={{ marginBottom: 12 }}><label>Email address</label><input type="email" value={setupEmail} onChange={(e) => setSetupEmail(e.target.value)} placeholder="you@example.com.au" /></div>
            <div style={{ marginBottom: 16 }}>
              <label>Password (min 6 characters)</label>
              <PasswordInput value={setupPassword} onChange={setSetupPassword} show={showSetupPw} setShow={setShowSetupPw} onEnter={handleSetup} />
            </div>
            {error && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
            <button className="wj-btn wj-amber" style={{ width: "100%", padding: "11px 0", borderRadius: 6, fontWeight: 700, fontSize: 13.5 }} onClick={handleSetup} disabled={loading}>
              {loading ? "Creating…" : "Create owner account"}
            </button>
            <button className="wj-btn" onClick={() => setMode("direct")} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 6, fontSize: 12, background: "transparent", color: "#5C6065" }}>
              Already have an account? Sign in with email
            </button>
          </>
        )}

        <div style={{ fontSize: 11, color: "#5C6065", marginTop: 18, lineHeight: 1.5 }}>
          Staff accounts are created by the owner from inside the app.
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, show, setShow, onEnter }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        style={{ paddingRight: 36 }}
      />
      <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 8, top: 8, background: "transparent", border: "none", color: "#5C6065", cursor: "pointer" }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

/* ============================================================
   MAIN APP (post-login, role-gated)
   ============================================================ */
function MainApp({ session, onLogout, clients, parts, jobs, staffUsers, persistClients, persistParts, persistJobs, persistStaff }) {
  const isOwner = session.role === "owner";
  const can = (key) => isOwner || (session.permissions || []).includes(key);
  const [tab, setTab] = useState(isOwner ? "dashboard" : (can("jobs") ? "jobs" : can("time") ? "time" : can("parts") ? "parts" : "none"));
  const [printJob, setPrintJob] = useState(null);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  // Company settings — global, used by Dashboard and SDS prints
  const [company, setCompany] = useState({ name: "ADE Multi Trade Services", address: "", suburb: "", phone: "", abn: "", email: "" });
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchCompany();
        if (res && res.name) setCompany(res);
      } catch {}
    })();
  }, []);
  const saveCompany = async (data) => {
    setCompany(data);
    try { await saveCompanyToDB(data); } catch {}
  };

  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);
  const partById = useMemo(() => Object.fromEntries(parts.map((p) => [p.id, p])), [parts]);

  const jobCost = useCallback((job) => {
    const partsCost = (job.partsUsed || []).reduce((sum, pu) => {
      const part = partById[pu.partId];
      if (!part) return sum;
      const unitPrice = Number(part.unitsPerBox) > 1 ? Number(part.cost) / Number(part.unitsPerBox) : Number(part.cost);
      return sum + unitPrice * pu.qty;
    }, 0);
    const laborCost = (Number(job.laborHours) || 0) * (Number(job.laborRate) || 0);
    return { partsCost, laborCost, total: partsCost + laborCost };
  }, [partById]);

  const ownerTabs = [
    { key: "dashboard",           label: "Dashboard",             icon: LayoutDashboard },
    { key: "jobs",                label: "Job Cards",             icon: Wrench },
    { key: "clients",             label: "Clients",               icon: Users },
    { key: "parts",               label: "Parts & Consumables",   icon: Package },
    { key: "inventory",           label: "Inventory",             icon: Package },
    { key: "inv_checklist",       label: "Inv. Checklist",        icon: CheckCircle2 },
    { key: "sds",                 label: "SDS Library",           icon: FileText },
    { key: "analytics",           label: "Analytics",             icon: BarChart3 },
    { key: "staff",               label: "Staff Access",          icon: ShieldCheck },
  ];
  const staffTabOptions = [
    { key: "jobs",          label: "Job Cards",           icon: Wrench,        permission: "jobs" },
    { key: "time",          label: "Time Log",            icon: Timer,         permission: "time" },
    { key: "parts",         label: "Parts & Consumables", icon: Package,       permission: "parts" },
    { key: "inventory",     label: "Inventory",           icon: Package,       permission: "inventory" },
    { key: "inv_checklist", label: "Inv. Checklist",      icon: CheckCircle2,  permission: "inventory_checklist" },
    { key: "sds",           label: "SDS Library",         icon: FileText,      permission: "sds" },
  ];
  const navTabs = isOwner ? ownerTabs : staffTabOptions.filter((t) => can(t.permission));

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Top bar ── */}
      <div style={{ borderBottom: "1px solid #2C2F33", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#15171A", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: "#FF8A1E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Wrench size={16} color="#1A1300" />
          </div>
          <div className="wj-h ade-desktop-only" style={{ fontSize: 17, fontWeight: 700, alignItems: "center" }}>ADE Hub</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{session.name}</div>
            <div className="ade-desktop-only" style={{ fontSize: 10, color: isOwner ? "#FF8A1E" : "#9A9D9F", fontWeight: 600, textTransform: "uppercase" }}>{isOwner ? "Owner" : "Staff"}</div>
          </div>
          {isOwner && (
            <button className="wj-btn wj-ghost ade-desktop-only" style={{ padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, alignItems: "center", gap: 5 }} onClick={() => setShowMobileInfo(true)}>
              <Smartphone size={13} /> Staff access
            </button>
          )}
          <button className="wj-btn wj-ghost" style={{ padding: "8px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5, fontSize: 12 }} onClick={onLogout}>
            <LogOut size={14} />
            <span className="ade-desktop-only" style={{ alignItems: "center" }}>Sign out</span>
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "flex" }}>

        {/* Desktop sidebar — hidden on mobile via CSS */}
        <div className="ade-sidebar" style={{ width: 188, borderRight: "1px solid #2C2F33", padding: "16px 10px", flexShrink: 0, minHeight: "calc(100vh - 57px)", background: "#15171A" }}>
          {navTabs.map((t) => <NavItem key={t.key} icon={t.icon} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />)}
        </div>

        {/* Content area */}
        <div className="ade-mob-pad" style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
          {isOwner && tab === "dashboard" && <Dashboard jobs={jobs} clients={clients} clientById={clientById} jobCost={jobCost} setTab={setTab} company={company} saveCompany={saveCompany} />}
          {tab === "jobs" && can("jobs") && (
            <Jobs
              isOwner={isOwner} session={session}
              jobs={jobs} clients={clients} parts={parts} clientById={clientById} partById={partById}
              persistJobs={persistJobs} jobCost={jobCost} setPrintJob={setPrintJob} staffUsers={staffUsers}
            />
          )}
          {isOwner && tab === "clients" && <Clients clients={clients} jobs={jobs} persistClients={persistClients} />}
          {tab === "parts" && can("parts") && <Parts isOwner={isOwner} parts={parts} persistParts={persistParts} />}
          {tab === "inventory" && can("inventory") && <Inventory isOwner={isOwner} parts={parts} persistParts={persistParts} jobs={jobs} />}
          {tab === "inv_checklist" && can("inventory_checklist") && <InventoryChecklist parts={parts} persistParts={persistParts} session={session} isOwner={isOwner} />}
          {isOwner && tab === "analytics" && <Analytics jobs={jobs} clients={clients} clientById={clientById} jobCost={jobCost} />}
          {tab === "sds" && can("sds") && <SDSLibrary parts={parts} company={company} />}
          {isOwner && tab === "staff" && <StaffAccess staffUsers={staffUsers} persistStaff={persistStaff} session={session} jobs={jobs} persistJobs={persistJobs} />}
          {!isOwner && tab === "time" && can("time") && <TimeLog jobs={jobs} parts={can("materials") ? parts : []} clientById={clientById} persistJobs={persistJobs} session={session} />}
          {tab === "none" && (
            <div className="wj-card" style={{ padding: 32, textAlign: "center", color: "#9A9D9F" }}>
              <Lock size={28} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>No modules assigned yet. Contact the owner.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav — hidden on desktop via CSS ── */}
      <div className="ade-mobile-only" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1E2024", borderTop: "1px solid #2C2F33", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {navTabs.slice(0, 5).map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} className="wj-btn" onClick={() => setTab(t.key)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 4px 8px", background: "transparent", color: active ? "#FF8A1E" : "#5C6065", gap: 3 }}>
              <Icon size={22} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, lineHeight: 1 }}>{t.label.split(" ")[0]}</span>
            </button>
          );
        })}
        {navTabs.length > 5 && <MobileMoreMenu tabs={navTabs.slice(5)} activeTab={tab} setTab={setTab} />}
      </div>

      {printJob && <PrintCard job={printJob} client={clientById[printJob.clientId]} partById={partById} jobCost={jobCost} onClose={() => setPrintJob(null)} showCost={isOwner} />}
      {showMobileInfo && <MobileInfoModal onClose={() => setShowMobileInfo(false)} />}
    </div>
  );
}

function MobileMoreMenu({ tabs, activeTab, setTab }) {
  const [open, setOpen] = useState(false);
  const hasActive = tabs.some((t) => t.key === activeTab);
  return (
    <>
      <button
        className="wj-btn"
        onClick={() => setOpen(!open)}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 4px 8px", background: "transparent", color: hasActive ? "#FF8A1E" : "#5C6065", gap: 4 }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>⋯</span>
        <span style={{ fontSize: 9.5, fontWeight: hasActive ? 700 : 500, lineHeight: 1 }}>More</span>
      </button>
      {open && (
        <div style={{ position: "fixed", bottom: 70, right: 0, background: "#1E2024", border: "1px solid #2C2F33", borderRadius: "10px 10px 0 0", minWidth: 180, zIndex: 60, paddingBottom: 8 }}>
          <div style={{ padding: "12px 16px 8px", fontSize: 11, color: "#5C6065", textTransform: "uppercase", letterSpacing: "0.05em" }}>More</div>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button key={t.key} className="wj-btn" onClick={() => { setTab(t.key); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: active ? "rgba(255,138,30,0.1)" : "transparent", color: active ? "#FF8A1E" : "#C7C5BE", fontSize: 14, fontWeight: active ? 700 : 500, textAlign: "left" }}>
                <Icon size={17} /> {t.label}
              </button>
            );
          })}
          <button className="wj-btn" onClick={() => setOpen(false)} style={{ width: "100%", padding: "10px 16px", background: "transparent", color: "#5C6065", fontSize: 13, textAlign: "left" }}>✕ Close</button>
        </div>
      )}
      {open && <div style={{ position: "fixed", inset: 0, zIndex: 55 }} onClick={() => setOpen(false)} />}
    </>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      className="wj-btn"
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        marginBottom: 4, borderRadius: 7, background: active ? "#FF8A1E" : "transparent",
        color: active ? "#1A1300" : "#C7C5BE", fontSize: 13.5, fontWeight: active ? 700 : 500, textAlign: "left",
      }}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
      <div className="wj-h" style={{ fontSize: 22, fontWeight: 600 }}>{title}</div>
      {action}
    </div>
  );
}
function IconBtn({ children, onClick, title }) {
  return (
    <button className="wj-btn wj-ghost" title={title} onClick={onClick} style={{ width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );
}
function Empty({ text }) {
  return <div className="wj-card" style={{ padding: 26, textAlign: "center", color: "#9A9D9F", fontSize: 13.5 }}>{text}</div>;
}

/* ============================================================
   DASHBOARD (owner only)
   ============================================================ */
function Dashboard({ jobs, clients, clientById, jobCost, setTab, company, saveCompany }) {
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const active = jobs.filter((j) => j.status !== "Completed");
  const awaitingParts = jobs.filter((j) => j.status === "Awaiting Parts").length;
  const readyForPickup = jobs.filter((j) => j.status === "Ready for Pickup").length;
  const monthRevenue = jobs
    .filter((j) => j.status === "Completed" && j.completedAt && new Date(j.completedAt).getMonth() === new Date().getMonth())
    .reduce((s, j) => s + jobCost(j).total, 0);

  return (
    <div>
      <SectionHeader title="Dashboard" />

      {/* Company details card */}
      <div className="wj-card" style={{ padding: 16, marginBottom: 22, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
          <div style={{ width: 6, height: 44, background: "#FF8A1E", borderRadius: 2, flexShrink: 0 }} />
          <div>
            <div className="wj-h" style={{ fontSize: 16, fontWeight: 700 }}>{company.name || "Your business name"}</div>
            <div style={{ fontSize: 12.5, color: "#9A9D9F", marginTop: 2 }}>
              {[company.address, company.suburb].filter(Boolean).join(", ") || "No address set"}
            </div>
            <div style={{ fontSize: 12, color: "#9A9D9F", marginTop: 1 }}>
              {company.phone && <span>Ph: {company.phone}</span>}
              {company.phone && company.email ? " · " : ""}
              {company.email && <span>{company.email}</span>}
              {company.abn && <span style={{ marginLeft: company.phone || company.email ? 10 : 0 }}>ABN: {company.abn}</span>}
            </div>
          </div>
        </div>
        <button
          className="wj-btn wj-ghost"
          style={{ padding: "8px 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          onClick={() => setShowCompanySettings(true)}
        >
          ⚙ Edit company details
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 26 }}>
        <Stat label="Active jobs" value={active.length} icon={Wrench} />
        <Stat label="Awaiting parts" value={awaitingParts} icon={AlertTriangle} accent="#A23B2E" />
        <Stat label="Ready for pickup" value={readyForPickup} icon={CheckCircle2} accent="#1E6E4E" />
        <Stat label="Completed this month" value={money(monthRevenue)} icon={DollarSign} accent="#FF8A1E" />
      </div>
      <div className="wj-h" style={{ fontSize: 15, marginBottom: 10, color: "#9A9D9F" }}>Active job board</div>
      {active.length === 0 ? <Empty text="No active jobs." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {active.slice(0, 9).map((j) => (
            <div key={j.id} className="wj-card" style={{ padding: 14, cursor: "pointer" }} onClick={() => setTab("jobs")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#9A9D9F" }}>{j.jobNumber}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: STATUS_COLOR[j.status], color: "#fff" }}>{j.status}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{j.title}</div>
              <div style={{ fontSize: 12.5, color: "#9A9D9F" }}>{clientById[j.clientId]?.name || "No client"}</div>
              {(Array.isArray(j.assignedTo) ? j.assignedTo : j.assignedTo ? [j.assignedTo] : []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                  {(Array.isArray(j.assignedTo) ? j.assignedTo : [j.assignedTo]).map((name) => (
                    <span key={name} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 20, background: "#2C2F33", color: "#C7C5BE", border: "1px solid #3A3D42" }}>{name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showCompanySettings && (
        <CompanySettingsModal
          company={company}
          onSave={(data) => { saveCompany(data); setShowCompanySettings(false); }}
          onClose={() => setShowCompanySettings(false)}
        />
      )}
    </div>
  );
}
function Stat({ label, value, icon: Icon, accent = "#E8E6DF" }) {
  return (
    <div className="wj-card" style={{ padding: "16px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#9A9D9F", fontWeight: 500 }}>{label}</span>
        <Icon size={16} color={accent} />
      </div>
      <div className="wj-h" style={{ fontSize: 24, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  );
}

/* ============================================================
   JOBS (role-aware: staff cannot see cost figures or pricing fields)
   ============================================================ */
function Jobs({ isOwner, session, jobs, clients, parts, clientById, partById, persistJobs, jobCost, setPrintJob, staffUsers }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filtered = jobs.filter((j) => {
    const matchStatus = filter === "All" || j.status === filter;
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.jobNumber.toLowerCase().includes(search.toLowerCase()) || (clientById[j.clientId]?.name || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const saveJob = (job) => {
    persistJobs(editing ? jobs.map((j) => (j.id === job.id ? job : j)) : [...jobs, job]);
    setShowForm(false);
    setEditing(null);
  };
  const removeJob = (id) => { persistJobs(jobs.filter((j) => j.id !== id)); setConfirmDeleteId(null); };
  const setStatus = (id, status) => {
    persistJobs(jobs.map((j) => (j.id === id ? { ...j, status, completedAt: status === "Completed" ? new Date().toISOString() : j.completedAt } : j)));
  };

  return (
    <div>
      <SectionHeader
        title="Job cards"
        action={
          <button className="wj-btn wj-amber" style={{ padding: "9px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }} onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={15} /> New job
          </button>
        }
      />
      {!isOwner && (
        <div style={{ fontSize: 12, color: "#9A9D9F", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={12} /> Pricing and job costing are only visible to the owner account.
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#5C6065" }} />
          <input style={{ paddingLeft: 30 }} placeholder="Search job number, title, client" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={{ width: 170 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <Empty text="No jobs match. Create a new job card to get started." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((j) => {
            const cost = jobCost(j);
            return (
              <div key={j.id} className="wj-card" style={{ padding: 14 }}>
                {/* Top row: job number + priority + actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11.5, color: "#9A9D9F" }}>{j.jobNumber}</span>
                      {j.priority === "Urgent" && <span style={{ fontSize: 10, fontWeight: 700, color: "#A23B2E" }}>URGENT</span>}
                      <span className="ade-desktop-only" style={{ fontSize: 11.5, color: "#9A9D9F", alignItems: "center" }}>{dateShort(j.createdAt)}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{j.title}</div>
                    <div style={{ fontSize: 12.5, color: "#9A9D9F", marginTop: 2 }}>{clientById[j.clientId]?.name || "No client"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <IconBtn onClick={() => setPrintJob(j)} title="Print"><Printer size={14} /></IconBtn>
                    <IconBtn onClick={() => { setEditing(j); setShowForm(true); }} title="Edit"><ChevronRight size={14} /></IconBtn>
                    {isOwner && (
                      confirmDeleteId === j.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button className="wj-btn" onClick={() => removeJob(j.id)} style={{ background: "#A23B2E", color: "#fff", padding: "4px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>Yes</button>
                          <button className="wj-btn wj-ghost" onClick={() => setConfirmDeleteId(null)} style={{ padding: "4px 6px", borderRadius: 5, fontSize: 11 }}>No</button>
                        </div>
                      ) : (
                        <IconBtn onClick={() => setConfirmDeleteId(j.id)} title="Delete"><Trash2 size={14} /></IconBtn>
                      )
                    )}
                  </div>
                </div>
                {/* Assigned staff tags */}
                {(j.assignedTo || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    {(Array.isArray(j.assignedTo) ? j.assignedTo : [j.assignedTo]).map((name) => (
                      <span key={name} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: "#2C2F33", color: "#C7C5BE", border: "1px solid #3A3D42" }}>{name}</span>
                    ))}
                  </div>
                )}
                {/* Bottom row: status + cost */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <select value={j.status} onChange={(e) => setStatus(j.id, e.target.value)}
                    style={{ fontSize: 12.5, fontWeight: 600, color: STATUS_COLOR[j.status], borderColor: STATUS_COLOR[j.status], flex: 1, minWidth: 140 }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {isOwner && <div style={{ fontSize: 13, color: "#C7C5BE", fontWeight: 600 }}>{money(cost.total)}</div>}
                  <div className="ade-mobile-only" style={{ fontSize: 11.5, color: "#9A9D9F", marginLeft: "auto" }}>{dateShort(j.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <JobForm
          isOwner={isOwner} session={session}
          job={editing} clients={clients} parts={parts} jobs={jobs} staffUsers={staffUsers}
          onSave={saveJob} onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function JobForm({ isOwner, session, job, clients, parts, jobs, staffUsers, onSave, onClose }) {
  const normaliseAssignedTo = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [val]; // legacy string → array
  };

  const [form, setForm] = useState(job ? {
    ...job,
    assignedTo: normaliseAssignedTo(job.assignedTo),
  } : {
    id: uid("job"),
    jobNumber: `JOB-${String(jobs.length + 1).padStart(4, "0")}`,
    clientId: clients[0]?.id || "",
    title: "",
    description: "",
    status: "Booked In",
    priority: "Standard",
    assignedTo: session.role === "staff" ? [session.name] : [],
    laborHours: 0,
    laborRate: 95,
    partsUsed: [],
    timeEntries: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
  });

  const addPart = () => {
    if (parts.length === 0) return;
    setForm({ ...form, partsUsed: [...form.partsUsed, { partId: parts[0].id, qty: 1 }] });
  };
  const [formError, setFormError] = useState("");
  const updatePart = (idx, field, value) => {
    const next = [...form.partsUsed];
    next[idx] = { ...next[idx], [field]: field === "qty" ? Number(value) : value };
    setForm({ ...form, partsUsed: next });
  };
  const removePart = (idx) => setForm({ ...form, partsUsed: form.partsUsed.filter((_, i) => i !== idx) });

  return (
    <Modal onClose={onClose} title={job ? "Edit job card" : "New job card"} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label>Job number</label>
          <input value={form.jobNumber} disabled={!isOwner} onChange={(e) => setForm({ ...form, jobNumber: e.target.value })} />
        </div>
        <div>
          <label>Client</label>
          <select value={form.clientId} disabled={!isOwner} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Select client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label>Job title</label>
        <input disabled={!isOwner} placeholder="e.g. Dual saw CNC — VSD fault diagnosis" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label>Job description / fault reported</label>
        <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>Priority</label>
          <select value={form.priority} disabled={!isOwner} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>Assigned staff</label>
          <div style={{ border: "1px solid #3A3D42", borderRadius: 6, padding: "8px 10px", background: "#15171A", minHeight: 42 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: (staffUsers || []).length ? 8 : 0 }}>
              {(form.assignedTo || []).map((name) => (
                <span key={name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#FF8A1E", color: "#1A1300" }}>
                  {name}
                  <span
                    onClick={() => setForm({ ...form, assignedTo: (form.assignedTo || []).filter((n) => n !== name) })}
                    style={{ cursor: "pointer", fontWeight: 900, fontSize: 13, lineHeight: 1, marginLeft: 2 }}
                  >×</span>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                if ((form.assignedTo || []).includes(e.target.value)) return;
                setForm({ ...form, assignedTo: [...(form.assignedTo || []), e.target.value] });
              }}
              style={{ background: "transparent", border: "none", color: "#9A9D9F", fontSize: 13, padding: "0", width: "100%", outline: "none" }}
            >
              <option value="">+ Add staff member…</option>
              {(staffUsers || []).filter((u) => !(form.assignedTo || []).includes(u.name)).map((u) => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isOwner && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div>
            <label>Labor hours</label>
            <input type="number" step="0.25" min="0" value={form.laborHours} onChange={(e) => setForm({ ...form, laborHours: e.target.value })} />
          </div>
          <div>
            <label>Labor rate ($/hr)</label>
            <input type="number" step="1" min="0" value={form.laborRate} onChange={(e) => setForm({ ...form, laborRate: e.target.value })} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ marginBottom: 0 }}>Parts & Consumables used</label>
      </div>

      {/* Category cascade picker */}
      <PartPicker parts={parts} isOwner={isOwner} partsUsed={form.partsUsed} onAdd={(partId) => {
        const existing = form.partsUsed.findIndex((p) => p.partId === partId);
        if (existing >= 0) {
          const next = [...form.partsUsed];
          next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
          setForm({ ...form, partsUsed: next });
        } else {
          setForm({ ...form, partsUsed: [...form.partsUsed, { partId, qty: 1 }] });
        }
      }} />

      {/* Selected parts list */}
      {form.partsUsed.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#9A9D9F", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Added to this job</div>
          {form.partsUsed.map((pu, idx) => {
            const part = parts.find((p) => p.id === pu.partId);
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "#15171A", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{part?.name || "Unknown"}</div>
                {isOwner && <div style={{ fontSize: 12, color: "#9A9D9F", whiteSpace: "nowrap" }}>{part ? money((Number(part.unitsPerBox) > 1 ? Number(part.cost) / Number(part.unitsPerBox) : Number(part.cost)) * pu.qty) : ""}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button className="wj-btn wj-ghost" style={{ width: 24, height: 24, borderRadius: 4, fontSize: 14 }} onClick={() => updatePart(idx, "qty", Math.max(1, pu.qty - 1))}>−</button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 20, textAlign: "center" }}>{pu.qty}</span>
                  <button className="wj-btn wj-ghost" style={{ width: 24, height: 24, borderRadius: 4, fontSize: 14 }} onClick={() => updatePart(idx, "qty", pu.qty + 1)}>+</button>
                </div>
                <IconBtn onClick={() => removePart(idx)} title="Remove"><X size={14} /></IconBtn>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end", alignItems: "center" }}>
        {formError && <span style={{ fontSize: 12.5, color: "#D9695A", flex: 1 }}>{formError}</span>}
        <button className="wj-btn wj-ghost" style={{ padding: "10px 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 600 }} onClick={onClose}>Cancel</button>
        <button className="wj-btn wj-amber" style={{ padding: "10px 20px", borderRadius: 6, fontSize: 13.5, fontWeight: 700 }} onClick={() => { if (!form.title.trim()) { setFormError("Give the job a title."); return; } onSave(form); }}>
          Save job card
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- part picker — category cascade ---------------- */
function PartPicker({ parts, isOwner, partsUsed, onAdd }) {
  const [openCat, setOpenCat] = useState(null);

  const addedIds = new Set(partsUsed.map((p) => p.partId));

  const grouped = PART_CATEGORIES.map((cat) => ({
    ...cat,
    items: parts.filter((p) => resolveCategory(p) === cat.key),
  })).filter((cat) => cat.items.length > 0);

  // Anything that doesn't resolve to a known category
  const knownKeys = new Set(PART_CATEGORIES.map((c) => c.key));
  const otherItems = parts.filter((p) => !knownKeys.has(resolveCategory(p)));
  if (otherItems.length > 0) grouped.push({ key: "Other", label: "Other", icon: "📦", items: otherItems });

  if (parts.length === 0) {
    return <div style={{ fontSize: 12.5, color: "#5C6065", marginBottom: 8 }}>No parts in the catalog yet.</div>;
  }

  return (
    <div style={{ border: "1px solid #3A3D42", borderRadius: 7, overflow: "hidden", marginBottom: 4 }}>
      {/* Category row buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, background: "#15171A", borderBottom: openCat ? "1px solid #2C2F33" : "none" }}>
        {grouped.map((cat) => (
          <button
            key={cat.key}
            className="wj-btn"
            onClick={() => setOpenCat(openCat === cat.key ? null : cat.key)}
            style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
              background: openCat === cat.key ? "#FF8A1E" : "#2C2F33",
              color: openCat === cat.key ? "#1A1300" : "#C7C5BE",
              border: "1px solid",
              borderColor: openCat === cat.key ? "#FF8A1E" : "#3A3D42",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <span>{cat.icon}</span> {cat.label}
            <span style={{ fontSize: 11, opacity: 0.7 }}>({cat.items.length})</span>
          </button>
        ))}
      </div>

      {/* Expanded category items */}
      {openCat && (() => {
        const cat = grouped.find((c) => c.key === openCat);
        if (!cat) return null;
        return (
          <div style={{ background: "#1A1D20", maxHeight: 240, overflowY: "auto" }}>
            {cat.items.map((p, idx) => {
              const already = addedIds.has(p.id);
              const hasUnits = Number(p.unitsPerBox) > 1;
              // Strip "(Box X)" or "(Pack X)" from name for staff display
              const displayName = p.name.replace(/\s*\((?:box|pack|pkt|bag|tin|can|roll|tube|set|kit)\s*\d+[^)]*\)/gi, "").trim();
              const unitLabel = p.unitName || "unit";
              const unitCost = hasUnits ? Number(p.cost) / Number(p.unitsPerBox) : Number(p.cost);
              return (
                <div
                  key={p.id}
                  onClick={() => onAdd(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    cursor: "pointer", borderBottom: idx < cat.items.length - 1 ? "1px solid #22252A" : "none",
                    background: already ? "rgba(255,138,30,0.07)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!already) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = already ? "rgba(255,138,30,0.07)" : "transparent"; }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: "#9A9D9F" }}>
                      {hasUnits ? `Add individual ${unitLabel}s` : (p.sku || p.supplier || "")}
                    </div>
                  </div>
                  {isOwner && (
                    <div style={{ fontSize: 12, color: "#9A9D9F", whiteSpace: "nowrap", textAlign: "right" }}>
                      {hasUnits ? (
                        <>
                          <div>{money(unitCost)}/{unitLabel}</div>
                          <div style={{ fontSize: 10.5 }}>{money(p.cost)}/box</div>
                        </>
                      ) : money(p.cost)}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    background: already ? "#FF8A1E" : "#2C2F33",
                    color: already ? "#1A1300" : "#9A9D9F",
                    whiteSpace: "nowrap",
                  }}>
                    {already ? `✓ Added` : `+ Add ${unitLabel}`}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {!openCat && (
        <div style={{ padding: "8px 12px", fontSize: 12, color: "#5C6065", background: "#1A1D20" }}>
          Select a category above to browse and add items.
        </div>
      )}
    </div>
  );
}

/* ---------------- printable job card ---------------- */
function PrintCard({ job, client, partById, jobCost, onClose, showCost }) {
  const cost = jobCost(job);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", color: "#1A1A1A", width: 480, maxHeight: "90vh", overflow: "auto", borderRadius: 4, position: "relative" }} id="print-area">
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }} className="no-print">
          <button className="wj-btn" style={{ background: "#FF8A1E", color: "#1A1300", padding: "7px 14px", borderRadius: 6, fontWeight: 700, fontSize: 12.5, display: "flex", gap: 6, alignItems: "center" }} onClick={() => window.print()}>
            <Printer size={13} /> Print
          </button>
          <button className="wj-btn" style={{ background: "#EAE8E1", padding: "7px 10px", borderRadius: 6 }} onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: "30px 28px 28px", fontFamily: "Inter, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1A1A1A", paddingBottom: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "0.03em" }}>JOB CARD</div>
              <div style={{ fontSize: 12, color: "#666" }}>Workshop Floor — multi trade services</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#666" }}>JOB NO.</div>
              <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 18, fontWeight: 700 }}>{job.jobNumber}</div>
            </div>
          </div>

          <Row label="Client" value={client?.name || "—"} />
          <Row label="Phone" value={client?.phone || "—"} />
          <Row label="Address" value={client?.address || "—"} />
          <div style={{ height: 8 }} />
          <Row label="Job title" value={job.title} bold />
          <div style={{ marginTop: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Description / fault reported</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, border: "1px solid #ddd", borderRadius: 4, padding: 10, minHeight: 50 }}>{job.description || "—"}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14, fontSize: 12.5 }}>
            <div><div style={{ color: "#666", fontSize: 10.5, textTransform: "uppercase" }}>Status</div><div style={{ fontWeight: 700 }}>{job.status}</div></div>
            <div><div style={{ color: "#666", fontSize: 10.5, textTransform: "uppercase" }}>Priority</div><div style={{ fontWeight: 700 }}>{job.priority}</div></div>
            <div><div style={{ color: "#666", fontSize: 10.5, textTransform: "uppercase" }}>Assigned to</div><div style={{ fontWeight: 700 }}>{Array.isArray(job.assignedTo) ? (job.assignedTo.length ? job.assignedTo.join(", ") : "Unassigned") : (job.assignedTo || "Unassigned")}</div></div>
          </div>

          <div style={{ fontSize: 10.5, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, borderTop: "1px dashed #999", paddingTop: 12 }}>Parts & consumables</div>
          {job.partsUsed.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#888", marginBottom: 12 }}>None recorded</div>
          ) : (
            <table style={{ width: "100%", fontSize: 12.5, marginBottom: 12, borderCollapse: "collapse" }}>
              <tbody>
                {job.partsUsed.map((pu, i) => {
                  const part = partById[pu.partId];
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "4px 0" }}>{part?.name || "Unknown part"}</td>
                      <td style={{ padding: "4px 0", textAlign: "center", width: 50 }}>x{pu.qty}</td>
                      {showCost && <td style={{ padding: "4px 0", textAlign: "right", width: 70 }}>{part ? money((Number(part.unitsPerBox) > 1 ? Number(part.cost) / Number(part.unitsPerBox) : Number(part.cost)) * pu.qty) : "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {showCost ? (
            <div style={{ borderTop: "2px solid #1A1A1A", paddingTop: 10, fontSize: 13 }}>
              <Row label={`Labor (${job.laborHours || 0} hrs @ ${money(job.laborRate)})`} value={money(cost.laborCost)} />
              <Row label="Parts total" value={money(cost.partsCost)} />
              <Row label="Total" value={money(cost.total)} bold big />
            </div>
          ) : (
            <div style={{ borderTop: "2px solid #1A1A1A", paddingTop: 10, fontSize: 12, color: "#888", fontStyle: "italic" }}>Pricing withheld on staff copy</div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26, paddingTop: 14, borderTop: "1px dashed #999", fontSize: 11, color: "#888" }}>
            <span>Booked in: {dateShort(job.createdAt)}</span>
            <span>Signature: ______________________</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function Row({ label, value, bold, big }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: big ? 15 : 13, fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: bold ? "#1A1A1A" : "#555" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ============================================================
   CLIENTS (owner only)
   ============================================================ */
function Clients({ clients, jobs, persistClients }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const filtered = clients.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search));
  const save = (client) => {
    persistClients(editing ? clients.map((c) => (c.id === client.id ? client : c)) : [...clients, client]);
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => { persistClients(clients.filter((c) => c.id !== id)); setConfirmDeleteId(null); };

  return (
    <div>
      <SectionHeader title="Clients" action={
        <button className="wj-btn wj-amber" style={{ padding: "9px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }} onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={15} /> New client
        </button>
      } />
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#5C6065" }} />
        <input style={{ paddingLeft: 30 }} placeholder="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? <Empty text="No clients yet. Add the first one." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {filtered.map((c) => {
            const jobCount = jobs.filter((j) => j.clientId === c.id).length;
            return (
              <div key={c.id} className="wj-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <IconBtn onClick={() => { setEditing(c); setShowForm(true); }} title="Edit"><ChevronRight size={14} /></IconBtn>
                    {confirmDeleteId === c.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 11, color: "#D9695A", fontWeight: 600 }}>Delete?</span>
                        <button className="wj-btn" onClick={() => remove(c.id)} style={{ background: "#A23B2E", color: "#fff", padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>Yes</button>
                        <button className="wj-btn wj-ghost" onClick={() => setConfirmDeleteId(null)} style={{ padding: "3px 7px", borderRadius: 5, fontSize: 11 }}>No</button>
                      </div>
                    ) : (
                      <IconBtn onClick={() => setConfirmDeleteId(c.id)} title="Delete client"><Trash2 size={14} /></IconBtn>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "#9A9D9F", marginTop: 6 }}>{c.phone || "No phone"}</div>
                <div style={{ fontSize: 12.5, color: "#9A9D9F" }}>{c.email || "No email"}</div>
                <div style={{ fontSize: 12.5, color: "#9A9D9F", marginBottom: 8 }}>{c.address || "No address"}</div>
                {c.notes && <div style={{ fontSize: 12, color: "#7A7D80", fontStyle: "italic", marginBottom: 8 }}>{c.notes}</div>}
                <div style={{ fontSize: 11.5, color: "#FF8A1E", fontWeight: 600 }}>{jobCount} job{jobCount !== 1 ? "s" : ""} on record</div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && <ClientForm client={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
function ClientForm({ client, onSave, onClose }) {
  const [form, setForm] = useState(client || { id: uid("client"), name: "", phone: "", email: "", address: "", notes: "", createdAt: new Date().toISOString() });
  const [formError, setFormError] = useState("");
  return (
    <Modal onClose={onClose} title={client ? "Edit client" : "New client"}>
      <div style={{ marginBottom: 14 }}><label>Full name / business name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Barambah Machinery" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      </div>
      <div style={{ marginBottom: 14 }}><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <div style={{ marginBottom: 14 }}><label>Notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      {formError && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 10 }}>{formError}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="wj-btn wj-ghost" style={{ padding: "10px 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 600 }} onClick={onClose}>Cancel</button>
        <button className="wj-btn wj-amber" style={{ padding: "10px 20px", borderRadius: 6, fontSize: 13.5, fontWeight: 700 }} onClick={() => { if (!form.name.trim()) { setFormError("Enter a client name."); return; } onSave(form); }}>Save client</button>
      </div>
    </Modal>
  );
}

/* ============================================================
   PARTS & CONSUMABLES — category cascade accordion
   ============================================================ */

const PART_CATEGORIES = [
  { key: "Welding",             label: "Welding",                icon: "🔥" },
  { key: "Bolts & Nuts",        label: "Bolts & Nuts",           icon: "🔩" },
  { key: "Abrasives",           label: "Abrasives & Cutting",    icon: "⚙️" },
  { key: "Laser",               label: "Laser",                  icon: "🔆" },
  { key: "Electrical",          label: "Electrical",             icon: "⚡" },
  { key: "Diesel/Mechanical",   label: "Diesel & Mechanical",    icon: "🛢️" },
  { key: "Consumables",         label: "Consumables",            icon: "🧴" },
  { key: "PPE",                 label: "PPE",                    icon: "🦺" },
  { key: "Other",               label: "Other",                  icon: "📦" },
];

// Map seed category names → display category keys
const CAT_MAP = {
  "Welding":            "Welding",
  "Fasteners":          "Bolts & Nuts",
  "Bolts & Nuts":       "Bolts & Nuts",
  "Abrasives":          "Abrasives",
  "Cutting Tools":      "Abrasives",
  "Laser":              "Laser",
  "Electrical":         "Electrical",
  "Diesel/Mechanical":  "Diesel/Mechanical",
  "Workshop General":   "Consumables",
  "Consumables":        "Consumables",
  "PPE":                "PPE",
  "Other":              "Other",
};

function resolveCategory(p) {
  if (!p.category) return "Other";
  return CAT_MAP[p.category] || p.category;
}

function Parts({ isOwner, parts, persistParts }) {
  const [openCats, setOpenCats] = useState(() => {
    // default — open all categories that have items
    const set = new Set(PART_CATEGORIES.map((c) => c.key));
    return set;
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const save = (part) => {
    persistParts(editing ? parts.map((p) => (p.id === part.id ? part : p)) : [...parts, part]);
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => persistParts(parts.filter((p) => p.id !== id));
  const adjustQty = (id, delta) => persistParts(parts.map((p) => (p.id === id ? { ...p, qty: Math.max(0, Number(p.qty) + delta) } : p)));

  const toggleCat = (key) => {
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const lowStockIds = new Set(parts.filter((p) => Number(p.qty) <= Number(p.reorderAt || 0)).map((p) => p.id));

  // Group parts by resolved category, filtered by search
  const grouped = PART_CATEGORIES.map((cat) => {
    const items = parts.filter((p) => {
      const matchCat = resolveCategory(p) === cat.key;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0 || !search);

  // Uncategorised / other
  const allKnownKeys = new Set(PART_CATEGORIES.map((c) => c.key));
  const otherItems = parts.filter((p) => !allKnownKeys.has(resolveCategory(p)) && (!search || p.name.toLowerCase().includes(search.toLowerCase())));

  const lowStock = parts.filter((p) => lowStockIds.has(p.id));

  return (
    <div>
      <SectionHeader title="Parts & Consumables" action={
        isOwner && (
          <button className="wj-btn wj-amber" style={{ padding: "9px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }} onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={15} /> New item
          </button>
        )
      } />

      {!isOwner && (
        <div style={{ fontSize: 12, color: "#9A9D9F", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={12} /> Cost prices are hidden on your account — use the +/- buttons to adjust quantities.
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="wj-card" style={{ padding: 12, marginBottom: 16, borderColor: "#A23B2E", display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <AlertTriangle size={15} color="#D9695A" />
          <span><strong>{lowStock.length}</strong> item{lowStock.length !== 1 ? "s" : ""} at or below reorder level: {lowStock.map((p) => p.name).join(", ")}</span>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 18, maxWidth: 340 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#5C6065" }} />
        <input style={{ paddingLeft: 30 }} placeholder="Search parts & consumables…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {parts.length === 0 ? <Empty text="No parts & consumables in the catalog yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grouped.map((cat) => (
            <CategoryAccordion
              key={cat.key}
              cat={cat}
              isOpen={openCats.has(cat.key)}
              onToggle={() => toggleCat(cat.key)}
              isOwner={isOwner}
              lowStockIds={lowStockIds}
              adjustQty={adjustQty}
              onEdit={(p) => { setEditing(p); setShowForm(true); }}
              onRemove={remove}
            />
          ))}
          {otherItems.length > 0 && (
            <CategoryAccordion
              cat={{ key: "Other", label: "Other", icon: "📦", items: otherItems }}
              isOpen={openCats.has("Other")}
              onToggle={() => toggleCat("Other")}
              isOwner={isOwner}
              lowStockIds={lowStockIds}
              adjustQty={adjustQty}
              onEdit={(p) => { setEditing(p); setShowForm(true); }}
              onRemove={remove}
            />
          )}
        </div>
      )}

      {showForm && <PartForm part={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function CategoryAccordion({ cat, isOpen, onToggle, isOwner, lowStockIds, adjustQty, onEdit, onRemove }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const lowCount = cat.items.filter((p) => lowStockIds.has(p.id)).length;
  return (
    <div className="wj-card" style={{ overflow: "hidden" }}>
      {/* Category header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          cursor: "pointer", userSelect: "none",
          background: isOpen ? "rgba(255,138,30,0.06)" : "transparent",
          borderBottom: isOpen ? "1px solid #2C2F33" : "none",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{cat.icon}</span>
        <div style={{ flex: 1 }}>
          <div className="wj-h" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.03em" }}>{cat.label}</div>
          <div style={{ fontSize: 11.5, color: "#9A9D9F", marginTop: 2 }}>
            {cat.items.length} item{cat.items.length !== 1 ? "s" : ""}
            {lowCount > 0 && <span style={{ color: "#D9695A", marginLeft: 8, fontWeight: 700 }}>⚠ {lowCount} low stock</span>}
          </div>
        </div>
        <div style={{ color: "#9A9D9F", fontSize: 18, fontWeight: 300, transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>›</div>
      </div>

      {/* Items */}
      {isOpen && (
        <div>
          {/* Column headers */}
          <div style={{ display: "flex", gap: 12, padding: "8px 16px", fontSize: 10.5, color: "#5C6065", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1A1D20" }}>
            <div style={{ flex: 3 }}>Item</div>
            <div style={{ flex: 1 }}>SKU</div>
            <div style={{ flex: 1 }}>Supplier</div>
            {isOwner && <div style={{ flex: 1 }}>Cost</div>}
            <div style={{ flex: "0 0 110px", textAlign: "center" }}>Qty</div>
            {isOwner && <div style={{ width: 66 }} />}
          </div>

          {cat.items.map((p, idx) => {
            const isLow = lowStockIds.has(p.id);
            return (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
                  background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  borderBottom: idx < cat.items.length - 1 ? "1px solid #1A1D20" : "none",
                }}
              >
                <div style={{ flex: 3, minWidth: 120 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: isLow ? "#D9695A" : "#E8E6DF" }}>{p.name}</div>
                </div>
                <div style={{ flex: 1, fontSize: 12, color: "#9A9D9F" }}>{p.sku || "—"}</div>
                <div style={{ flex: 1, fontSize: 12, color: "#9A9D9F" }}>{p.supplier || "—"}</div>
                {isOwner && <div style={{ flex: 1, fontSize: 12.5 }}>{money(p.cost)}</div>}
                <div style={{ flex: "0 0 110px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <button className="wj-btn wj-ghost" style={{ width: 24, height: 24, borderRadius: 4, fontSize: 14 }} onClick={() => adjustQty(p.id, -1)}>−</button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 28, textAlign: "center", color: isLow ? "#D9695A" : "#E8E6DF" }}>{p.qty}</span>
                  <button className="wj-btn wj-ghost" style={{ width: 24, height: 24, borderRadius: 4, fontSize: 14 }} onClick={() => adjustQty(p.id, 1)}>+</button>
                </div>
                {isOwner && (
                  <div style={{ width: 80, display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                    <IconBtn onClick={() => onEdit(p)} title="Edit"><ChevronRight size={13} /></IconBtn>
                    {confirmDeleteId === p.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button className="wj-btn" onClick={() => { onRemove(p.id); setConfirmDeleteId(null); }} style={{ background: "#A23B2E", color: "#fff", padding: "3px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>Yes</button>
                        <button className="wj-btn wj-ghost" onClick={() => setConfirmDeleteId(null)} style={{ padding: "3px 6px", borderRadius: 4, fontSize: 11 }}>No</button>
                      </div>
                    ) : (
                      <IconBtn onClick={() => setConfirmDeleteId(p.id)} title="Delete"><Trash2 size={13} /></IconBtn>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PartForm({ part, onSave, onClose }) {
  const [form, setForm] = useState(part ? { ...part } : { id: uid("part"), name: "", sku: "", cost: 0, qty: 0, reorderAt: 0, supplier: "", category: "Consumables", unitsPerBox: 1, unitName: "" });
  const [formError, setFormError] = useState("");
  const unitCost = form.unitsPerBox > 1 ? (Number(form.cost) / Number(form.unitsPerBox)).toFixed(4) : null;
  return (
    <Modal onClose={onClose} title={part ? "Edit item" : "New part / consumable"} wide>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label>Product name (full, e.g. "Hex Bolt M8 x 25mm Gr8.8 (Box 100)")</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hex Bolt M8 x 25mm Gr8.8 (Box 100)" /></div>
        <div>
          <label>Category</label>
          <select value={form.category || "Consumables"} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="Welding">Welding</option>
            <option value="Bolts & Nuts">Bolts & Nuts</option>
            <option value="Abrasives">Abrasives & Cutting</option>
            <option value="Laser">Laser</option>
            <option value="Electrical">Electrical</option>
            <option value="Diesel/Mechanical">Diesel & Mechanical</option>
            <option value="Consumables">Consumables</option>
            <option value="PPE">PPE</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label>SKU</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
        <div><label>Supplier</label><input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
      </div>

      {/* Box / unit breakdown */}
      <div className="wj-card" style={{ padding: 14, marginBottom: 14, borderColor: "#FF8A1E" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#FF8A1E", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Box & unit breakdown</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 10 }}>
          <div>
            <label>Box / pack price ($)</label>
            <input type="number" step="0.01" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          <div>
            <label>Units per box / pack</label>
            <input type="number" min="1" step="1" value={form.unitsPerBox} onChange={(e) => setForm({ ...form, unitsPerBox: e.target.value })} placeholder="e.g. 100" />
          </div>
          <div>
            <label>Unit name (singular)</label>
            <input value={form.unitName} onChange={(e) => setForm({ ...form, unitName: e.target.value })} placeholder="e.g. bolt, disc, roll" />
          </div>
        </div>
        {unitCost && (
          <div style={{ fontSize: 12.5, color: "#9A9D9F" }}>
            Unit cost: <strong style={{ color: "#FF8A1E" }}>${unitCost}</strong> per {form.unitName || "unit"}
            {" "}— staff will add individual {form.unitName || "units"} to jobs, not whole boxes.
          </div>
        )}
        {Number(form.unitsPerBox) === 1 && (
          <div style={{ fontSize: 12, color: "#9A9D9F" }}>Set units per box &gt; 1 to enable per-unit pricing for job costing.</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div><label>Qty in stock (boxes / packs)</label><input type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></div>
        <div><label>Reorder at (boxes)</label><input type="number" min="0" value={form.reorderAt} onChange={(e) => setForm({ ...form, reorderAt: e.target.value })} /></div>
      </div>

      {formError && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 10 }}>{formError}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="wj-btn wj-ghost" style={{ padding: "10px 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 600 }} onClick={onClose}>Cancel</button>
        <button className="wj-btn wj-amber" style={{ padding: "10px 20px", borderRadius: 6, fontSize: 13.5, fontWeight: 700 }} onClick={() => {
          if (!form.name.trim()) { setFormError("Enter a part name."); return; }
          const cat = form.category || "Consumables";
          onSave({ ...form, cost: Number(form.cost), qty: Number(form.qty), reorderAt: Number(form.reorderAt), unitsPerBox: Number(form.unitsPerBox) || 1, category: cat });
        }}>Save item</button>
      </div>
    </Modal>
  );
}

/* ============================================================
   TIME LOG (staff only)
   ============================================================ */
function TimeLog({ jobs, parts, clientById, persistJobs, session }) {
  const openJobs = jobs.filter((j) => j.status !== "Completed").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const [selectedJobId, setSelectedJobId] = useState(openJobs[0]?.id || "");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [partsUsed, setPartsUsed] = useState([]);
  const [timeError, setTimeError] = useState("");

  const addPartRow = () => {
    if (parts.length === 0) return;
    setPartsUsed([...partsUsed, { partId: parts[0].id, qty: 1 }]);
  };
  const updatePartRow = (idx, field, value) => {
    const next = [...partsUsed];
    next[idx] = { ...next[idx], [field]: field === "qty" ? Math.max(1, Number(value)) : value };
    setPartsUsed(next);
  };
  const removePartRow = (idx) => setPartsUsed(partsUsed.filter((_, i) => i !== idx));

  const submit = () => {
    if (!selectedJobId) { setTimeError("Select a job first."); return; }
    if (!hours || Number(hours) <= 0) { setTimeError("Enter the hours worked."); return; }

    const entry = {
      id: uid("time"),
      staffName: session.name,
      date: new Date().toISOString(),
      hours: Number(hours),
      note,
      partsUsed,
    };

    persistJobs(jobs.map((j) => {
      if (j.id !== selectedJobId) return j;
      const existingParts = [...(j.partsUsed || [])];
      partsUsed.forEach((pu) => {
        const idx = existingParts.findIndex((ep) => ep.partId === pu.partId);
        if (idx >= 0) {
          existingParts[idx] = { ...existingParts[idx], qty: existingParts[idx].qty + pu.qty };
        } else {
          existingParts.push({ partId: pu.partId, qty: pu.qty });
        }
      });
      return {
        ...j,
        timeEntries: [...(j.timeEntries || []), entry],
        laborHours: (Number(j.laborHours) || 0) + Number(hours),
        partsUsed: existingParts,
      };
    }));

    setHours(""); setNote(""); setPartsUsed([]); setTimeError("");
  };

  const myRecentEntries = jobs
    .flatMap((j) => (j.timeEntries || [])
      .filter((e) => e.staffName === session.name)
      .map((e) => ({ ...e, jobTitle: j.title, jobNumber: j.jobNumber }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);

  const partById = Object.fromEntries(parts.map((p) => [p.id, p]));

  return (
    <div>
      <SectionHeader title="Time log" />
      <div className="wj-card" style={{ padding: 18, marginBottom: 22 }}>

        <div style={{ marginBottom: 14 }}>
          <label>Job</label>
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
            {openJobs.length === 0 && <option value="">No open jobs</option>}
            {openJobs.map((j) => <option key={j.id} value={j.id}>{j.jobNumber} — {j.title}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 18 }}>
          <div><label>Hours worked</label><input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 1.5" /></div>
          <div><label>Note (optional)</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you did" /></div>
        </div>

        <div style={{ borderTop: "1px solid #2C2F33", paddingTop: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#9A9D9F", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            Parts & Consumables used
          </div>

          {parts.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#5C6065", marginBottom: 4 }}>No parts set up in the system yet.</div>
          ) : (
            <PartPicker
              parts={parts}
              isOwner={false}
              partsUsed={partsUsed}
              onAdd={(partId) => {
                const idx = partsUsed.findIndex((p) => p.partId === partId);
                if (idx >= 0) {
                  const next = [...partsUsed];
                  next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                  setPartsUsed(next);
                } else {
                  setPartsUsed([...partsUsed, { partId, qty: 1 }]);
                }
              }}
            />
          )}

          {partsUsed.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "#9A9D9F", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Added</div>
              {partsUsed.map((pu, idx) => {
                const part = parts.find((p) => p.id === pu.partId);
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: "#15171A", borderRadius: 6, padding: "7px 10px" }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{part?.name || "Unknown"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button className="wj-btn wj-ghost" style={{ width: 24, height: 24, borderRadius: 4, fontSize: 14 }} onClick={() => {
                        const next = [...partsUsed];
                        next[idx] = { ...next[idx], qty: Math.max(1, pu.qty - 1) };
                        setPartsUsed(next);
                      }}>−</button>
                      <span style={{ fontWeight: 700, fontSize: 13, minWidth: 20, textAlign: "center" }}>{pu.qty}</span>
                      <button className="wj-btn wj-ghost" style={{ width: 24, height: 24, borderRadius: 4, fontSize: 14 }} onClick={() => {
                        const next = [...partsUsed];
                        next[idx] = { ...next[idx], qty: pu.qty + 1 };
                        setPartsUsed(next);
                      }}>+</button>
                    </div>
                    <IconBtn onClick={() => setPartsUsed(partsUsed.filter((_, i) => i !== idx))} title="Remove"><X size={14} /></IconBtn>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {timeError && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 10 }}>{timeError}</div>}
        <button
          className="wj-btn wj-amber"
          style={{ width: "100%", padding: "11px 0", borderRadius: 6, fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          onClick={submit}
        >
          <Timer size={15} /> Submit time & materials
        </button>
      </div>

      <div className="wj-h" style={{ fontSize: 13.5, marginBottom: 12, color: "#9A9D9F" }}>Your recent entries</div>
      {myRecentEntries.length === 0 ? <Empty text="No time logged yet." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {myRecentEntries.map((e) => (
            <div key={e.id} className="wj-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: e.partsUsed?.length ? 10 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.jobNumber} — {e.jobTitle}</div>
                  {e.note && <div style={{ fontSize: 12, color: "#9A9D9F", marginTop: 2 }}>{e.note}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{e.hours} hrs</div>
                  <div style={{ fontSize: 11, color: "#9A9D9F" }}>{dateShort(e.date)}</div>
                </div>
              </div>
              {e.partsUsed?.length > 0 && (
                <div style={{ borderTop: "1px solid #2C2F33", paddingTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {e.partsUsed.map((pu, i) => (
                    <span key={i} style={{ fontSize: 11.5, background: "#15171A", border: "1px solid #2C2F33", borderRadius: 5, padding: "3px 8px", color: "#C7C5BE" }}>
                      {partById[pu.partId]?.name || "Unknown"} × {pu.qty}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   INVENTORY
   ============================================================ */
function Inventory({ isOwner, parts, persistParts, jobs }) {
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const save = (part) => {
    persistParts(editing ? parts.map((p) => (p.id === part.id ? part : p)) : [...parts, part]);
    setShowForm(false); setEditing(null);
  };
  const remove = (id) => persistParts(parts.filter((p) => p.id !== id));
  const adjustQty = (id, delta) => persistParts(parts.map((p) => p.id === id ? { ...p, qty: Math.max(0, Number(p.qty) + delta) } : p));

  const totalItems = parts.length;
  const lowStock = parts.filter((p) => Number(p.qty) <= Number(p.reorderAt || 0) && Number(p.qty) > 0);
  const outOfStock = parts.filter((p) => Number(p.qty) === 0);
  const totalValue = isOwner ? parts.reduce((s, p) => s + Number(p.cost) * Number(p.qty), 0) : null;

  const jobUsage = parts.map((p) => {
    const used = jobs.reduce((sum, j) => {
      const pu = (j.partsUsed || []).find((u) => u.partId === p.id);
      return sum + (pu ? pu.qty : 0);
    }, 0);
    return { ...p, totalUsed: used };
  });

  const filtered = jobUsage.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase()) || (p.supplier || "").toLowerCase().includes(search.toLowerCase());
    const matchStock = filterStock === "all" || (filterStock === "low" && Number(p.qty) <= Number(p.reorderAt || 0) && Number(p.qty) > 0) || (filterStock === "out" && Number(p.qty) === 0) || (filterStock === "ok" && Number(p.qty) > Number(p.reorderAt || 0));
    return matchSearch && matchStock;
  });

  const stockStatus = (p) => {
    if (Number(p.qty) === 0) return { label: "Out of stock", color: "#A23B2E", bg: "rgba(162,59,46,0.12)" };
    if (Number(p.qty) <= Number(p.reorderAt || 0)) return { label: "Low stock", color: "#C9760C", bg: "rgba(201,118,12,0.12)" };
    return { label: "In stock", color: "#1E6E4E", bg: "rgba(30,110,78,0.12)" };
  };

  return (
    <div>
      <SectionHeader
        title="Inventory"
        action={isOwner && (
          <button className="wj-btn wj-amber" style={{ padding: "9px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }} onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={15} /> New item
          </button>
        )}
      />

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
        <div className="wj-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 6 }}>Total items</div>
          <div className="wj-h" style={{ fontSize: 22, fontWeight: 700 }}>{totalItems}</div>
        </div>
        <div className="wj-card" style={{ padding: 14, borderColor: lowStock.length ? "#C9760C" : "#2C2F33" }}>
          <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 6 }}>Low stock</div>
          <div className="wj-h" style={{ fontSize: 22, fontWeight: 700, color: lowStock.length ? "#C9760C" : "#E8E6DF" }}>{lowStock.length}</div>
        </div>
        <div className="wj-card" style={{ padding: 14, borderColor: outOfStock.length ? "#A23B2E" : "#2C2F33" }}>
          <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 6 }}>Out of stock</div>
          <div className="wj-h" style={{ fontSize: 22, fontWeight: 700, color: outOfStock.length ? "#D9695A" : "#E8E6DF" }}>{outOfStock.length}</div>
        </div>
        {isOwner && (
          <div className="wj-card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 6 }}>Stock value</div>
            <div className="wj-h" style={{ fontSize: 22, fontWeight: 700, color: "#FF8A1E" }}>{money(totalValue)}</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#5C6065" }} />
          <input style={{ paddingLeft: 30 }} placeholder="Search name, SKU, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={{ width: 160 }} value={filterStock} onChange={(e) => setFilterStock(e.target.value)}>
          <option value="all">All stock</option>
          <option value="ok">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {filtered.length === 0 ? <Empty text="No inventory items match." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Header row */}
          <div style={{ display: "flex", gap: 12, padding: "0 14px", fontSize: 11, color: "#5C6065", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <div style={{ flex: 3 }}>Item</div>
            <div style={{ flex: 1 }}>SKU</div>
            {isOwner && <div style={{ flex: 1 }}>Box price</div>}
            {isOwner && <div style={{ flex: 1 }}>Unit price</div>}
            {isOwner && <div style={{ flex: 1 }}>Stock value</div>}
            <div style={{ flex: 1 }}>Used on jobs</div>
            <div style={{ flex: "0 0 130px", textAlign: "center" }}>Qty (boxes)</div>
            <div style={{ flex: 1 }}>Status</div>
            {isOwner && <div style={{ width: 70 }} />}
          </div>

          {filtered.map((p) => {
            const status = stockStatus(p);
            const hasUnits = Number(p.unitsPerBox) > 1;
            const unitCost = hasUnits ? Number(p.cost) / Number(p.unitsPerBox) : null;
            const totalUnitsAvail = hasUnits ? Number(p.qty) * Number(p.unitsPerBox) : null;
            return (
              <div key={p.id} className="wj-card" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 3, minWidth: 120 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                    {hasUnits && (
                      <div style={{ fontSize: 11.5, color: "#9A9D9F", marginTop: 2 }}>
                        {p.unitsPerBox} {p.unitName || "units"}/box
                        {totalUnitsAvail !== null && <span style={{ marginLeft: 8, color: "#FF8A1E" }}>{totalUnitsAvail} {p.unitName || "units"} available</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, color: "#9A9D9F" }}>{p.sku || "—"}</div>
                  {isOwner && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5 }}>{money(p.cost)}</div>
                      <div style={{ fontSize: 10.5, color: "#9A9D9F" }}>per box</div>
                    </div>
                  )}
                  {isOwner && (
                    <div style={{ flex: 1 }}>
                      {unitCost ? (
                        <>
                          <div style={{ fontSize: 12.5, color: "#FF8A1E", fontWeight: 600 }}>{money(unitCost)}</div>
                          <div style={{ fontSize: 10.5, color: "#9A9D9F" }}>per {p.unitName || "unit"}</div>
                        </>
                      ) : <div style={{ fontSize: 12, color: "#5C6065" }}>—</div>}
                    </div>
                  )}
                  {isOwner && <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{money(Number(p.cost) * Number(p.qty))}</div>}
                  <div style={{ flex: 1, fontSize: 12.5, color: "#9A9D9F" }}>{p.totalUsed > 0 ? `× ${p.totalUsed}` : "—"}</div>
                  <div style={{ flex: "0 0 130px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <button className="wj-btn wj-ghost" style={{ width: 26, height: 26, borderRadius: 5, fontSize: 15 }} onClick={() => adjustQty(p.id, -1)}>−</button>
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: Number(p.qty) === 0 ? "#D9695A" : Number(p.qty) <= Number(p.reorderAt || 0) ? "#C9760C" : "#E8E6DF" }}>{p.qty}</span>
                      <div style={{ fontSize: 10, color: "#5C6065" }}>boxes</div>
                    </div>
                    <button className="wj-btn wj-ghost" style={{ width: 26, height: 26, borderRadius: 5, fontSize: 15 }} onClick={() => adjustQty(p.id, 1)}>+</button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: status.bg, color: status.color, border: `1px solid ${status.color}` }}>
                      {status.label}
                    </span>
                  </div>
                  {isOwner && (
                    <div style={{ width: 70, display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                      <IconBtn onClick={() => { setEditing(p); setShowForm(true); }} title="Edit"><ChevronRight size={14} /></IconBtn>
                      {confirmDeleteId === p.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button className="wj-btn" onClick={() => { remove(p.id); setConfirmDeleteId(null); }} style={{ background: "#A23B2E", color: "#fff", padding: "3px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>Yes</button>
                          <button className="wj-btn wj-ghost" onClick={() => setConfirmDeleteId(null)} style={{ padding: "3px 6px", borderRadius: 4, fontSize: 11 }}>No</button>
                        </div>
                      ) : (
                        <IconBtn onClick={() => setConfirmDeleteId(p.id)} title="Delete"><Trash2 size={14} /></IconBtn>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <PartForm part={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

/* ============================================================
   INVENTORY CHECKLIST
   ============================================================ */
function InventoryChecklist({ parts, persistParts, session, isOwner }) {
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState({});
  const [checked, setChecked] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedBy, setSubmittedBy] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = parts.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const allChecked = filtered.length > 0 && totalChecked === filtered.length;

  const handleCount = (id, val) => setCounts((c) => ({ ...c, [id]: val }));
  const handleNote = (id, val) => setNotes((n) => ({ ...n, [id]: val }));
  const handleCheck = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const handleSubmit = () => {
    if (totalChecked < filtered.length) {
      if (!confirm(`You have only counted ${totalChecked} of ${filtered.length} items. Submit anyway?`)) return;
    }
    const updated = parts.map((p) => {
      const newQty = counts[p.id] !== undefined && counts[p.id] !== "" ? Number(counts[p.id]) : p.qty;
      return { ...p, qty: newQty };
    });
    persistParts(updated);
    setSubmittedBy({ name: session.name, date: new Date().toISOString() });
    setSubmitted(true);
  };

  const handleReset = () => {
    setCounts({});
    setNotes({});
    setChecked({});
    setSubmitted(false);
    setSubmittedBy(null);
  };

  if (submitted) {
    return (
      <div>
        <SectionHeader title="Inventory Checklist" />
        <div className="wj-card" style={{ padding: 32, textAlign: "center" }}>
          <CheckCircle2 size={40} color="#1E6E4E" style={{ marginBottom: 14 }} />
          <div className="wj-h" style={{ fontSize: 20, marginBottom: 8 }}>Checklist submitted</div>
          <div style={{ fontSize: 13.5, color: "#9A9D9F", marginBottom: 20 }}>
            Completed by <strong style={{ color: "#E8E6DF" }}>{submittedBy.name}</strong> on {dateShort(submittedBy.date)}. Stock quantities have been updated.
          </div>
          <button className="wj-btn wj-amber" style={{ padding: "10px 22px", borderRadius: 6, fontWeight: 700, fontSize: 13.5 }} onClick={handleReset}>
            Start new checklist
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Inventory Checklist" />

      <div style={{ fontSize: 13, color: "#9A9D9F", marginBottom: 18, lineHeight: 1.6, maxWidth: 560 }}>
        Count each item physically and enter the actual quantity. Tick it off as you go. When you submit, the stock quantities will be updated to match your count.
      </div>

      {/* Progress bar */}
      <div className="wj-card" style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9A9D9F", marginBottom: 6 }}>
            <span>Progress</span>
            <span style={{ fontWeight: 700, color: allChecked ? "#1E6E4E" : "#E8E6DF" }}>{totalChecked} / {filtered.length} counted</span>
          </div>
          <div style={{ height: 8, background: "#15171A", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${filtered.length ? (totalChecked / filtered.length) * 100 : 0}%`, height: "100%", background: allChecked ? "#1E6E4E" : "#FF8A1E", transition: "width 0.2s" }} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#5C6065" }} />
        <input style={{ paddingLeft: 30 }} placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {parts.length === 0 ? <Empty text="No inventory items set up yet." /> : (
        <>
          {/* Column headers */}
          <div style={{ display: "flex", gap: 12, padding: "0 14px", marginBottom: 6, fontSize: 11, color: "#5C6065", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <div style={{ width: 28 }} />
            <div style={{ flex: 3 }}>Item</div>
            <div style={{ flex: 1 }}>SKU</div>
            {isOwner && <div style={{ flex: 1 }}>System qty</div>}
            <div style={{ flex: 1 }}>Counted qty</div>
            {isOwner && <div style={{ flex: 1 }}>Variance</div>}
            <div style={{ flex: 2 }}>Note</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 22 }}>
            {filtered.map((p) => {
              const isChecked = !!checked[p.id];
              const countVal = counts[p.id] !== undefined ? counts[p.id] : "";
              const variance = countVal !== "" ? Number(countVal) - Number(p.qty) : null;
              const hasVariance = variance !== null && variance !== 0;

              return (
                <div
                  key={p.id}
                  className="wj-card"
                  style={{
                    padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                    borderColor: isChecked ? "#1E6E4E" : "#2C2F33",
                    background: isChecked ? "rgba(30,110,78,0.06)" : "#1E2024",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Checkbox */}
                  <div
                    onClick={() => handleCheck(p.id)}
                    style={{
                      width: 22, height: 22, borderRadius: 5, flexShrink: 0, cursor: "pointer",
                      border: `2px solid ${isChecked ? "#1E6E4E" : "#5C6065"}`,
                      background: isChecked ? "#1E6E4E" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {isChecked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>

                  <div style={{ flex: 3, minWidth: 120 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: isChecked ? "#9A9D9F" : "#E8E6DF", textDecoration: isChecked ? "line-through" : "none" }}>{p.name}</div>
                  </div>

                  <div style={{ flex: 1, fontSize: 12.5, color: "#9A9D9F" }}>{p.sku || "—"}</div>

                  {isOwner && (
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.qty}</div>
                  )}

                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      min="0"
                      placeholder="Count…"
                      value={countVal}
                      onChange={(e) => { handleCount(p.id, e.target.value); if (!checked[p.id]) handleCheck(p.id); }}
                      style={{ fontSize: 13, fontWeight: 600, textAlign: "center", padding: "6px 8px" }}
                    />
                  </div>

                  {isOwner && (
                    <div style={{ flex: 1 }}>
                      {variance === null ? (
                        <span style={{ fontSize: 12, color: "#5C6065" }}>—</span>
                      ) : hasVariance ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: variance > 0 ? "#1E6E4E" : "#D9695A" }}>
                          {variance > 0 ? "+" : ""}{variance}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#1E6E4E", fontWeight: 600 }}>✓ Match</span>
                      )}
                    </div>
                  )}

                  <div style={{ flex: 2 }}>
                    <input
                      placeholder="Note…"
                      value={notes[p.id] || ""}
                      onChange={(e) => handleNote(p.id, e.target.value)}
                      style={{ fontSize: 12.5, padding: "6px 8px" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="wj-btn wj-ghost" style={{ padding: "10px 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 600 }} onClick={handleReset}>
              Reset
            </button>
            <button className="wj-btn wj-amber" style={{ padding: "10px 22px", borderRadius: 6, fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }} onClick={handleSubmit}>
              <CheckCircle2 size={15} /> Submit count
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SDS LIBRARY — Safety Data Sheets
   ============================================================ */

const GHS = {
  flammable:    { label: "Flammable",           icon: "🔥", color: "#C9760C" },
  oxidising:    { label: "Oxidising",           icon: "🔆", color: "#C9760C" },
  compressed:   { label: "Compressed Gas",      icon: "🔵", color: "#5C6B7A" },
  toxic:        { label: "Toxic",               icon: "💀", color: "#A23B2E" },
  harmful:      { label: "Harmful/Irritant",    icon: "⚠️",  color: "#C9760C" },
  corrosive:    { label: "Corrosive",           icon: "🧪", color: "#A23B2E" },
  health:       { label: "Health Hazard",       icon: "🫁", color: "#5C6B7A" },
  environ:      { label: "Environmental",       icon: "🌿", color: "#1E6E4E" },
  explosive:    { label: "Explosive",           icon: "💥", color: "#A23B2E" },
};

const SDS_DATA = [
  // ── WELDING ────────────────────────────────────────────────
  {
    id: "sds-001", category: "Welding",
    name: "MIG Wire / Solid Wire Electrode (ER70S-2, ER70S-6)",
    manufacturer: "Lincoln Electric / Cigweld / BOC",
    unNumber: "Not regulated (solid)",
    hazards: ["harmful", "health"],
    signal: "WARNING",
    hazardStatements: ["May cause respiratory irritation from fumes during welding", "Fumes may cause manganism with chronic overexposure"],
    ppe: ["P2/P3 respirator", "Welding helmet with correct shade", "Leather welding gloves", "Welding jacket"],
    firstAid: { inhalation: "Remove to fresh air. If symptoms persist seek medical attention.", skin: "Wash with soap and water.", eyes: "Flush with water for 15 minutes.", ingestion: "Seek medical advice." },
    storage: "Store in dry area. Keep away from moisture.",
    disposal: "Dispose in accordance with local regulations. Recycle metal scrap where possible.",
    sdsUrl: "https://www.lincolnelectric.com/en-au/support/welding-how-to/Pages/sds.aspx",
    emergencyPhone: "13 11 26 (Poisons Info)",
  },
  {
    id: "sds-002", category: "Welding",
    name: "TIG Filler Rod — Stainless / Aluminium / Mild Steel",
    manufacturer: "BOC / Cigweld / Lincoln Electric",
    unNumber: "Not regulated (solid)",
    hazards: ["harmful", "health"],
    signal: "WARNING",
    hazardStatements: ["Welding fumes may cause irritation to eyes, nose and throat", "Stainless fumes contain hexavalent chromium — known carcinogen"],
    ppe: ["P3 respirator (stainless)", "P2 respirator (mild steel)", "TIG welding gloves", "Auto-darkening helmet shade 9–13"],
    firstAid: { inhalation: "Remove to fresh air immediately. Seek medical attention for persistent symptoms.", skin: "Wash thoroughly.", eyes: "Irrigate with clean water 15 min.", ingestion: "Rinse mouth. Seek medical advice." },
    storage: "Store dry. Keep away from moisture and direct sunlight.",
    disposal: "Metal scrap — recycle through approved facility.",
    sdsUrl: "https://www.boc.com.au/en/safety-data-sheets",
    emergencyPhone: "13 11 26 (Poisons Info)",
  },
  {
    id: "sds-003", category: "Welding",
    name: "Welding Electrode — Stick (E6013 / E7018)",
    manufacturer: "Lincoln Electric / Cigweld / Hyundai",
    unNumber: "Not regulated (solid)",
    hazards: ["harmful", "health"],
    signal: "WARNING",
    hazardStatements: ["Fumes and gases can be hazardous", "Overexposure may cause dizziness and nausea", "Keep head out of fumes"],
    ppe: ["P2 respirator minimum", "Welding helmet shade 10–12", "Leather gloves", "Welding jacket and boots"],
    firstAid: { inhalation: "Move to fresh air. Rest. Seek medical attention.", skin: "Wash area. Remove contaminated clothing.", eyes: "Flush immediately 15 min. Seek attention if irritation continues.", ingestion: "Do not induce vomiting. Seek medical attention." },
    storage: "Store in dry conditions. Low-hydrogen electrodes in sealed containers or electrode oven.",
    disposal: "Dispose per local regulations. Recycle metal stubs.",
    sdsUrl: "https://www.lincolnelectric.com/en-au/support/welding-how-to/Pages/sds.aspx",
    emergencyPhone: "13 11 26 (Poisons Info)",
  },
  {
    id: "sds-004", category: "Welding",
    name: "Shielding Gas — Argon/CO₂ Mix (C25, C5)",
    manufacturer: "BOC / Air Liquide / Coregas",
    unNumber: "UN 1956 (Compressed Gas Mixture)",
    hazards: ["compressed", "harmful"],
    signal: "WARNING",
    hazardStatements: ["Contains gas under pressure — may explode if heated", "May cause oxygen deficiency in confined spaces", "CO₂ is an asphyxiant at high concentrations"],
    ppe: ["Ensure adequate ventilation", "Gas detector in confined spaces", "Safety glasses"],
    firstAid: { inhalation: "Remove to fresh air. Administer oxygen if trained. Call 000.", skin: "Frostbite from liquid release — warm gently, do not rub.", eyes: "Flush with water. Seek medical attention.", ingestion: "Not applicable." },
    storage: "Secure cylinders upright. Away from heat, ignition sources. Segregate from oxidants.",
    disposal: "Return empty cylinders to supplier. Never vent to confined spaces.",
    sdsUrl: "https://www.boc.com.au/en/safety-data-sheets",
    emergencyPhone: "1800 BOC GAS / 13 11 26",
  },
  {
    id: "sds-005", category: "Welding",
    name: "Pure Argon Gas",
    manufacturer: "BOC / Air Liquide / Coregas",
    unNumber: "UN 1006",
    hazards: ["compressed", "harmful"],
    signal: "WARNING",
    hazardStatements: ["Asphyxiant — displaces oxygen in enclosed spaces", "Cylinder under high pressure — handle with care"],
    ppe: ["Adequate ventilation mandatory", "Confined space — continuous gas monitor", "Safety footwear when handling cylinders"],
    firstAid: { inhalation: "Evacuate area. Administer CPR/oxygen if trained. Call 000.", skin: "Cryogenic burns if liquid contact — warm gently.", eyes: "Flush with water.", ingestion: "Not applicable." },
    storage: "Upright, chained or secured. Cool, ventilated area. Away from heat.",
    disposal: "Return to BOC/supplier. Never dispose of pressurised cylinders.",
    sdsUrl: "https://www.boc.com.au/en/safety-data-sheets",
    emergencyPhone: "1800 BOC GAS / 000",
  },
  {
    id: "sds-006", category: "Welding",
    name: "Anti-Spatter Spray",
    manufacturer: "Cigweld / CRC / Quala",
    unNumber: "UN 1950 (Aerosol)",
    hazards: ["flammable", "harmful"],
    signal: "WARNING",
    hazardStatements: ["Extremely flammable aerosol", "May cause drowsiness or dizziness", "Keep away from heat, hot surfaces, sparks and open flames"],
    ppe: ["Safety glasses", "Gloves", "Ventilation — do not spray in enclosed areas near arc"],
    firstAid: { inhalation: "Fresh air. Seek medical attention if dizzy.", skin: "Wash with soap and water.", eyes: "Flush 15 min. Seek medical attention.", ingestion: "Rinse mouth. Seek immediate medical attention — do not induce vomiting." },
    storage: "Aerosol — away from direct sunlight and temperatures above 50°C.",
    disposal: "Pressurised container — do not puncture or incinerate. Aerosol recycling program.",
    sdsUrl: "https://www.cigweld.com.au/en-au/support/sds",
    emergencyPhone: "13 11 26 (Poisons Info)",
  },
  // ── LASER GASES ────────────────────────────────────────────
  {
    id: "sds-007", category: "Laser",
    name: "Nitrogen Assist Gas (Laser Grade)",
    manufacturer: "BOC / Air Liquide",
    unNumber: "UN 1066",
    hazards: ["compressed", "harmful"],
    signal: "WARNING",
    hazardStatements: ["Asphyxiant — displaces oxygen", "High-pressure cylinder — risk of explosion if heated", "Risk of rapid depressurisation injury"],
    ppe: ["Ventilation in laser room", "Confined space monitoring if applicable", "Face shield when connecting/disconnecting"],
    firstAid: { inhalation: "Evacuate. Administer oxygen if trained. Call 000.", skin: "Frostbite if cryogenic release — treat as burn.", eyes: "Flush with water.", ingestion: "N/A." },
    storage: "Secure cylinder upright. Store separately from oxidising gases and fuels.",
    disposal: "Return empty cylinders to BOC. Do not vent indoors.",
    sdsUrl: "https://www.boc.com.au/en/safety-data-sheets",
    emergencyPhone: "1800 BOC GAS / 000",
  },
  {
    id: "sds-008", category: "Laser",
    name: "Oxygen Assist Gas (Laser Grade)",
    manufacturer: "BOC / Air Liquide",
    unNumber: "UN 1072",
    hazards: ["compressed", "oxidising"],
    signal: "DANGER",
    hazardStatements: ["Oxidiser — greatly increases risk of fire", "High pressure — cylinder may explode if heated", "Keep ALL ignition sources away from oxygen cylinders and lines"],
    ppe: ["Oil-free gloves and equipment (oil + O₂ = explosion risk)", "Face shield", "No oil or grease near fittings"],
    firstAid: { inhalation: "Remove to fresh air. Seek medical attention.", skin: "Remove contaminated clothing.", eyes: "Flush with water.", ingestion: "N/A." },
    storage: "Segregate from fuel gases and combustibles. Minimum 3m separation or fire-rated wall. Upright, chained.",
    disposal: "Return cylinder to supplier. Never use as a substitute for compressed air.",
    sdsUrl: "https://www.boc.com.au/en/safety-data-sheets",
    emergencyPhone: "1800 BOC GAS / 000",
  },
  // ── ABRASIVES & CUTTING ────────────────────────────────────
  {
    id: "sds-009", category: "Abrasives",
    name: "Grinding / Cut-Off Wheels & Flap Discs",
    manufacturer: "Norton / Pferd / 3M / Klingspor",
    unNumber: "Not regulated",
    hazards: ["harmful", "health"],
    signal: "WARNING",
    hazardStatements: ["Dust may contain crystalline silica — risk of silicosis with chronic inhalation", "Wheel fragmentation risk at overspeed or with damaged disc", "Sparks — fire hazard in presence of flammables"],
    ppe: ["P2 dust respirator minimum", "Full face shield + safety glasses", "Leather gloves", "Guards in place at all times", "Max RPM never exceeded"],
    firstAid: { inhalation: "Move to fresh air. Seek medical attention for persistent respiratory symptoms.", skin: "Abrasion — clean wound and cover.", eyes: "Flush 15 min. Seek medical attention — fragments may embed.", ingestion: "Seek medical advice." },
    storage: "Store flat or hung vertically. Dry, away from solvents. Inspect before use.",
    disposal: "Spent wheels as general waste. Dust collected as industrial waste.",
    sdsUrl: "https://www.nortonabrasives.com/en-au/resources/sds",
    emergencyPhone: "13 11 26 / 000 for injuries",
  },
  // ── ELECTRICAL ─────────────────────────────────────────────
  {
    id: "sds-010", category: "Electrical",
    name: "Heat Shrink Tubing / PVC Insulation Products",
    manufacturer: "Various",
    unNumber: "Not regulated",
    hazards: ["harmful"],
    signal: "WARNING",
    hazardStatements: ["PVC fumes when overheated can be irritating", "Do not burn or incinerate"],
    ppe: ["Ensure ventilation when using heat gun", "Safety glasses"],
    firstAid: { inhalation: "Fresh air. Medical attention if symptoms persist.", skin: "Cool burn under running water.", eyes: "Flush with water.", ingestion: "Rinse mouth." },
    storage: "Cool, dry area away from direct sunlight.",
    disposal: "General waste. Do not burn.",
    sdsUrl: "https://www.cabac.com.au/resources/sds",
    emergencyPhone: "13 11 26",
  },
  // ── DIESEL / MECHANICAL ────────────────────────────────────
  {
    id: "sds-011", category: "Diesel/Mechanical",
    name: "Engine Oil — 15W-40 Mineral / Synthetic",
    manufacturer: "Castrol / Mobil / Penrite / Nulon",
    unNumber: "Not regulated",
    hazards: ["harmful", "environ"],
    signal: "WARNING",
    hazardStatements: ["Prolonged skin contact may cause dermatitis", "Used oil contains carcinogenic compounds — handle used oil carefully", "Environmental hazard — do not discharge to drains or waterways"],
    ppe: ["Nitrile gloves", "Safety glasses", "Avoid prolonged skin contact"],
    firstAid: { inhalation: "Fresh air. Seek attention if mist inhaled.", skin: "Wash thoroughly with soap and water.", eyes: "Flush 15 min. Seek attention.", ingestion: "Do not induce vomiting. Seek medical attention." },
    storage: "Cool, dry, well-ventilated. Keep containers sealed.",
    disposal: "Never pour down drain. Used oil — licensed waste collector or recycler.",
    sdsUrl: "https://www.castrol.com/en_au/australia/home/sds.html",
    emergencyPhone: "13 11 26",
  },
  {
    id: "sds-012", category: "Diesel/Mechanical",
    name: "Hydraulic Oil — ISO 46",
    manufacturer: "Castrol / Shell / BP / Mobil",
    unNumber: "Not regulated",
    hazards: ["harmful", "environ"],
    signal: "WARNING",
    hazardStatements: ["Injection injury possible under high pressure — seek immediate medical attention", "Environmental hazard", "Mist inhalation can cause irritation"],
    ppe: ["Nitrile gloves", "Safety glasses", "Face shield when working on pressurised systems"],
    firstAid: { inhalation: "Fresh air.", skin: "Wash with soap and water. High pressure injection — EMERGENCY, treat as puncture wound.", eyes: "Flush 15 min. Seek medical attention.", ingestion: "Do not induce vomiting. Seek medical attention." },
    storage: "Sealed containers in cool, dry, ventilated area.",
    disposal: "Recycle through licensed used oil collector. Never to drain.",
    sdsUrl: "https://www.castrol.com/en_au/australia/home/sds.html",
    emergencyPhone: "13 11 26",
  },
  {
    id: "sds-013", category: "Diesel/Mechanical",
    name: "Multi-Purpose Grease (Lithium / EP)",
    manufacturer: "CRC / Castrol / Penrite / Shell",
    unNumber: "Not regulated",
    hazards: ["harmful"],
    signal: "WARNING",
    hazardStatements: ["Prolonged skin contact may cause irritation or dermatitis"],
    ppe: ["Nitrile or latex gloves", "Safety glasses"],
    firstAid: { inhalation: "N/A (not volatile).", skin: "Wash with soap and water.", eyes: "Flush 15 min.", ingestion: "Rinse mouth. Seek medical advice." },
    storage: "Sealed container. Cool, dry place.",
    disposal: "Small amounts — general industrial waste. Large quantities — licensed collector.",
    sdsUrl: "https://www.crcind.com/sds",
    emergencyPhone: "13 11 26",
  },
  {
    id: "sds-014", category: "Diesel/Mechanical",
    name: "Coolant / Antifreeze Concentrate",
    manufacturer: "Nulon / Penrite / Castrol",
    unNumber: "Not regulated (diluted) / UN 3082 (concentrate)",
    hazards: ["harmful", "environ"],
    signal: "WARNING",
    hazardStatements: ["Contains ethylene glycol — harmful if swallowed", "Toxic to aquatic life", "Keep away from animals — sweet taste attracts pets"],
    ppe: ["Nitrile gloves", "Safety glasses", "Avoid skin contact"],
    firstAid: { inhalation: "Fresh air.", skin: "Wash with water.", eyes: "Flush 15 min. Seek attention.", ingestion: "CALL 13 11 26 IMMEDIATELY — ethylene glycol poisoning is serious." },
    storage: "Sealed containers. Away from food and animals.",
    disposal: "Licensed waste facility. Do not pour to drain — toxic to aquatic life.",
    sdsUrl: "https://www.nulon.com.au/sds",
    emergencyPhone: "13 11 26 (URGENT if ingested)",
  },
  {
    id: "sds-015", category: "Diesel/Mechanical",
    name: "Silicone Gasket Maker (RTV)",
    manufacturer: "Permatex / Loctite / Selleys",
    unNumber: "Not regulated",
    hazards: ["harmful"],
    signal: "WARNING",
    hazardStatements: ["Releases acetic acid on cure — irritating to eyes, nose and throat", "Avoid inhalation of fumes during application"],
    ppe: ["Safety glasses", "Gloves", "Ventilation during application"],
    firstAid: { inhalation: "Fresh air. Ventilate area.", skin: "Wash with soap and water before cure.", eyes: "Flush 15 min. Seek attention.", ingestion: "Seek medical advice." },
    storage: "Cool, dry place. Refrigerate to extend shelf life.",
    disposal: "Cured product — general waste. Uncured in sealed container to waste facility.",
    sdsUrl: "https://www.permatex.com/sds",
    emergencyPhone: "13 11 26",
  },
  // ── CONSUMABLES ────────────────────────────────────────────
  {
    id: "sds-016", category: "Consumables",
    name: "WD-40 Multi-Use Product",
    manufacturer: "WD-40 Company",
    unNumber: "UN 1950 (Aerosol)",
    hazards: ["flammable", "harmful"],
    signal: "WARNING",
    hazardStatements: ["Extremely flammable aerosol", "May cause drowsiness or dizziness", "Harmful to aquatic life with long lasting effects"],
    ppe: ["Safety glasses", "Gloves", "Use in well-ventilated area — keep away from ignition"],
    firstAid: { inhalation: "Fresh air. Seek medical attention if symptoms persist.", skin: "Wash with soap and water.", eyes: "Flush 15 min. Seek medical attention.", ingestion: "Do not induce vomiting. Seek medical attention." },
    storage: "Away from heat, sparks, flames. Max 50°C.",
    disposal: "Pressurised aerosol — aerosol recycling centre. Never puncture or incinerate.",
    sdsUrl: "https://www.wd40.com.au/about/sds",
    emergencyPhone: "13 11 26",
  },
  {
    id: "sds-017", category: "Consumables",
    name: "CRC Inox MX3 Lubricant Spray",
    manufacturer: "CRC Industries",
    unNumber: "UN 1950 (Aerosol)",
    hazards: ["flammable", "harmful"],
    signal: "WARNING",
    hazardStatements: ["Extremely flammable aerosol", "May cause drowsiness or dizziness", "Do not spray near ignition sources"],
    ppe: ["Safety glasses", "Gloves", "Adequate ventilation"],
    firstAid: { inhalation: "Fresh air. Rest. Seek medical attention.", skin: "Wash with soap and water.", eyes: "Flush 15 min. Medical attention.", ingestion: "Rinse mouth. Do not induce vomiting. Medical attention." },
    storage: "Cool, away from heat >50°C and ignition sources.",
    disposal: "Pressurised — aerosol recycling. Never incinerate.",
    sdsUrl: "https://www.crcind.com/sds",
    emergencyPhone: "13 11 26",
  },
  {
    id: "sds-018", category: "Consumables",
    name: "Cutting & Tapping Oil",
    manufacturer: "Rocol / CRC / Castrol / Inox",
    unNumber: "Not regulated",
    hazards: ["harmful", "environ"],
    signal: "WARNING",
    hazardStatements: ["Irritating to skin and eyes", "Do not discharge to waterways"],
    ppe: ["Nitrile gloves", "Safety glasses"],
    firstAid: { inhalation: "Fresh air.", skin: "Wash with soap and water.", eyes: "Flush 15 min. Seek attention.", ingestion: "Rinse mouth. Seek medical attention." },
    storage: "Sealed container in cool, dry area.",
    disposal: "Used oil — licensed collector. Not to drain.",
    sdsUrl: "https://www.rocol.com/sds",
    emergencyPhone: "13 11 26",
  },
  {
    id: "sds-019", category: "Consumables",
    name: "Parts Degreaser / Solvent Cleaner",
    manufacturer: "CRC / Chemtech / Wurth",
    unNumber: "UN 1993 (Flammable Liquid NOS)",
    hazards: ["flammable", "harmful", "health", "environ"],
    signal: "DANGER",
    hazardStatements: ["Flammable liquid and vapour", "May cause drowsiness or dizziness", "Suspected carcinogen (solvent-based formulas)", "Harmful to aquatic environment"],
    ppe: ["Nitrile gloves", "Safety glasses / face shield", "Supplied-air respirator or half-face organic vapour cartridge", "Do not use near ignition sources"],
    firstAid: { inhalation: "Evacuate to fresh air immediately. If unconscious call 000.", skin: "Wash thoroughly. Remove contaminated clothing.", eyes: "Flush minimum 20 min. Seek medical attention immediately.", ingestion: "Do not induce vomiting. Call 13 11 26 and 000 immediately." },
    storage: "Flammable store. Approved flammable liquid cabinet. Away from all ignition sources.",
    disposal: "Solvent waste — licensed hazardous waste contractor. Never to drain.",
    sdsUrl: "https://www.crcind.com/sds",
    emergencyPhone: "13 11 26 / 000",
  },
  {
    id: "sds-020", category: "Consumables",
    name: "Marking-Out Blue / Dykem Layout Fluid",
    manufacturer: "Dykem / Inox / CRC",
    unNumber: "UN 1950 or UN 1993",
    hazards: ["flammable", "harmful"],
    signal: "WARNING",
    hazardStatements: ["Flammable — flash point <23°C", "Irritating to skin and eyes", "Keep away from ignition"],
    ppe: ["Safety glasses", "Gloves", "Ventilation"],
    firstAid: { inhalation: "Fresh air.", skin: "Soap and water.", eyes: "Flush 15 min. Seek attention.", ingestion: "Rinse mouth. Seek medical advice." },
    storage: "Cool, well-ventilated flammable cabinet.",
    disposal: "Licensed flammable waste contractor.",
    sdsUrl: "https://www.dykem.com/technical-documents/sds",
    emergencyPhone: "13 11 26",
  },
];

const SDS_SIGNAL_STYLE = {
  "DANGER":  { bg: "rgba(162,59,46,0.15)", color: "#D9695A", border: "#A23B2E" },
  "WARNING": { bg: "rgba(201,118,12,0.12)", color: "#FF8A1E", border: "#C9760C" },
};

function SDSLibrary({ parts, company }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [showMode, setShowMode] = useState("inuse");
  const [printItem, setPrintItem] = useState(null);
  const [showPrintAll, setShowPrintAll] = useState(false);

  // Build a map: SDS category → inventory items that match it
  // Uses resolveCategory() so it stays in sync with whatever is in the parts catalog
  const inventoryByCat = useMemo(() => {
    const map = {};
    parts.forEach((p) => {
      const cat = resolveCategory(p);
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [parts]);

  // Which SDS categories are represented in the current inventory?
  const activeSdsCategories = new Set(
    SDS_DATA.map((s) => s.category).filter((cat) => {
      // Match SDS category to resolved inventory category
      // e.g. SDS category "Welding" matches inventory resolved category "Welding"
      // SDS "Abrasives" matches "Abrasives"
      // SDS "Consumables" matches "Consumables"
      return inventoryByCat[cat] && inventoryByCat[cat].length > 0;
    })
  );

  // For each SDS entry, find matching inventory items by name similarity or category
  const matchingPartsForSDS = (sds) => {
    // Primary match: same category in inventory
    const catParts = inventoryByCat[sds.category] || [];
    return catParts;
  };

  const inUseCount = SDS_DATA.filter((s) => activeSdsCategories.has(s.category)).length;
  const categories = ["All", ...new Set(SDS_DATA.map((s) => s.category))];

  const filtered = SDS_DATA.filter((s) => {
    const matchMode = showMode === "all" || activeSdsCategories.has(s.category);
    const matchCat = filterCat === "All" || s.category === filterCat;
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.manufacturer.toLowerCase().includes(search.toLowerCase());
    return matchMode && matchCat && matchSearch;
  });

  const grouped = categories.filter((c) => c !== "All").map((cat) => ({
    cat,
    items: filtered.filter((s) => s.category === cat),
    active: activeSdsCategories.has(cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <SectionHeader
        title="SDS Library"
        action={
          <button className="wj-btn wj-amber" style={{ padding: "9px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowPrintAll(true)}>
            <Printer size={14} /> Print all SDS
          </button>
        }
      />

      {/* Info bar */}
      <div style={{ fontSize: 13, color: "#9A9D9F", marginBottom: 16, lineHeight: 1.6, maxWidth: 640 }}>
        Safety Data Sheets matched to your current inventory. Removing an item from inventory never removes its SDS — switch to <strong style={{ color: "#E8E6DF" }}>All SDS</strong> to see the full library at any time.
      </div>

      {/* Inventory match summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="wj-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 5 }}>SDS in use (inventory)</div>
          <div className="wj-h" style={{ fontSize: 24, fontWeight: 700, color: "#FF8A1E" }}>{inUseCount}</div>
        </div>
        <div className="wj-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 5 }}>Total SDS library</div>
          <div className="wj-h" style={{ fontSize: 24, fontWeight: 700 }}>{SDS_DATA.length}</div>
        </div>
        <div className="wj-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 5 }}>Inventory items covered</div>
          <div className="wj-h" style={{ fontSize: 24, fontWeight: 700, color: "#1E6E4E" }}>
            {parts.filter((p) => activeSdsCategories.has(resolveCategory(p))).length}
          </div>
        </div>
      </div>

      {/* Emergency numbers banner */}
      <div className="wj-card" style={{ padding: 12, marginBottom: 18, borderColor: "#A23B2E", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        <AlertTriangle size={18} color="#D9695A" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#D9695A", textTransform: "uppercase", letterSpacing: "0.05em" }}>Emergency numbers — post at every workstation</div>
          <div style={{ fontSize: 13, color: "#E8E6DF", marginTop: 2 }}>
            <strong>000</strong> — Police / Fire / Ambulance &nbsp;·&nbsp;
            <strong>13 11 26</strong> — Poisons Information Centre &nbsp;·&nbsp;
            <strong>1800 BOC GAS</strong> — BOC Gas Emergencies
          </div>
        </div>
      </div>

      {/* Mode toggle + Search + Category filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {/* In use / All toggle */}
        <div style={{ display: "flex", background: "#15171A", borderRadius: 7, border: "1px solid #3A3D42", padding: 3, gap: 2 }}>
          {[
            { key: "inuse", label: `In use (${inUseCount})` },
            { key: "all",   label: `All SDS (${SDS_DATA.length})` },
          ].map((m) => (
            <button
              key={m.key}
              className="wj-btn"
              onClick={() => setShowMode(m.key)}
              style={{
                padding: "6px 14px", borderRadius: 5, fontSize: 12.5, fontWeight: 600,
                background: showMode === m.key ? "#FF8A1E" : "transparent",
                color: showMode === m.key ? "#1A1300" : "#9A9D9F",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#5C6065" }} />
          <input style={{ paddingLeft: 30 }} placeholder="Search product or manufacturer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <select style={{ width: 170 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Empty text={showMode === "inuse" ? "No SDS sheets match your current inventory. Switch to 'All SDS' to browse the full library." : "No SDS sheets match your search."} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {grouped.map(({ cat, items, active }) => (
            <div key={cat}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div className="wj-h" style={{ fontSize: 13, color: active ? "#E8E6DF" : "#5C6065" }}>{cat}</div>
                {active ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(30,110,78,0.15)", color: "#1E6E4E", border: "1px solid #1E6E4E" }}>
                    ✓ In inventory
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#15171A", color: "#5C6065", border: "1px solid #3A3D42" }}>
                    Not in inventory
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((s) => {
                  const sig = SDS_SIGNAL_STYLE[s.signal] || SDS_SIGNAL_STYLE["WARNING"];
                  const matchedParts = matchingPartsForSDS(s);

                  return (
                    <div key={s.id} className="wj-card" style={{ padding: 16, borderLeft: `4px solid ${active ? sig.border : "#3A3D42"}`, opacity: active ? 1 : 0.7 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: "#9A9D9F", marginTop: 2 }}>{s.manufacturer}</div>
                          {s.unNumber && <div style={{ fontSize: 11.5, color: "#5C6065", marginTop: 2 }}>UN: {s.unNumber}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 4, background: sig.bg, color: sig.color, border: `1px solid ${sig.border}`, letterSpacing: "0.08em" }}>
                            {s.signal}
                          </span>
                          <a href={s.sdsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                            <button className="wj-btn wj-ghost" style={{ padding: "6px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                              <FileText size={12} /> View SDS ↗
                            </button>
                          </a>
                          <button className="wj-btn wj-amber" style={{ padding: "6px 12px", borderRadius: 5, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }} onClick={() => setPrintItem(s)}>
                            <Printer size={12} /> Print Summary
                          </button>
                        </div>
                      </div>

                      {/* Matched inventory items */}
                      {matchedParts.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #2C2F33" }}>
                          <span style={{ fontSize: 11, color: "#9A9D9F", fontWeight: 600, alignSelf: "center" }}>Covers:</span>
                          {matchedParts.map((p) => (
                            <span key={p.id} style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: "rgba(30,110,78,0.1)", color: "#1E9E6E", border: "1px solid rgba(30,110,78,0.3)" }}>
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* GHS hazard pictograms */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {s.hazards.map((h) => {
                          const g = GHS[h];
                          return g ? (
                            <span key={h} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 20, background: "#15171A", border: "1px solid #3A3D42", color: g.color, display: "flex", alignItems: "center", gap: 4 }}>
                              {g.icon} {g.label}
                            </span>
                          ) : null;
                        })}
                      </div>

                      {/* Key hazard statements */}
                      <div style={{ fontSize: 12.5, color: "#C7C5BE", lineHeight: 1.6, marginBottom: 8 }}>
                        {s.hazardStatements.map((h, i) => (
                          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                            <span style={{ color: "#D9695A", fontWeight: 700, flexShrink: 0 }}>▸</span>
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>

                      {/* PPE row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        <span style={{ fontSize: 11, color: "#9A9D9F", fontWeight: 600, marginRight: 2 }}>PPE:</span>
                        {s.ppe.map((p, i) => (
                          <span key={i} style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: "#2C2F33", color: "#C7C5BE", border: "1px solid #3A3D42" }}>{p}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {printItem && <SDSPrintModal item={printItem} company={company} onClose={() => setPrintItem(null)} />}
      {showPrintAll && <SDSPrintAllModal parts={parts} company={company} activeSdsCategories={activeSdsCategories} inventoryByCat={inventoryByCat} onClose={() => setShowPrintAll(false)} />}
    </div>
  );
}

/* ---- Company header used on all printed SDS pages ---- */
function SDSCompanyHeader({ company }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1A1A1A", paddingBottom: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Logo block — amber bar matching ADE brand */}
        <div style={{ width: 8, height: 48, background: "#FF8A1E", borderRadius: 2 }} />
        <div>
          <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#1A1A1A", lineHeight: 1.1 }}>
            {company.name || "Workshop"}
          </div>
          {company.address && <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{company.address}{company.suburb ? `, ${company.suburb}` : ""}</div>}
          <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>
            {company.phone && <span>Ph: {company.phone}</span>}
            {company.phone && company.email ? " · " : ""}
            {company.email && <span>{company.email}</span>}
            {company.abn && <span style={{ marginLeft: 8 }}>ABN: {company.abn}</span>}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "Oswald, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#666" }}>Safety Data Sheet</div>
        <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Printed: {new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>
    </div>
  );
}

/* ---- Single SDS page content (used in both single and print-all) ---- */
function SDSPageContent({ item, company, showDivider }) {
  const sig = SDS_SIGNAL_STYLE[item.signal] || SDS_SIGNAL_STYLE["WARNING"];
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: "#1A1A1A", padding: "18px 24px 16px", pageBreakAfter: showDivider ? "always" : "auto", minHeight: showDivider ? "277mm" : "auto", boxSizing: "border-box", position: "relative" }}>
      <SDSCompanyHeader company={company} />

      {/* Product + signal */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{item.name}</div>
          <div style={{ fontSize: 11.5, color: "#555", marginTop: 2 }}>{item.manufacturer}</div>
          {item.unNumber && <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>UN: {item.unNumber}</div>}
        </div>
        <div style={{ padding: "5px 12px", borderRadius: 4, background: sig.bg, color: sig.color, border: `2px solid ${sig.border}`, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          {item.signal}
        </div>
      </div>

      {/* GHS pictograms */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {item.hazards.map((h) => {
          const g = GHS[h];
          return g ? (
            <div key={h} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, padding: "3px 9px", border: "1px solid #ccc", borderRadius: 20 }}>
              <span>{g.icon}</span><span style={{ color: "#444" }}>{g.label}</span>
            </div>
          ) : null;
        })}
      </div>

      {/* Two-column layout for compact A4 fit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
        {/* Left col */}
        <div>
          <PrintSection label="Hazard Statements" />
          {item.hazardStatements.map((h, i) => (
            <div key={i} style={{ fontSize: 11.5, marginBottom: 3, display: "flex", gap: 5 }}>
              <span style={{ color: "#A23B2E", fontWeight: 700, flexShrink: 0 }}>▸</span><span>{h}</span>
            </div>
          ))}

          <div style={{ marginTop: 10 }}>
            <PrintSection label="Required PPE" />
            {item.ppe.map((p, i) => (
              <div key={i} style={{ fontSize: 11.5, marginBottom: 2, display: "flex", gap: 5 }}>
                <span style={{ flexShrink: 0 }}>🦺</span><span>{p}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <PrintSection label="Storage" />
            <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>{item.storage}</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <PrintSection label="Disposal" />
            <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>{item.disposal}</div>
          </div>
        </div>

        {/* Right col */}
        <div>
          <PrintSection label="First Aid Measures" />
          <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse" }}>
            {Object.entries(item.firstAid).map(([route, action]) => (
              <tr key={route} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                <td style={{ padding: "3px 6px 3px 0", fontWeight: 700, color: "#555", textTransform: "capitalize", whiteSpace: "nowrap", width: 70 }}>{route}</td>
                <td style={{ padding: "3px 0", lineHeight: 1.5 }}>{action}</td>
              </tr>
            ))}
          </table>

          <div style={{ marginTop: 10, background: "#fff3f3", border: "2px solid #A23B2E", borderRadius: 5, padding: "8px 12px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#A23B2E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Emergency</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{item.emergencyPhone}</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <PrintSection label="Full SDS Reference" />
            <div style={{ fontSize: 11, color: "#555", wordBreak: "break-all" }}>{item.sdsUrl}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 14, left: 24, right: 24, borderTop: "1px dashed #ccc", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#aaa" }}>
        <span>This is a summary only. Always refer to the full manufacturer SDS before use.</span>
        <span>© {company.name || "Workshop"} — Internal document</span>
      </div>
    </div>
  );
}

function SDSPrintAllModal({ parts, company, activeSdsCategories, inventoryByCat, onClose }) {
  const inUseSDS = SDS_DATA.filter((s) => activeSdsCategories.has(s.category));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", flexDirection: "column" }}>
      <style>{`
        @media print {
          .print-all-toolbar { display: none !important; }
          .print-all-scroll { overflow: visible !important; height: auto !important; }
          body * { visibility: hidden; }
          #print-all-area, #print-all-area * { visibility: visible; }
          #print-all-area { position: absolute; top: 0; left: 0; width: 100%; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="print-all-toolbar" style={{ background: "#1E2024", borderBottom: "1px solid #2C2F33", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ color: "#E8E6DF", fontWeight: 700, fontSize: 14 }}>
          Print All SDS — <span style={{ color: "#FF8A1E" }}>{inUseSDS.length} sheet{inUseSDS.length !== 1 ? "s" : ""}</span> matched to current inventory
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="wj-btn wj-ghost" style={{ padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#E8E6DF" }} onClick={onClose}>✕ Close</button>
          <button className="wj-btn wj-amber" style={{ padding: "8px 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }} onClick={() => window.print()}>
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Scrollable preview */}
      <div className="print-all-scroll" style={{ flex: 1, overflowY: "auto", background: "#888", padding: "20px" }}>
        <div id="print-all-area">
          {inUseSDS.length === 0 ? (
            <div style={{ background: "#fff", padding: 40, textAlign: "center", color: "#555" }}>
              No SDS sheets matched to current inventory. Add products to Parts & Consumables first.
            </div>
          ) : (
            inUseSDS.map((s, idx) => (
              <div key={s.id} style={{
                background: "#fff",
                width: "210mm",
                minHeight: "297mm",
                margin: "0 auto 12px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                boxSizing: "border-box",
                overflow: "hidden",
                pageBreakAfter: idx < inUseSDS.length - 1 ? "always" : "auto",
              }}>
                <SDSPageContent item={s} company={company} showDivider={idx < inUseSDS.length - 1} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CompanySettingsModal({ company, onSave, onClose }) {
  const [form, setForm] = useState({ ...company });
  return (
    <Modal onClose={onClose} title="Company details for printed SDS">
      <div style={{ fontSize: 12.5, color: "#9A9D9F", marginBottom: 16, lineHeight: 1.5 }}>
        These details appear on the header of every printed SDS sheet. Set your business name, address and contact details here.
      </div>
      <div style={{ marginBottom: 13 }}>
        <label>Business / company name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ADE Multi Trade Services" />
      </div>
      <div style={{ marginBottom: 13 }}>
        <label>Street address</label>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Workshop Drive" />
      </div>
      <div style={{ marginBottom: 13 }}>
        <label>Suburb, State, Postcode</label>
        <input value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} placeholder="Kingaroy QLD 4610" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, marginBottom: 13 }}>
        <div>
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07 XXXX XXXX" />
        </div>
        <div>
          <label>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@example.com.au" />
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label>ABN (optional)</label>
        <input value={form.abn} onChange={(e) => setForm({ ...form, abn: e.target.value })} placeholder="XX XXX XXX XXX" />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="wj-btn wj-ghost" style={{ padding: "10px 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 600 }} onClick={onClose}>Cancel</button>
        <button className="wj-btn wj-amber" style={{ padding: "10px 20px", borderRadius: 6, fontSize: 13.5, fontWeight: 700 }} onClick={() => onSave(form)}>Save details</button>
      </div>
    </Modal>
  );
}

function SDSPrintModal({ item, company, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area-single, #print-area-single * { visibility: visible; }
          #print-area-single { position: absolute; top: 0; left: 0; width: 100%; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
      <div style={{ background: "#fff", width: "210mm", maxHeight: "92vh", overflow: "auto", borderRadius: 4, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
        <div style={{ background: "#f5f5f5", borderBottom: "1px solid #ddd", padding: "10px 14px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="wj-btn" style={{ background: "#FF8A1E", color: "#1A1300", padding: "7px 14px", borderRadius: 5, fontWeight: 700, fontSize: 12.5, display: "flex", gap: 5, alignItems: "center" }} onClick={() => window.print()}>
            <Printer size={13} /> Print / Save PDF
          </button>
          <a href={item.sdsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <button className="wj-btn" style={{ background: "#1E6E4E", color: "#fff", padding: "7px 14px", borderRadius: 5, fontWeight: 700, fontSize: 12.5 }}>Full SDS ↗</button>
          </a>
          <button className="wj-btn" style={{ background: "#EAE8E1", color: "#333", padding: "7px 10px", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}><X size={14} /></button>
        </div>
        <div id="print-area-single">
          <SDSPageContent item={item} company={company} showDivider={false} />
        </div>
      </div>
    </div>
  );
}

function PrintSection({ label }) {
  return <div style={{ fontSize: 10.5, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, borderBottom: "1px solid #eee", paddingBottom: 4 }}>{label}</div>;
}

/* ============================================================
   ANALYTICS (owner only)
   ============================================================ */
function Analytics({ jobs, clients, clientById, jobCost }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div>
      <SectionHeader title="Analytics" />

      {/* Internal tab bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: "1px solid #2C2F33", paddingBottom: 0 }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "staffhours", label: "Staff Hours" },
        ].map((t) => (
          <button
            key={t.key}
            className="wj-btn"
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "9px 18px", borderRadius: "6px 6px 0 0", fontSize: 13.5, fontWeight: 600,
              background: activeTab === t.key ? "#FF8A1E" : "transparent",
              color: activeTab === t.key ? "#1A1300" : "#9A9D9F",
              borderBottom: activeTab === t.key ? "2px solid #FF8A1E" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <AnalyticsOverview jobs={jobs} clients={clients} clientById={clientById} jobCost={jobCost} />}
      {activeTab === "staffhours" && <StaffHours jobs={jobs} />}
    </div>
  );
}

function AnalyticsOverview({ jobs, clients, clientById, jobCost }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || "");
  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const completed = jobs.filter((j) => j.status === "Completed");
  const totalRevenue = completed.reduce((s, j) => s + jobCost(j).total, 0);
  const avgJobValue = completed.length ? totalRevenue / completed.length : 0;
  const totalPartsCost = jobs.reduce((s, j) => s + jobCost(j).partsCost, 0);
  const totalLaborCost = jobs.reduce((s, j) => s + jobCost(j).laborCost, 0);
  const statusCounts = STATUSES.map((s) => ({ status: s, count: jobs.filter((j) => j.status === s).length }));
  const maxCount = Math.max(1, ...statusCounts.map((s) => s.count));
  const topClients = Object.values(
    jobs.reduce((acc, j) => {
      const name = clientById[j.clientId]?.name || "Unknown";
      if (!acc[name]) acc[name] = { name, jobs: 0, revenue: 0 };
      acc[name].jobs += 1;
      acc[name].revenue += jobCost(j).total;
      return acc;
    }, {})
  ).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div>
      <SectionHeader title="Analytics" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat label="Total revenue (completed)" value={money(totalRevenue)} icon={DollarSign} accent="#FF8A1E" />
        <Stat label="Avg job value" value={money(avgJobValue)} icon={BarChart3} />
        <Stat label="Parts cost (all jobs)" value={money(totalPartsCost)} icon={Package} />
        <Stat label="Labor cost (all jobs)" value={money(totalLaborCost)} icon={Clock} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 24 }}>
        <div className="wj-card" style={{ padding: 18 }}>
          <div className="wj-h" style={{ fontSize: 13.5, marginBottom: 14, color: "#9A9D9F" }}>Jobs by status</div>
          {statusCounts.map((s) => (
            <div key={s.status} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span>{s.status}</span><span style={{ fontWeight: 700 }}>{s.count}</span></div>
              <div style={{ height: 7, background: "#15171A", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${(s.count / maxCount) * 100}%`, height: "100%", background: STATUS_COLOR[s.status] }} /></div>
            </div>
          ))}
        </div>
        <div className="wj-card" style={{ padding: 18 }}>
          <div className="wj-h" style={{ fontSize: 13.5, marginBottom: 14, color: "#9A9D9F" }}>Top clients by revenue</div>
          {topClients.length === 0 ? <div style={{ fontSize: 12.5, color: "#5C6065" }}>No job data yet.</div> :
            topClients.map((c, i) => (
              <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < topClients.length - 1 ? "1px solid #2C2F33" : "none" }}>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 11.5, color: "#9A9D9F" }}>{c.jobs} job{c.jobs !== 1 ? "s" : ""}</div></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FF8A1E" }}>{money(c.revenue)}</div>
              </div>
            ))}
        </div>
      </div>
      <div className="wj-card" style={{ padding: 18 }}>
        <div className="wj-h" style={{ fontSize: 13.5, marginBottom: 14, color: "#9A9D9F" }}>Per-job breakdown</div>
        {jobs.length === 0 ? <div style={{ fontSize: 12.5, color: "#5C6065" }}>No jobs yet.</div> : (
          <>
            <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} style={{ maxWidth: 360, marginBottom: 16 }}>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.jobNumber} — {j.title}</option>)}
            </select>
            {selectedJob && (() => {
              const cost = jobCost(selectedJob);
              const days = selectedJob.completedAt ? Math.round((new Date(selectedJob.completedAt) - new Date(selectedJob.createdAt)) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                  <MiniStat label="Client" value={clientById[selectedJob.clientId]?.name || "—"} />
                  <MiniStat label="Status" value={selectedJob.status} />
                  <MiniStat label="Parts cost" value={money(cost.partsCost)} />
                  <MiniStat label="Labor cost" value={money(cost.laborCost)} />
                  <MiniStat label="Total job value" value={money(cost.total)} />
                  <MiniStat label="Days to complete" value={days === null ? "In progress" : `${days} day${days !== 1 ? "s" : ""}`} />
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
function MiniStat({ label, value }) {
  return (
    <div style={{ background: "#15171A", borderRadius: 7, padding: 12 }}>
      <div style={{ fontSize: 11, color: "#9A9D9F", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

/* ============================================================
   STAFF HOURS
   ============================================================ */
function StaffHours({ jobs }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build last 14 days as date strings YYYY-MM-DD
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });

  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const fmtDay  = (d) => d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
  const isToday = (d) => fmtDate(d) === fmtDate(today);

  const startOfWeek = (d) => {
    const copy = new Date(d);
    const day = copy.getDay();
    const diff = day === 0 ? 6 : day - 1; // Mon = start
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const thisWeekStart = startOfWeek(today);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // Collect all time entries with their date and staff name
  const allEntries = jobs.flatMap((j) =>
    (j.timeEntries || []).map((e) => ({
      staffName: e.staffName,
      date: fmtDate(new Date(e.date)),
      hours: Number(e.hours) || 0,
      jobTitle: j.title,
      jobNumber: j.jobNumber,
    }))
  );

  // All unique staff names that have entries in the window
  const windowDates = new Set(last14.map(fmtDate));
  const staffNames = [...new Set(allEntries.filter((e) => windowDates.has(e.date)).map((e) => e.staffName))].sort();

  // Hours by staff + date
  const hoursMap = {};
  allEntries.forEach((e) => {
    if (!windowDates.has(e.date)) return;
    const key = `${e.staffName}__${e.date}`;
    hoursMap[key] = (hoursMap[key] || 0) + e.hours;
  });

  const getHours = (name, date) => hoursMap[`${name}__${fmtDate(date)}`] || 0;

  const weekTotal = (name, weekStart) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return getHours(name, d);
    }).reduce((a, b) => a + b, 0);

  const todayHours = (name) => getHours(name, today);

  const heatColor = (h) => {
    if (h === 0) return { bg: "#15171A", color: "#5C6065" };
    if (h <= 2) return { bg: "rgba(255,138,30,0.15)", color: "#C9760C" };
    if (h <= 4) return { bg: "rgba(255,138,30,0.30)", color: "#FF8A1E" };
    if (h <= 6) return { bg: "rgba(255,138,30,0.55)", color: "#FF8A1E" };
    return { bg: "rgba(255,138,30,0.80)", color: "#1A1300" };
  };

  // Split 14 days into 2 weeks
  const week1 = last14.slice(0, 7);
  const week2 = last14.slice(7, 14);

  if (staffNames.length === 0) {
    return <Empty text="No time entries logged in the last two weeks." />;
  }

  return (
    <div>
      {/* Summary cards — today + this week + last week per staff */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
        {staffNames.map((name) => (
          <div key={name} className="wj-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <SummaryRow label="Today" value={`${todayHours(name).toFixed(2)} hrs`} highlight={todayHours(name) > 0} />
              <SummaryRow label="This week" value={`${weekTotal(name, thisWeekStart).toFixed(2)} hrs`} />
              <SummaryRow label="Last week" value={`${weekTotal(name, lastWeekStart).toFixed(2)} hrs`} />
            </div>
          </div>
        ))}
      </div>

      {/* Heat grid — week 1 */}
      <HeatGrid label="Previous week" days={week1} staffNames={staffNames} getHours={getHours} heatColor={heatColor} fmtDay={fmtDay} isToday={isToday} />

      {/* Heat grid — week 2 (most recent) */}
      <HeatGrid label="This week" days={week2} staffNames={staffNames} getHours={getHours} heatColor={heatColor} fmtDay={fmtDay} isToday={isToday} />
    </div>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
      <span style={{ color: "#9A9D9F" }}>{label}</span>
      <span style={{ fontWeight: 700, color: highlight ? "#FF8A1E" : "#E8E6DF" }}>{value}</span>
    </div>
  );
}

function HeatGrid({ label, days, staffNames, getHours, heatColor, fmtDay, isToday }) {
  return (
    <div className="wj-card" style={{ padding: 18, marginBottom: 18, overflowX: "auto" }}>
      <div className="wj-h" style={{ fontSize: 13, color: "#9A9D9F", marginBottom: 14 }}>{label}</div>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px", minWidth: 520 }}>
        <thead>
          <tr>
            <td style={{ fontSize: 11.5, color: "#9A9D9F", fontWeight: 600, paddingRight: 12, whiteSpace: "nowrap" }}>Staff</td>
            {days.map((d) => (
              <td key={fmtDay(d)} style={{ fontSize: 11, color: isToday(d) ? "#FF8A1E" : "#9A9D9F", fontWeight: isToday(d) ? 700 : 500, textAlign: "center", paddingBottom: 6, whiteSpace: "nowrap" }}>
                {fmtDay(d)}
              </td>
            ))}
            <td style={{ fontSize: 11, color: "#9A9D9F", fontWeight: 600, textAlign: "center", paddingLeft: 8 }}>Total</td>
          </tr>
        </thead>
        <tbody>
          {staffNames.map((name) => {
            const weekTotal = days.reduce((s, d) => s + getHours(name, d), 0);
            return (
              <tr key={name}>
                <td style={{ fontSize: 12.5, fontWeight: 600, paddingRight: 12, whiteSpace: "nowrap", paddingBottom: 4 }}>{name}</td>
                {days.map((d) => {
                  const h = getHours(name, d);
                  const { bg, color } = heatColor(h);
                  return (
                    <td key={fmtDay(d)} style={{ textAlign: "center", paddingBottom: 4 }}>
                      <div
                        title={`${name} — ${fmtDay(d)}: ${h} hrs`}
                        style={{
                          background: bg, color, borderRadius: 6, padding: "6px 4px",
                          fontSize: 12, fontWeight: 700, minWidth: 52,
                          border: isToday(d) ? "1px solid #FF8A1E" : "1px solid transparent",
                        }}
                      >
                        {h > 0 ? `${h}h` : "—"}
                      </div>
                    </td>
                  );
                })}
                <td style={{ textAlign: "center", paddingLeft: 8, paddingBottom: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: weekTotal > 0 ? "#FF8A1E" : "#5C6065" }}>
                    {weekTotal > 0 ? `${weekTotal.toFixed(1)}h` : "—"}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#5C6065" }}>Hours:</span>
        {[
          { label: "0", bg: "#15171A", color: "#5C6065" },
          { label: "1–2", bg: "rgba(255,138,30,0.15)", color: "#C9760C" },
          { label: "3–4", bg: "rgba(255,138,30,0.30)", color: "#FF8A1E" },
          { label: "5–6", bg: "rgba(255,138,30,0.55)", color: "#FF8A1E" },
          { label: "7+",  bg: "rgba(255,138,30,0.80)", color: "#1A1300" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 22, height: 18, borderRadius: 4, background: l.bg, border: "1px solid #2C2F33" }} />
            <span style={{ fontSize: 11, color: "#9A9D9F" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   STAFF ACCESS (owner only) — create/manage staff logins
   ============================================================ */
function StaffAccess({ staffUsers, persistStaff, session, jobs, persistJobs }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [staffError, setStaffError] = useState("");
  const [busy, setBusy] = useState(false);

  const apiCall = async (method, body) => {
    const secret = import.meta.env.VITE_API_SECRET;
    if (!secret) { return { error: 'API_SECRET not configured — check Vercel environment variables.' }; }
    const res = await fetch("/api/staff", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    return result;
  };

  const save = async (user) => {
    setBusy(true); setStaffError("");
    try {
      if (editing) {
        const result = await apiCall("PUT", user);
        if (result.error) { setStaffError(result.error); return; }
        persistStaff(staffUsers.map((u) => (u.id === user.id ? { ...u, ...user } : u)));
      } else {
        const result = await apiCall("POST", user);
        if (result.error) { setStaffError(result.error); return; }
        persistStaff([...staffUsers, { ...user, id: result.id, created_at: new Date().toISOString() }]);
      }
      setShowForm(false); setEditing(null);
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (id === session.id) { setStaffError("You can't remove your own account."); return; }
    const user = staffUsers.find((u) => u.id === id);
    if (!user) return;
    if (!window.confirm(`Remove ${user.name}? Their name stays on historical jobs.`)) return;
    setBusy(true);
    const result = await apiCall("DELETE", { id });
    setBusy(false);
    if (result.error) { setStaffError(result.error); return; }
    persistStaff(staffUsers.filter((u) => u.id !== id));
  };

  return (
    <div>
      <SectionHeader title="Staff access" action={
        <button className="wj-btn wj-amber" style={{ padding: "9px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }} onClick={() => { setEditing(null); setShowForm(true); }}>
          <UserPlus size={15} /> New login
        </button>
      } />
      <div style={{ fontSize: 12.5, color: "#9A9D9F", marginBottom: 18, lineHeight: 1.5, maxWidth: 560 }}>
        Staff accounts get access to the modules assigned to them — never pricing, costing, client management, or analytics.
        Owner and accountant accounts get everything, including this page. Removing a staff member revokes their login but keeps their name on any historical job records.
      </div>
      {staffError && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 14 }}>{staffError}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {staffUsers.map((u) => (
          <div key={u.id} className="wj-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 140 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}{u.id === session.id && <span style={{ color: "#FF8A1E", fontSize: 11, marginLeft: 6 }}>(you)</span>}</div>
              <div style={{ fontSize: 12, color: "#9A9D9F" }}>@{u.username}</div>
            </div>
            <div style={{ flex: 2 }}>
              {u.role === "owner" ? (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#FF8A1E", color: "#1A1300", textTransform: "uppercase" }}>
                  Owner / full access
                </span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {(u.permissions || []).length === 0
                    ? <span style={{ fontSize: 11, color: "#5C6065", fontStyle: "italic" }}>No access assigned</span>
                    : (u.permissions || []).map((key) => {
                        const perm = PERMISSIONS.find((p) => p.key === key);
                        return perm ? (
                          <span key={key} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: "#2C2F33", color: "#C7C5BE", border: "1px solid #3A3D42" }}>
                            {perm.label}
                          </span>
                        ) : null;
                      })
                  }
                </div>
              )}
            </div>
            <div style={{ flex: 1, fontSize: 12, color: "#9A9D9F", whiteSpace: "nowrap" }}>Added {dateShort(u.createdAt)}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <IconBtn onClick={() => { setEditing(u); setShowForm(true); }} title="Edit / reset password"><ChevronRight size={14} /></IconBtn>
              <IconBtn onClick={() => remove(u.id)} title="Remove staff member"><Trash2 size={14} /></IconBtn>
            </div>
          </div>
        ))}
      </div>
      {showForm && <StaffForm user={editing} existingUsers={staffUsers} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function StaffForm({ user, existingUsers, onSave, onClose }) {
  const [form, setForm] = useState(user
    ? { ...user, password: "" }
    : { name: "", email: "", password: "", role: "staff", permissions: [] }
  );
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const togglePermission = (key) => {
    const current = form.permissions || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setForm({ ...form, permissions: next });
  };

  const submit = () => {
    if (!form.name.trim()) { setError("Enter a name."); return; }
    if (!user && !form.email.trim()) { setError("Enter an email address."); return; }
    if (!user && form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.role === "staff" && (form.permissions || []).length === 0) { setError("Select at least one access permission."); return; }
    onSave({
      id: user?.id,
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password || undefined,
      role: form.role,
      permissions: form.role === "owner" ? [] : form.permissions,
    });
  };

  return (
    <Modal onClose={onClose} title={user ? "Edit staff login" : "New staff login"}>
      <div style={{ marginBottom: 14 }}><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      {!user && <div style={{ marginBottom: 14 }}><label>Email address</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@example.com" /></div>}
      {user && <div style={{ marginBottom: 4, fontSize: 12, color: "#9A9D9F" }}>Email: {user.email}</div>}
      <div style={{ marginBottom: 18 }}>
        <label>{user ? "New password (leave blank to keep current)" : "Password (min 6 characters)"}</label>
        <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} show={showPw} setShow={setShowPw} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ marginBottom: 10 }}>Access level</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["staff", "owner"].map((r) => (
            <button key={r} className="wj-btn" onClick={() => setForm({ ...form, role: r, permissions: r === "owner" ? [] : form.permissions })}
              style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontSize: 12.5, fontWeight: 700, border: "1px solid", background: form.role === r ? "#FF8A1E" : "transparent", color: form.role === r ? "#1A1300" : "#C7C5BE", borderColor: form.role === r ? "#FF8A1E" : "#3A3D42" }}>
              {r === "owner" ? "Owner / full access" : "Staff"}
            </button>
          ))}
        </div>

        {form.role === "staff" && (
          <div>
            <div style={{ fontSize: 12, color: "#9A9D9F", marginBottom: 10 }}>Select which modules this staff member can access:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PERMISSIONS.map((p) => {
                const active = (form.permissions || []).includes(p.key);
                return (
                  <div key={p.key} onClick={() => togglePermission(p.key)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 7, border: "1px solid", cursor: "pointer", background: active ? "rgba(255,138,30,0.08)" : "#15171A", borderColor: active ? "#FF8A1E" : "#3A3D42" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${active ? "#FF8A1E" : "#5C6065"}`, background: active ? "#FF8A1E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {active && <span style={{ color: "#1A1300", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#FF8A1E" : "#E8E6DF" }}>{p.label}</div>
                      <div style={{ fontSize: 11.5, color: "#9A9D9F" }}>{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {form.role === "owner" && (
          <div style={{ fontSize: 12, color: "#9A9D9F", fontStyle: "italic" }}>Owner accounts have full access to all modules.</div>
        )}
      </div>

      {error && <div style={{ color: "#D9695A", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="wj-btn wj-ghost" style={{ padding: "10px 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 600 }} onClick={onClose}>Cancel</button>
        <button className="wj-btn wj-amber" style={{ padding: "10px 20px", borderRadius: 6, fontSize: 13.5, fontWeight: 700 }} onClick={submit}>Save login</button>
      </div>
    </Modal>
  );
}

/* ============================================================
   SHARED MODAL + MOBILE INFO
   ============================================================ */
function Modal({ children, onClose, title, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }} onClick={onClose}>
      <style>{`.modal-box { width: 100%; max-height: 92vh; border-radius: 16px 16px 0 0; padding: 20px 16px 32px; } @media (min-width: 768px) { .modal-box { width: ${wide ? "560px" : "440px"}; border-radius: 10px; padding: 22px; margin-bottom: 40px; } }`}</style>
      <div className="wj-card modal-box" style={{ overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div className="wj-h" style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
          <button className="wj-btn" style={{ background: "transparent", color: "#9A9D9F", padding: 4 }} onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MobileInfoModal({ onClose }) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <Modal onClose={onClose} title="Staff phone access">
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#C7C5BE", marginBottom: 16 }}>
        Staff open your domain address on their phone browser and sign in with the login you created for them on the Staff Access page. They'll only see the modules you assigned. For one-tap access they can use "Add to Home Screen" on their phone to install it like an app.
      </div>
      <div className="wj-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <QrCode size={28} color="#9A9D9F" />
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#E8E6DF", marginBottom: 2 }}>Your app address</div>
          <div style={{ fontSize: 12, color: "#FF8A1E", fontFamily: "monospace" }}>{url}</div>
        </div>
      </div>
      <button className="wj-btn wj-ghost" style={{ padding: "9px 14px", borderRadius: 6, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }} onClick={() => navigator.clipboard?.writeText(url)}>
        <Copy size={13} /> Copy link to share
      </button>
    </Modal>
  );
}

