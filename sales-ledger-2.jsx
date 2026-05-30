import { useState, useRef, useMemo, useEffect } from "react";

const STORAGE_KEY = "sales_ledger_entries";

const formatNumber = (n) => n.toLocaleString("th-TH");

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

  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ENTRIES;
    } catch { return DEFAULT_ENTRIES; }
  });

  // Auto-save every time entries change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
  }, [entries]);

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
    setEntries(prev => prev.map(e => e.id===id ? {...e, note, amount, type, date} : e));
    setEditId(null);
    setNote(""); setAmount(""); setType("income"); setDate(today);
    setConfirmAction(null);
    noteRef.current?.focus();
  };

  const handleEdit = (entry) => {
    setEditId(entry.id); setNote(entry.note);
    setAmount(String(entry.amount)); setType(entry.type);
    setDate(entry.date || today);
    noteRef.current?.focus();
  };

  const handleDelete = (id) => {
    const entry = entries.find(e => e.id===id);
    setConfirmAction({ type: 'delete', entry });
  };

  const confirmDelete = () => {
    const id = confirmAction.entry.id;
    setEntries(prev => prev.filter(e => e.id!==id));
    if (editId===id) { setEditId(null); setNote(""); setAmount(""); setType("income"); setDate(today); }
    setConfirmAction(null);
  };

  const handleCancel = () => { setEditId(null); setNote(""); setAmount(""); setType("income"); setDate(today); };

  const buildExportText = (filter, from, to) => {
    let filtered = monthEntries;
    let label = toThaiMonthYear(safeViewYM);
    if (filter === "last5")  { filtered = monthEntries.slice(-5);  label += " (5 รายการล่าสุด)"; }
    if (filter === "last10") { filtered = monthEntries.slice(-10); label += " (10 รายการล่าสุด)"; }
    if (filter === "range" && from && to) {
      filtered = monthEntries.filter(e => e.date >= from && e.date <= to);
      label += ` (${toThaiDate(from)} – ${toThaiDate(to)})`;
    }
    // recompute running for filtered slice
    const startIdx = monthEntries.indexOf(filtered[0]);
    const startBal = startIdx <= 0 ? carryIn : monthRunning[startIdx - 1];
    const fRunning = filtered.reduce((acc, e, i) => {
      acc.push((i===0 ? startBal : acc[i-1]) + TYPES[e.type].sign * e.amount);
      return acc;
    }, []);
    const fIncome  = filtered.filter(e=>e.type==="income").reduce((s,e)=>s+e.amount,0);
    const fExpense = filtered.filter(e=>e.type==="expense").reduce((s,e)=>s+e.amount,0);
    const fBalance = fRunning[fRunning.length-1] ?? startBal;
    return [
      `📋 สรุปรายการเงิน — ${label}`,
      `${"─".repeat(34)}`,
      filter==="all" && carryIn!==0 ? `ยอดยกมา: ${formatNumber(carryIn)} บ.` : null,
      ...filtered.map((e,i) => {
        const sign = e.type==="income" ? "+" : "−";
        return `${e.note}  ${sign}${formatNumber(e.amount)} บ.  คงเหลือ ${formatNumber(fRunning[i])} บ.`;
      }),
      `${"─".repeat(34)}`,
      `รับรวม:   +${formatNumber(fIncome)} บ.`,
      `จ่ายรวม:  −${formatNumber(fExpense)} บ.`,
      `คงเหลือ:   ${formatNumber(fBalance)} บ.`,
    ].filter(Boolean).join("\n");
  };

  const openCopyModal = () => {
    setShowExportPicker(true);
  };

  const doExport = () => {
    const lines = buildExportText(exportFilter, exportFrom, exportTo);
    setExportText(lines);
    setShowExportPicker(false);
    setShowModal(true);
    try { navigator.clipboard.writeText(lines).then(()=>setCopied(true)).catch(()=>{}); } catch(_){}
  };

  const downloadCSV = () => {
    const header = "วันที่,รายการ,ประเภท,จำนวน,คงเหลือ";
    const rows = monthEntries.map((e,i) =>
      `${toThaiDate(e.date)},"${e.note}",${e.type==="income"?"รับ":"จ่าย"},${e.amount},${monthRunning[i]}`
    );
    const csv = [header,...rows].join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url;
    a.download=`สรุปเงิน_${safeViewYM}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0f0f14", fontFamily:"'IBM Plex Sans Thai','Sarabun',sans-serif", color:"#e8e6df", padding:"24px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth:540, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, letterSpacing:"0.2em", color:"#6b6860", textTransform:"uppercase", marginBottom:3 }}>บัญชีรายวัน</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h1 style={{ fontSize:24, fontWeight:600, margin:0, color:"#f0ede6", letterSpacing:"-0.5px" }}>สรุปเงินสด</h1>
            <div style={{ fontSize:12, color:"#5a5860" }}>
              ยอดรวมทุกเดือน: <span style={{ color: totalBalance>=0?"#4ade80":"#f87171", fontWeight:600 }}>{formatNumber(totalBalance)} บ.</span>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#5a5860", marginRight:2 }}>เดือน:</span>
          {allMonths.length === 0 && (
            <span style={{ fontSize:12, color:"#44424a" }}>ยังไม่มีรายการ</span>
          )}
          {allMonths.map(ym => (
            <button key={ym} onClick={() => setViewYM(ym)} style={{
              padding:"5px 12px", borderRadius:20, fontSize:13, cursor:"pointer", fontFamily:"inherit",
              background: safeViewYM===ym ? "#1e3a5f" : "#1a1a22",
              border: safeViewYM===ym ? "1px solid #3a6aaf" : "1px solid #2a2a35",
              color: safeViewYM===ym ? "#7ab8f5" : "#7a7880",
              fontWeight: safeViewYM===ym ? 600 : 400,
              transition:"all 0.15s",
            }}>{toThaiMonthYear(ym)}</button>
          ))}
          {/* add new month shortcut */}
          <button onClick={() => {
            const next = new Date(); next.setDate(1);
            // pick a month not in list, default today's month
            setViewYM(currentYM);
            setDate(today);
            noteRef.current?.focus();
          }} style={{
            padding:"5px 10px", borderRadius:20, fontSize:12, cursor:"pointer", fontFamily:"inherit",
            background:"transparent", border:"1px dashed #3a3840", color:"#5a5860",
          }}>+ เดือนใหม่</button>
        </div>

        {/* Month Balance Card */}
        <div style={{
          background: monthBalance>=0 ? "linear-gradient(135deg,#1a2e1a,#0f1f0f)" : "linear-gradient(135deg,#2e1a1a,#1f0f0f)",
          border:`1px solid ${monthBalance>=0?"#2d4a2d":"#4a2d2d"}`,
          borderRadius:16, padding:"16px 20px", marginBottom:14,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <div style={{ fontSize:12, color:"#7a8c7a", marginBottom:2 }}>{toThaiMonthYear(safeViewYM)}</div>
            <div style={{ fontSize:28, fontWeight:600, color:monthBalance>=0?"#4ade80":"#f87171", letterSpacing:"-1px" }}>
              {formatNumber(monthBalance)} <span style={{ fontSize:14, fontWeight:400 }}>บ.</span>
            </div>
            {carryIn !== 0 && (
              <div style={{ fontSize:11, color:"#5a7060", marginTop:3 }}>
                ยอดยกมา {formatNumber(carryIn)} บ.
              </div>
            )}
          </div>
          <div style={{ textAlign:"right", fontSize:12, color:"#6b7c6b", lineHeight:2 }}>
            <div>{monthEntries.length} รายการ</div>
            <div style={{ color:"#4ade80" }}>+{formatNumber(monthIncome)}</div>
            <div style={{ color:"#f87171" }}>−{formatNumber(monthExpense)}</div>
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <button onClick={openCopyModal} style={{
            flex:1, padding:"8px 0", borderRadius:9,
            background: copied?"#1a3a2a":"#1a1a22",
            border:`1px solid ${copied?"#3a7a5a":"#2a2a35"}`,
            color: copied?"#6adfa0":"#8a8890", fontSize:13, cursor:"pointer", fontFamily:"inherit",
          }}>{copied?"✅ คัดลอกแล้ว!":"📋 สรุป (LINE/Chat)"}</button>
          <button onClick={downloadCSV} style={{
            flex:1, padding:"8px 0", borderRadius:9,
            background:"#1a1a22", border:"1px solid #2a2a35",
            color:"#8a8890", fontSize:13, cursor:"pointer", fontFamily:"inherit",
          }}>📥 ดาวน์โหลด CSV</button>
        </div>

        {/* Input Form */}
        <div style={{ background:"#1a1a22", border:"1px solid #2a2a35", borderRadius:14, padding:16, marginBottom:14 }}>
          <div style={{ fontSize:12, color:"#6b6870", marginBottom:10 }}>
            {editId ? "✏️ แก้ไขรายการ" : "เพิ่มรายการใหม่"}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            {Object.entries(TYPES).map(([k,v]) => (
              <button key={k} onClick={()=>setType(k)} style={{
                flex:1, padding:"7px 0", borderRadius:8, fontFamily:"inherit",
                border: type===k ? `1px solid ${v.color}` : "1px solid #2a2a35",
                background: type===k ? `${v.color}18` : "transparent",
                color: type===k ? v.color : "#6b6870",
                fontSize:13, fontWeight:500, cursor:"pointer",
              }}>{v.label}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{ ...S_INPUT, fontSize:13, padding:"7px 10px", flex:"0 0 auto" }} />
            <input ref={noteRef} value={note} onChange={e=>setNote(e.target.value)}
              placeholder="รายละเอียด" onKeyDown={e=>e.key==="Enter"&&handleAdd()}
              style={{ ...S_INPUT, flex:2, minWidth:80 }} />
            <input value={amount} onChange={e=>setAmount(e.target.value)}
              placeholder="จำนวน" type="number" onKeyDown={e=>e.key==="Enter"&&handleAdd()}
              style={{ ...S_INPUT, flex:"0 0 90px" }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleAdd} style={{
              flex:1, padding:"9px 0",
              background: editId?"#1e3a5f":"#1e3a1e",
              border:`1px solid ${editId?"#3a6aaf":"#3a6a3a"}`,
              borderRadius:8, color:editId?"#7ab8f5":"#7af57a",
              fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
            }}>{editId?"บันทึกการแก้ไข":"เพิ่มรายการ"}</button>
            {editId && (
              <button onClick={handleCancel} style={{
                padding:"9px 16px", background:"transparent",
                border:"1px solid #3a2a2a", borderRadius:8,
                color:"#8c7070", fontSize:14, cursor:"pointer", fontFamily:"inherit",
              }}>ยกเลิก</button>
            )}
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ background:"#1a1a22", border:"1px solid #2a2a35", borderRadius:14, overflow:"hidden" }}>
          <div style={{ overflowY:"auto", maxHeight:"45vh", overflowX:"auto" }}>
          <div style={{
            display:"grid", gridTemplateColumns:"76px 1fr 78px 78px 78px 44px",
            padding:"8px 14px", fontSize:10, color:"#5a5860",
            letterSpacing:"0.08em", textTransform:"uppercase",
            borderBottom:"1px solid #22222e",
          }}>
            <div>วันที่</div><div>รายการ</div>
            <div style={{textAlign:"right"}}>รับ</div>
            <div style={{textAlign:"right"}}>จ่าย</div>
            <div style={{textAlign:"right"}}>คงเหลือ</div>
            <div></div>
          </div>

          {/* carry-in row */}
          {carryIn !== 0 && (
            <div style={{
              display:"grid", gridTemplateColumns:"76px 1fr 78px 78px 78px 44px",
              padding:"8px 14px", borderBottom:"1px solid #1e1e28",
              background:"#161620", alignItems:"center",
            }}>
              <div style={{ fontSize:11, color:"#4a4858", fontStyle:"italic" }}>ยกมา</div>
              <div style={{ fontSize:12, color:"#5a5870", fontStyle:"italic" }}>ยอดยกมาจากเดือนก่อน</div>
              <div style={{ textAlign:"right", fontSize:12, color:"#44444f" }}>—</div>
              <div style={{ textAlign:"right", fontSize:12, color:"#44444f" }}>—</div>
              <div style={{ textAlign:"right", fontSize:12, fontWeight:600, color: carryIn>=0?"#6a8c6a":"#8c6a6a" }}>
                {formatNumber(carryIn)}
              </div>
              <div></div>
            </div>
          )}

          {monthEntries.length === 0 && (
            <div style={{ padding:32, textAlign:"center", color:"#44424a", fontSize:13 }}>
              ไม่มีรายการในเดือนนี้
            </div>
          )}

          {monthEntries.map((entry, i) => {
            const isIncome = entry.type==="income";
            const bal = monthRunning[i];
            const isEdit = editId===entry.id;
            return (
              <div key={entry.id} style={{
                display:"grid", gridTemplateColumns:"76px 1fr 78px 78px 78px 44px",
                padding:"9px 14px", borderBottom:"1px solid #1e1e28",
                background: isEdit?"#1e2030":"transparent", alignItems:"center",
              }}>
                <div style={{ fontSize:11, color:"#6a6870" }}>{toThaiDate(entry.date)}</div>
                <div style={{ fontSize:13, color:"#c8c6c0" }}>{entry.note}</div>
                <div style={{ textAlign:"right", fontSize:13, color:isIncome?"#4ade80":"#333340", fontWeight:isIncome?500:400 }}>
                  {isIncome ? formatNumber(entry.amount) : "—"}
                </div>
                <div style={{ textAlign:"right", fontSize:13, color:!isIncome?"#f87171":"#333340", fontWeight:!isIncome?500:400 }}>
                  {!isIncome ? formatNumber(entry.amount) : "—"}
                </div>
                <div style={{ textAlign:"right", fontSize:13, fontWeight:600, color:bal>=0?"#a3e4b0":"#e4a3a3" }}>
                  {formatNumber(bal)}
                </div>
                <div style={{ display:"flex", gap:2, justifyContent:"flex-end" }}>
                  <button onClick={()=>handleEdit(entry)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, padding:"2px 3px" }}>✏️</button>
                  <button onClick={()=>handleDelete(entry.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, padding:"2px 3px" }}>🗑️</button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
        <div style={{ marginTop:12, fontSize:11, color:"#3a3840", textAlign:"center" }}>
          ยอดคำนวณอัตโนมัติ — ไม่มีผิดพลาด
        </div>
      </div>

      {/* Export Picker */}
      {showExportPicker && (
        <div onClick={()=>setShowExportPicker(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.8)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:1000, padding:16,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#1a1a22", border:"1px solid #2a2a38",
            borderRadius:16, padding:20, width:"100%", maxWidth:380,
            display:"flex", flexDirection:"column", gap:14,
          }}>
            <div style={{ fontSize:14, fontWeight:600, color:"#e8e6df" }}>📋 เลือกรายการที่จะส่ง</div>

            {/* Filter options */}
            {[
              { val:"all",   label:"ทั้งเดือน", sub: `${monthEntries.length} รายการ` },
              { val:"last5", label:"5 รายการล่าสุด", sub:"" },
              { val:"last10",label:"10 รายการล่าสุด", sub:"" },
              { val:"range", label:"เลือกช่วงวันที่", sub:"" },
            ].map(opt => (
              <div key={opt.val} onClick={()=>setExportFilter(opt.val)} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"10px 14px", borderRadius:10, cursor:"pointer",
                background: exportFilter===opt.val ? "#1e3a5f" : "#12121a",
                border: exportFilter===opt.val ? "1px solid #3a6aaf" : "1px solid #2a2a38",
                transition:"all 0.15s",
              }}>
                <div style={{
                  width:18, height:18, borderRadius:"50%", flexShrink:0,
                  border: exportFilter===opt.val ? "5px solid #7ab8f5" : "2px solid #4a4a58",
                  background: exportFilter===opt.val ? "#1e3a5f" : "transparent",
                }}/>
                <div>
                  <div style={{ fontSize:13, color:"#e8e6df", fontWeight: exportFilter===opt.val?600:400 }}>{opt.label}</div>
                  {opt.sub && <div style={{ fontSize:11, color:"#5a5870" }}>{opt.sub}</div>}
                </div>
              </div>
            ))}

            {/* Date range inputs */}
            {exportFilter==="range" && (
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="date" value={exportFrom} onChange={e=>setExportFrom(e.target.value)}
                  style={{ flex:1, background:"#12121a", border:"1px solid #2a2a38", borderRadius:8,
                    padding:"8px 10px", color:"#e8e6df", fontSize:13, fontFamily:"inherit", outline:"none" }} />
                <span style={{ color:"#5a5870", fontSize:13 }}>ถึง</span>
                <input type="date" value={exportTo} onChange={e=>setExportTo(e.target.value)}
                  style={{ flex:1, background:"#12121a", border:"1px solid #2a2a38", borderRadius:8,
                    padding:"8px 10px", color:"#e8e6df", fontSize:13, fontFamily:"inherit", outline:"none" }} />
              </div>
            )}

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowExportPicker(false)} style={{
                flex:1, padding:"10px 0", borderRadius:9, background:"transparent",
                border:"1px solid #3a3840", color:"#8a8890", fontSize:14, cursor:"pointer", fontFamily:"inherit",
              }}>ยกเลิก</button>
              <button onClick={doExport} style={{
                flex:1, padding:"10px 0", borderRadius:9,
                background:"#1e3a1e", border:"1px solid #3a6a3a",
                color:"#7af57a", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              }}>ดูตัวอย่าง →</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.8)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:1000, padding:16,
        }}>
          <div style={{
            background:"#1a1a22", border:`1px solid ${confirmAction.type==='delete'?"#4a2d2d":"#2d3a4a"}`,
            borderRadius:16, padding:24, width:"100%", maxWidth:360,
            display:"flex", flexDirection:"column", gap:16,
          }}>
            <div style={{ fontSize:22, textAlign:"center" }}>
              {confirmAction.type==='delete' ? "🗑️" : "✏️"}
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#e8e6df", marginBottom:8 }}>
                {confirmAction.type==='delete' ? "ยืนยันการลบรายการ?" : "ยืนยันการแก้ไขรายการ?"}
              </div>
              <div style={{ fontSize:13, color:"#8a8890", lineHeight:1.7 }}>
                {confirmAction.type==='delete'
                  ? <>รายการ <span style={{color:"#e8e6df",fontWeight:600}}>"{confirmAction.entry.note}"</span><br/>จำนวน <span style={{color: confirmAction.entry.type==='income'?"#4ade80":"#f87171", fontWeight:600}}>{formatNumber(confirmAction.entry.amount)} บ.</span><br/><span style={{color:"#f87171"}}>จะถูกลบถาวร ไม่สามารถกู้คืนได้</span></>
                  : <>บันทึกการแก้ไข <span style={{color:"#e8e6df",fontWeight:600}}>"{confirmAction.payload.note}"</span><br/>จำนวน <span style={{color: confirmAction.payload.type==='income'?"#4ade80":"#f87171", fontWeight:600}}>{formatNumber(confirmAction.payload.amount)} บ.</span></>
                }
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmAction(null)} style={{
                flex:1, padding:"10px 0", borderRadius:9,
                background:"transparent", border:"1px solid #3a3840",
                color:"#8a8890", fontSize:14, cursor:"pointer", fontFamily:"inherit",
              }}>ยกเลิก</button>
              <button onClick={confirmAction.type==='delete' ? confirmDelete : confirmEdit} style={{
                flex:1, padding:"10px 0", borderRadius:9,
                background: confirmAction.type==='delete' ? "#3a1a1a" : "#1e3a5f",
                border: confirmAction.type==='delete' ? "1px solid #7a3a3a" : "1px solid #3a6aaf",
                color: confirmAction.type==='delete' ? "#f87171" : "#7ab8f5",
                fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              }}>{confirmAction.type==='delete' ? "ลบเลย" : "ยืนยันแก้ไข"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {showModal && (
        <div onClick={()=>{setShowModal(false);setCopied(false);}} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:999, padding:16,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#1a1a22", border:"1px solid #2a2a38",
            borderRadius:16, padding:20, width:"100%", maxWidth:460,
            maxHeight:"80vh", display:"flex", flexDirection:"column", gap:12,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#e8e6df" }}>
                {copied?"✅ คัดลอกอัตโนมัติแล้ว!":"📋 กดปุ่มคัดลอกด้านล่าง"}
              </div>
              <button onClick={()=>{setShowModal(false);setCopied(false);}} style={{
                background:"none", border:"none", color:"#6a6870", fontSize:18, cursor:"pointer",
              }}>✕</button>
            </div>
            <textarea readOnly autoFocus onFocus={e=>e.target.select()} value={exportText}
              style={{
                background:"#12121a", border:"1px solid #2a2a38", borderRadius:10,
                padding:12, color:"#c8c6c0", fontSize:12, fontFamily:"monospace",
                lineHeight:1.7, resize:"none", outline:"none", flex:1, minHeight:240,
              }}
            />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>{
                const ta = document.querySelector("textarea[readonly]");
                if (ta) { ta.focus(); ta.select(); }
                try { if(document.execCommand("copy")){setCopied(true);return;} } catch(_){}
                try { navigator.clipboard.writeText(exportText).then(()=>setCopied(true)).catch(()=>{}); } catch(_){}
              }} style={{
                flex:1, padding:"10px 0", borderRadius:9,
                background: copied?"#1a3a2a":"#1e3a1e",
                border: copied?"1px solid #3a7a5a":"1px solid #3a6a3a",
                color: copied?"#6adfa0":"#7af57a",
                fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              }}>{copied?"✅ คัดลอกแล้ว!":"📋 คัดลอกข้อความ"}</button>
              <button onClick={()=>{setShowModal(false);setCopied(false);}} style={{
                padding:"10px 20px", borderRadius:9, background:"transparent",
                border:"1px solid #3a3840", color:"#6a6870", fontSize:14, cursor:"pointer", fontFamily:"inherit",
              }}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
