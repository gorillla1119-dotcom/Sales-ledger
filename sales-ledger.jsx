import { useState, useRef, useMemo, useEffect } from "react";

const GIST_FILE  = "sales-ledger.json";
const CFG_KEY    = "sl_gist_config"; // localStorage key for token+gistId

const formatNumber = (n) => n.toLocaleString("th-TH");

// ── Load/save config (token & gist ID) from localStorage ──
const loadConfig = () => {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)) || null; } catch { return null; }
};
const saveConfig = (cfg) => {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {}
};

// ── GitHub Gist API helpers ──
const cloudLoad = async (cfg) => {
  try {
    const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
      headers: { Authorization: `token ${cfg.token}` },
    });
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    const content = data.files?.[GIST_FILE]?.content;
    return content ? JSON.parse(content) : null;
  } catch { return null; }
};

const cloudSave = async (cfg, entries) => {
  try {
    await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: { [GIST_FILE]: { content: JSON.stringify(entries) } },
      }),
    });
  } catch {}
};

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const THAI_MONTHS_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

const toThaiDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${String(parseInt(y)+543).slice(2)}`;
};
const toThaiMonthYear = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${THAI_MONTHS_FULL[parseInt(m)-1]} ${parseInt(y)+543}`;
};
const todayISO = () => new Date().toISOString().split("T")[0];
const toYM = (dateStr) => dateStr ? dateStr.slice(0,7) : "";

const TYPES = {
  income:  { label: "รับเงิน (+)",   color: "#22c55e", sign:  1 },
  expense: { label: "จ่าย/โอน (−)", color: "#ef4444", sign: -1 },
};

const S_INPUT = {
  background: "#12121a", border: "1px solid #2a2a38", borderRadius: 8,
  padding: "9px 12px", color: "#e8e6df", fontSize: 14, fontFamily: "inherit", outline: "none",
};

export default function SalesLedger() {
  const today = todayISO();
  const currentYM = today.slice(0,7);

  const DEFAULT_ENTRIES = [
    { id:101, note:"ขาย 1",    amount:1450, type:"income",  date:"2026-05-10" },
    { id:102, note:"ขาย 2",    amount:1300, type:"income",  date:"2026-05-10" },
    { id:103, note:"ขาย 3",    amount:1600, type:"income",  date:"2026-05-10" },
    { id:104, note:"ขาย 4",    amount:1450, type:"income",  date:"2026-05-10" },
    { id:105, note:"ขาย 5",    amount:1300, type:"income",  date:"2026-05-10" },
    { id:106, note:"ขาย 6",    amount:1450, type:"income",  date:"2026-05-10" },
    { id:107, note:"โอน",      amount:1050, type:"expense", date:"2026-05-10" },
    { id:108, note:"โอน",      amount:4530, type:"expense", date:"2026-05-10" },
    { id:109, note:"โอน",      amount:1250, type:"expense", date:"2026-05-10" },
    { id:2,  note:"รายการ 7", amount:1550, type:"income",  date: today },
    { id:3,  note:"โอน",      amount: 520, type:"expense", date: today },
    { id:4,  note:"รายการ 8", amount:1650, type:"income",  date: today },
    { id:5,  note:"โอน",      amount:1600, type:"expense", date: today },
    { id:6,  note:"โอน",      amount: 850, type:"expense", date: today },
    { id:7,  note:"รายการ 9", amount:1300, type:"income",  date: today },
    { id:8,  note:"โอน",      amount: 860, type:"expense", date: today },
    { id:9,  note:"โอน",      amount: 500, type:"expense", date: today },
    { id:10, note:"ขาย 1",    amount:1600, type:"income",  date:"2026-05-01" },
    { id:11, note:"ขาย 2",    amount:1300, type:"income",  date:"2026-05-01" },
    { id:12, note:"ขาย 3",    amount:1300, type:"income",  date:"2026-05-01" },
    { id:13, note:"ขาย 4",    amount:1300, type:"income",  date:"2026-05-01" },
    { id:14, note:"ขาย 5",    amount:1300, type:"income",  date:"2026-05-01" },
    { id:15, note:"ขาย 6",    amount:1300, type:"income",  date:"2026-05-01" },
    { id:16, note:"ขาย 7",    amount:1300, type:"income",  date:"2026-05-01" },
    { id:17, note:"โอน",       amount:9400, type:"expense", date:"2026-05-01" },
  ];

  const [entries, setEntries] = useState(DEFAULT_ENTRIES);
  const [loadState, setLoadState] = useState("loading"); // "loading" | "ready"
  const [cfg, setCfg] = useState(null); // { token, gistId }
  const [setupToken, setSetupToken] = useState("");
  const [setupGistId, setSetupGistId] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const saved = loadConfig();
    if (saved?.token && saved?.gistId) {
      setCfg(saved);
    } else {
      setLoadState("setup");
    }
  }, []);

  // When cfg is ready, load entries from Gist
  useEffect(() => {
    if (!cfg) return;
    setLoadState("loading");
    cloudLoad(cfg).then(saved => {
      if (saved && Array.isArray(saved)) setEntries(saved);
      setLoadState("ready");
    }).catch(() => setLoadState("ready"));
  }, [cfg]);

  // Auto-save every time entries change
  const didLoad = useRef(false);
  useEffect(() => {
    if (loadState !== "ready" || !cfg) return;
    if (!didLoad.current) { didLoad.current = true; return; }
    cloudSave(cfg, entries);
  }, [entries, loadState]);

  const handleSetup = async () => {
    if (!setupToken.trim() || !setupGistId.trim()) {
      setSetupError("กรุณากรอกให้ครบทั้ง 2 ช่อง");
      return;
    }
    setSetupLoading(true);
    setSetupError("");
    const newCfg = { token: setupToken.trim(), gistId: setupGistId.trim() };
    const result = await cloudLoad(newCfg);
    if (result === null) {
      // try to verify by checking if gist exists
      try {
        const res = await fetch(`https://api.github.com/gists/${newCfg.gistId}`, {
          headers: { Authorization: `token ${newCfg.token}` },
        });
        if (!res.ok) throw new Error();
      } catch {
        setSetupError("Token หรือ Gist ID ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        setSetupLoading(false);
        return;
      }
    }
    saveConfig(newCfg);
    setCfg(newCfg);
    setSetupLoading(false);
  };

  // ── Month selector ──
  const allMonths = useMemo(() => {
    const set = new Set(entries.map(e => toYM(e.date)));
    return [...set].sort();
  }, [entries]);

  const [viewYM, setViewYM] = useState(currentYM);

  // ensure viewYM is valid when months change
  const safeViewYM = allMonths.includes(viewYM) ? viewYM : (allMonths[allMonths.length-1] || currentYM);

  // ── Running balance across ALL entries (sorted by date) ──
  const sortedEntries = useMemo(() =>
    [...entries].sort((a,b) => a.date.localeCompare(b.date)), [entries]);

  const globalRunning = useMemo(() => {
    return sortedEntries.reduce((acc, e, i) => {
      const prev = i === 0 ? 0 : acc[i-1];
      acc.push(prev + TYPES[e.type].sign * e.amount);
      return acc;
    }, []);
  }, [sortedEntries]);

  // balance carried into current view month (sum of all entries BEFORE this month)
  const carryIn = useMemo(() => {
    let sum = 0;
    for (const e of sortedEntries) {
      if (toYM(e.date) < safeViewYM) sum += TYPES[e.type].sign * e.amount;
    }
    return sum;
  }, [sortedEntries, safeViewYM]);

  // entries for the viewed month
  const monthEntries = useMemo(() =>
    sortedEntries.filter(e => toYM(e.date) === safeViewYM), [sortedEntries, safeViewYM]);

  // running balance within the month (starting from carryIn)
  const monthRunning = useMemo(() =>
    monthEntries.reduce((acc, e, i) => {
      const prev = i === 0 ? carryIn : acc[i-1];
      acc.push(prev + TYPES[e.type].sign * e.amount);
      return acc;
    }, []), [monthEntries, carryIn]);

  const monthIncome  = monthEntries.filter(e => e.type==="income").reduce((s,e)=>s+e.amount, 0);
  const monthExpense = monthEntries.filter(e => e.type==="expense").reduce((s,e)=>s+e.amount, 0);
  const monthBalance = monthRunning[monthRunning.length-1] ?? carryIn;

  // overall balance
  const totalBalance = globalRunning[globalRunning.length-1] ?? 0;

  // ── Form state ──
  const [note, setNote]   = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType]   = useState("income");
  const [date, setDate]   = useState(today);
  const [editId, setEditId] = useState(null);
  const noteRef = useRef();

  // ── Modal state ──
  const [copied, setCopied]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportText, setExportText] = useState("");
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportFilter, setExportFilter] = useState("all"); // "all" | "range" | "last5" | "last10"
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo]     = useState("");

  // ── Confirm dialog state ──
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete'|'edit', entry, payload }

  const handleAdd = () => {
    const val = parseFloat(String(amount).replace(/,/g,""));
    if (!val || val <= 0 || !note.trim()) return;
    if (editId !== null) {
      // require confirmation before saving edit
      setConfirmAction({ type: 'edit', payload: { id: editId, note, amount: val, type, date } });
    } else {
      const newEntry = { id: Date.now(), note, amount:val, type, date };
      setEntries(prev => [...prev, newEntry]);
      setViewYM(toYM(date));
      setNote(""); setAmount(""); setType("income"); setDate(today);
      noteRef.current?.focus();
    }
  };

  const confirmEdit = () => {
    const { id, note, amount, type, date } = confirmAction.payload;
    s
