import { useState, useEffect } from "react";
import axios from "axios";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
} from "recharts";

const API = "http://localhost:8000";

/* ── Design tokens ──────────────────────────────────────────────────── */
const T = {
  cream:      "#FAF6F0",
  parchment:  "#F0E8DC",
  terracotta: "#C4673A",
  terra2:     "#A84F28",
  clay:       "#E8C4A8",
  ink:        "#2A1F14",
  inkLight:   "#5C4A38",
  sage:       "#7A8C6E",
  gold:       "#C9973A",
  white:      "#FFFDF9",
};

/* ── Global styles ──────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.cream}; color: ${T.ink}; font-family: 'DM Sans', sans-serif; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }

  .fade-up  { animation: fadeUp  0.55s cubic-bezier(.22,.68,0,1.2) both; }
  .scale-in { animation: scaleIn 0.4s  cubic-bezier(.22,.68,0,1.2) both; }
  .slide-in { animation: slideIn 0.35s cubic-bezier(.22,.68,0,1.2) both; }
  .stagger-1 { animation-delay:0.05s; }
  .stagger-2 { animation-delay:0.12s; }
  .stagger-3 { animation-delay:0.19s; }
  .stagger-4 { animation-delay:0.26s; }
  .stagger-5 { animation-delay:0.33s; }

  .card {
    background: ${T.white};
    border-radius: 16px;
    box-shadow: 0 2px 0 ${T.clay}44, 0 8px 32px rgba(42,31,20,0.07);
    transition: box-shadow 0.25s, transform 0.25s;
  }
  .card:hover {
    box-shadow: 0 2px 0 ${T.clay}66, 0 16px 48px rgba(42,31,20,0.12);
    transform: translateY(-2px);
  }
  .pill {
    display: inline-flex; align-items: center;
    padding: 4px 14px; border-radius: 99px;
    font-size: 12px; font-weight: 500; letter-spacing: 0.04em;
    font-family: 'DM Sans', sans-serif;
  }
  .prod-btn {
    padding: 8px 18px; border-radius: 99px; border: 1.5px solid ${T.clay};
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em;
  }
  .prod-btn:hover { border-color:${T.terracotta}; background:${T.parchment}; }
  .upload-zone {
    border: 2px dashed ${T.clay}; border-radius:16px; background:${T.white};
    transition: border-color 0.2s, background 0.2s;
  }
  .upload-zone:hover { border-color:${T.terracotta}; background:${T.parchment}44; }
  .analyze-btn {
    background:${T.terracotta}; color:${T.white}; border:none; border-radius:99px;
    padding:13px 40px; font-family:'DM Sans',sans-serif; font-size:15px;
    font-weight:500; letter-spacing:0.06em; cursor:pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 16px ${T.terracotta}44;
  }
  .analyze-btn:hover:not(:disabled) { background:${T.terra2}; transform:translateY(-1px); box-shadow:0 8px 24px ${T.terracotta}55; }
  .analyze-btn:disabled { background:${T.clay}; box-shadow:none; cursor:not-allowed; }
  .section-rule { width:48px; height:2px; background:${T.terracotta}; border-radius:2px; margin-bottom:14px; }

  /* Brand sidebar */
  .brand-nav-item {
    display: flex; align-items: flex-start; padding: 12px 14px;
    border-radius: 12px; cursor: pointer; transition: all 0.18s;
    font-family: 'DM Sans', sans-serif; font-size: 14px;
    border: 1.5px solid transparent;
  }
  .brand-nav-item:hover { background: ${T.parchment}; border-color: ${T.clay}; }
  .brand-nav-item.active {
    background: ${T.ink}; color: ${T.white}; border-color: ${T.ink};
    box-shadow: 0 4px 16px rgba(42,31,20,0.2);
  }
  .brand-nav-item.active .brand-risk-badge { background: rgba(255,255,255,0.18); color: ${T.white}; }

  /* Product tab */
  .product-tab {
    padding: 8px 20px; border-radius: 99px; font-size: 13px; font-weight: 500;
    font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.18s;
    border: 1.5px solid ${T.clay}; background: ${T.white}; color: ${T.inkLight};
  }
  .product-tab:hover { border-color: ${T.terracotta}; background: ${T.parchment}; }
  .product-tab.active { background: ${T.terracotta}; color: ${T.white}; border-color: ${T.terracotta}; }

  input[type=file] { font-family:'DM Sans',sans-serif; font-size:14px; color:${T.inkLight}; }
  input[type=file]::file-selector-button {
    background:${T.parchment}; border:1px solid ${T.clay}; border-radius:8px;
    padding:6px 14px; font-family:'DM Sans',sans-serif; font-size:13px;
    color:${T.ink}; cursor:pointer; margin-right:12px; transition:background 0.2s;
  }
  input[type=file]::file-selector-button:hover { background:${T.clay}; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:${T.parchment}; }
  ::-webkit-scrollbar-thumb { background:${T.clay}; border-radius:3px; }
`;

function useGlobalStyles() {
  useEffect(() => {
    const id = "fashionsense-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);
}

/* ── Derive brand grouping from data ────────────────────────────────── */
// Full prefix → brand name lookup from the dataset
const BRAND_LOOKUP = {
  NK:  "Nike",
  F21: "Forever 21",
  ZA:  "Zara",
  RL:  "Ralph Lauren",
  LV:  "Levi's",
  AS:  "ASOS",
  GP:  "Gap",
  AD:  "Adidas",
  HM:  "H&M",
  SH:  "Shein",
  CK:  "Calvin Klein",
  TH:  "Tommy Hilfiger",
  MG:  "Mango",
  TS:  "Topshop",
  UQ:  "Uniqlo",
};

function extractBrand(productId, product) {
  // 1. Backend-provided brand field (most reliable)
  if (product.brand) return product.brand;
  // 2. Lookup table by product ID prefix
  const prefix = productId.split("-")[0].toUpperCase();
  if (BRAND_LOOKUP[prefix]) return BRAND_LOOKUP[prefix];
  // 3. Fallback: use prefix as-is
  return prefix || "Other";
}

function groupByBrand(products) {
  // returns { brandName: [productId, ...] }
  const map = {};
  Object.entries(products).forEach(([pid, product]) => {
    const brand = extractBrand(pid, product);
    if (!map[brand]) map[brand] = [];
    map[brand].push(pid);
  });
  return map;
}

function brandRiskSummary(productIds, products) {
  const risks = productIds.map(pid => products[pid]?.avg_return_risk ?? 0);
  const avg = Math.round(risks.reduce((a, b) => a + b, 0) / risks.length);
  const max = Math.max(...risks);
  return { avg, max };
}

/* ── Risk Ring ──────────────────────────────────────────────────────── */
function RiskRing({ value }) {
  const r = 54, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color = value > 70 ? "#8B1A1A" : value > 40 ? T.gold : T.sage;
  return (
    <div style={{ position:"relative", width:140, height:140, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      <svg width="140" height="140" style={{ transform:"rotate(-90deg)", position:"absolute" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke={T.parchment} strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1s cubic-bezier(.22,.68,0,1.2)" }} />
      </svg>
      <div style={{ position:"relative", textAlign:"center" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color, lineHeight:1 }}>{value}%</div>
        <div style={{ fontSize:11, color:T.inkLight, marginTop:4, letterSpacing:"0.08em", textTransform:"uppercase" }}>Return Risk</div>
      </div>
    </div>
  );
}

/* ── Score Bar ──────────────────────────────────────────────────────── */
const SCORE_COLORS = {
  Fit:     "#C4673A",
  Quality: "#7A8C6E",
  Style:   "#C9973A",
  Comfort: "#6B8CAE",
  Value:   "#9C6B8A",
};
function scoreColor(label, value) {
  const base = SCORE_COLORS[label] || T.inkLight;
  if (value < 3) return "#8B1A1A";
  return base;
}
function ScoreBar({ label, value }) {
  const pct = (value / 5) * 100;
  const color = scoreColor(label, value);
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:13, color:T.inkLight, letterSpacing:"0.03em" }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:600, color, fontFamily:"'Playfair Display',serif" }}>{value}</span>
      </div>
      <div style={{ height:5, background:T.parchment, borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 1s cubic-bezier(.22,.68,0,1.2)" }} />
      </div>
    </div>
  );
}

/* ── Email helpers ──────────────────────────────────────────────────── */
function buildEmailContent(productId, product, aiInsight) {
  const riskLevel = product.avg_return_risk > 70 ? "HIGH" : product.avg_return_risk > 40 ? "MEDIUM" : "LOW";
  const bar = v => "█".repeat(Math.round(v)) + "░".repeat(5 - Math.round(v)) + ` ${v}/5`;
  const brand = extractBrand(productId, product);
  const complaints = product.top_complaints.length > 0
    ? product.top_complaints.map((c,i) => `  ${i+1}. ⚠️  ${c}`).join("\n")
    : "  ✅ No major complaints identified";
  const subject = `[Quality Alert] ${productId} (${brand}) — ${riskLevel} Return Risk (${product.avg_return_risk}%) | Action Required`;
  const body = `Dear ${brand} Supplier / Quality Control Team,

Our AI-powered review analysis has flagged product ${productId} under brand ${brand} for quality review.
Please respond with a corrective action plan within 5 business days.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUCT REPORT — ${productId}
Brand: ${brand}
FashionSense AI | ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RETURN RISK: ${product.avg_return_risk}% (${riskLevel})

QUALITY SCORECARD
  Fit      ${bar(product.scores.fit)}${product.scores.fit < 3.5 ? "  ⚠️ CRITICAL" : ""}
  Quality  ${bar(product.scores.quality)}${product.scores.quality < 3.5 ? "  ⚠️ CRITICAL" : ""}
  Style    ${bar(product.scores.style)}${product.scores.style < 3.5 ? "  ⚠️ CRITICAL" : ""}
  Comfort  ${bar(product.scores.comfort)}${product.scores.comfort < 3.5 ? "  ⚠️ CRITICAL" : ""}
  Value    ${bar(product.scores.value)}${product.scores.value < 3.5 ? "  ⚠️ CRITICAL" : ""}

TOP COMPLAINTS
${complaints}

AI RECOMMENDATION
${(aiInsight||"").replace(/\*\*/g,"")}

ESTIMATED IMPACT
  At avg. ₹1,500 order value — every 100 units = ₹${(product.avg_return_risk*1500).toLocaleString("en-IN")} in potential returns

Regards,
FashionSense QC Team
`;
  return { subject, body };
}

/* ── Email Modal ────────────────────────────────────────────────────── */
function EmailModal({ productId, product, aiInsight, onClose }) {
  const [copied, setCopied] = useState(false);
  const { subject, body } = buildEmailContent(productId, product, aiInsight);
  const brand = extractBrand(productId, product);
  function handleCopy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(42,31,20,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }} onClick={onClose}>
      <div className="scale-in" onClick={e => e.stopPropagation()} style={{ background:T.white, borderRadius:20, width:"100%", maxWidth:680, maxHeight:"88vh", display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(42,31,20,0.35)", overflow:"hidden" }}>
        <div style={{ background:T.parchment, padding:"12px 20px", display:"flex", alignItems:"center", gap:8, borderBottom:`1px solid ${T.clay}` }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((c,i) => (
            <div key={i} onClick={i===0?onClose:undefined} style={{ width:12, height:12, borderRadius:"50%", background:c, cursor:i===0?"pointer":"default" }} />
          ))}
          <span style={{ flex:1, textAlign:"center", fontSize:12, color:T.inkLight, letterSpacing:"0.06em" }}>NEW MESSAGE — {brand} / {productId} QUALITY BRIEF</span>
        </div>
        <div style={{ padding:"14px 24px", borderBottom:`1px solid ${T.parchment}` }}>
          {[["To:",`supplier@${brand.toLowerCase()}.com`],["From:","qc@yourbrand.com"],["Subject:",subject]].map(([l,v]) => (
            <div key={l} style={{ display:"flex", gap:10, padding:"3px 0", fontSize:13 }}>
              <span style={{ color:T.clay, minWidth:62 }}>{l}</span>
              <span style={{ color:T.inkLight, fontWeight:l==="Subject:"?500:400 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          <pre style={{ fontFamily:"'Courier New',monospace", fontSize:12, color:T.inkLight, whiteSpace:"pre-wrap", lineHeight:1.8 }}>{body}</pre>
        </div>
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${T.parchment}`, display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 20px", borderRadius:99, border:`1px solid ${T.clay}`, background:"transparent", cursor:"pointer", fontSize:13, color:T.inkLight, fontFamily:"'DM Sans',sans-serif" }}>Close</button>
          <button onClick={handleCopy} style={{ padding:"9px 20px", borderRadius:99, border:"none", background:copied?T.sage:T.parchment, color:copied?T.white:T.ink, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}>{copied?"✓ Copied!":"Copy Email"}</button>
          <button onClick={() => { window.location.href=`mailto:supplier@${brand.toLowerCase()}.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }}
            style={{ padding:"9px 22px", borderRadius:99, border:"none", background:T.terracotta, color:T.white, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", boxShadow:`0 4px 12px ${T.terracotta}44` }}>
            ✉ Open in Mail App
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Brand Sidebar ──────────────────────────────────────────────────── */
function BrandSidebar({ brandMap, products, selectedBrand, onSelectBrand }) {
  return (
    <aside style={{ width:260, flexShrink:0, position:"sticky", top:88, alignSelf:"flex-start", maxHeight:"calc(100vh - 108px)", overflowY:"auto" }}>
      {/* Sidebar header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, paddingLeft:4 }}>
        <div style={{ width:3, height:16, background:T.terracotta, borderRadius:2 }} />
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:13, fontWeight:600, color:T.ink, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Brands
        </span>
        <span style={{ marginLeft:"auto", fontSize:11, color:T.inkLight, background:T.parchment, padding:"2px 8px", borderRadius:99 }}>
          {Object.keys(brandMap).length}
        </span>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {Object.entries(brandMap).map(([brand, pids]) => {
          const { avg, max } = brandRiskSummary(pids, products);
          const isActive = brand === selectedBrand;
          const riskColor = max > 70 ? "#C4673A" : max > 40 ? T.gold : T.sage;
          const riskBg    = max > 70 ? "#F5EAE6" : max > 40 ? "#FDF6E8" : "#EBF5EE";

          return (
            <div
              key={brand}
              className={`brand-nav-item${isActive ? " active" : ""}`}
              onClick={() => onSelectBrand(brand)}
              style={{ gap:12 }}
            >
              {/* Brand monogram avatar */}
              <div style={{
                width:36, height:36, borderRadius:10, flexShrink:0,
                background: isActive ? "rgba(255,255,255,0.18)" : T.parchment,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700,
                color: isActive ? T.white : T.terracotta,
                border: isActive ? "1.5px solid rgba(255,255,255,0.25)" : `1.5px solid ${T.clay}`,
                letterSpacing:"-0.02em",
              }}>
                {brand[0].toUpperCase()}
              </div>

              {/* Brand name + product count — NO truncation */}
              <div style={{ flex:1 }}>
                <div style={{
                  fontWeight:600, fontSize:13.5,
                  color: isActive ? T.white : T.ink,
                  fontFamily:"'DM Sans',sans-serif",
                  lineHeight:1.2,
                  /* Allow wrapping so long names show fully */
                  whiteSpace:"normal", wordBreak:"break-word",
                }}>
                  {brand}
                </div>
                <div style={{
                  fontSize:11, marginTop:3,
                  color: isActive ? "rgba(255,255,255,0.55)" : T.inkLight,
                  fontFamily:"'DM Sans',sans-serif",
                }}>
                  {pids.length} product{pids.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Risk badge — compact but visible */}
              <div style={{
                padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:700,
                background: isActive ? "rgba(255,255,255,0.18)" : riskBg,
                color: isActive ? T.white : riskColor,
                flexShrink:0, letterSpacing:"0.02em",
                border: isActive ? "1px solid rgba(255,255,255,0.2)" : `1px solid ${riskColor}44`,
              }}>
                {avg}%
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ── Brand Overview Card ────────────────────────────────────────────── */
function BrandOverviewCard({ brand, productIds, products }) {
  const risks = productIds.map(pid => products[pid]?.avg_return_risk ?? 0);
  const avgRisk = Math.round(risks.reduce((a,b) => a+b, 0) / risks.length);
  const highRisk = risks.filter(r => r > 70).length;
  const medRisk  = risks.filter(r => r > 40 && r <= 70).length;
  const lowRisk  = risks.filter(r => r <= 40).length;

  return (
    <div className="card fade-up" style={{ padding:"24px 28px", marginBottom:20, display:"flex", alignItems:"center", gap:32, flexWrap:"wrap" }}>
      <div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:T.ink, letterSpacing:"-0.01em" }}>{brand}</div>
        <div style={{ fontSize:13, color:T.inkLight, marginTop:2 }}>{productIds.length} products analysed</div>
      </div>
      <div style={{ width:1, height:48, background:T.clay, opacity:0.5 }} />
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color: avgRisk>70?"#8B1A1A":avgRisk>40?T.gold:T.sage }}>{avgRisk}%</div>
        <div style={{ fontSize:11, color:T.inkLight, letterSpacing:"0.08em", textTransform:"uppercase" }}>Avg. Return Risk</div>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {[["⚠ High", highRisk, "#F5E6E6", "#8B1A1A"], ["◎ Medium", medRisk, "#FDF8ED", T.gold], ["✓ Low", lowRisk, "#EFF6F0", T.sage]].map(([label, count, bg, fg]) => (
          <div key={label} style={{ padding:"8px 16px", borderRadius:10, background:bg, textAlign:"center" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:fg }}>{count}</div>
            <div style={{ fontSize:11, color:fg, letterSpacing:"0.06em" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Supplier Email Section (per-brand) ─────────────────────────────── */
function SupplierEmailSection({ brand, productIds, products, aiInsights }) {
  const [openModal, setOpenModal] = useState(null);
  if (!productIds.length) return null;
  const active = openModal ? products[openModal] : null;
  return (
    <div className="card fade-up stagger-5" style={{ padding:32, marginTop:24 }}>
      <div className="section-rule" />
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:600, color:T.ink, marginBottom:6 }}>Supplier Correction Briefs — {brand}</h2>
      <p style={{ fontSize:13, color:T.inkLight, marginBottom:20, lineHeight:1.6 }}>Select a product to generate a ready-to-send quality correction email pre-filled with scores, complaints, and AI recommendations.</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
        {productIds.map(pid => {
          const product = products[pid];
          const r = product.avg_return_risk;
          const isH = r>70, isM = r>40;
          const bg     = isH?"#EDD5CC":isM?"#EDE0C8":"#C8DDD0";
          const fg     = isH?"#7A2518":isM?"#6B4A08":"#2D6644";
          const border = isH?"#C4875A":isM?"#C4A050":"#6AAA80";
          const dot    = isH?T.terracotta:isM?T.gold:T.sage;
          return (
            <button key={pid} onClick={() => setOpenModal(pid)}
              style={{ padding:"10px 20px", borderRadius:99, border:`1.5px solid ${border}`, background:bg, color:fg, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:8, transition:"transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 6px 16px ${dot}44`; }}
              onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:dot, display:"inline-block", flexShrink:0 }} />
              <span>{pid}</span>
              <span style={{ opacity:0.75, fontSize:12 }}>{r}% risk</span>
              <span style={{ fontSize:11, opacity:0.5 }}>→</span>
            </button>
          );
        })}
      </div>
      {openModal && active && (
        <EmailModal productId={openModal} product={active} aiInsight={aiInsights?.[openModal]||""} onClose={() => setOpenModal(null)} />
      )}
    </div>
  );
}

/* ── Product Detail Panel ───────────────────────────────────────────── */
function ProductDetailPanel({ data, productIds, animKey }) {
  const [selectedProduct, setSelectedProduct] = useState(productIds[0]);
  const [localAnim, setLocalAnim] = useState(0);

  // Reset to first product when brand changes
  useEffect(() => {
    setSelectedProduct(productIds[0]);
    setLocalAnim(k => k + 1);
  }, [productIds]);

  function selectProduct(pid) { setSelectedProduct(pid); setLocalAnim(k => k+1); }

  const product = data.products[selectedProduct];

  const radarData = product ? [
    { dim:"Fit",     score:product.scores.fit },
    { dim:"Quality", score:product.scores.quality },
    { dim:"Style",   score:product.scores.style },
    { dim:"Comfort", score:product.scores.comfort },
    { dim:"Value",   score:product.scores.value },
  ] : [];

  const barData = product ? Object.entries(product.scores).map(([k,v]) => ({
    name: k.charAt(0).toUpperCase()+k.slice(1), value: v,
    fill: scoreColor(k.charAt(0).toUpperCase()+k.slice(1), v),
  })) : [];

  if (!product) return null;

  return (
    <div>
      {/* Product tab selector */}
      <div className="fade-up" style={{ marginBottom:20, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontStyle:"italic", color:T.inkLight, marginRight:4 }}>Product:</span>
        {productIds.map(pid => (
          <button key={pid} className={`product-tab${pid===selectedProduct?" active":""}`} onClick={() => selectProduct(pid)}>
            {pid}
            <span style={{ marginLeft:6, fontSize:11, opacity:0.7 }}>
              {data.products[pid].avg_return_risk > 70 ? "⚠" : data.products[pid].avg_return_risk > 40 ? "◎" : "✓"}
            </span>
          </button>
        ))}
      </div>

      <div key={`p-${animKey}-${localAnim}-${selectedProduct}`}>
        {/* Row 1: Risk + Scores */}
        <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:20, marginBottom:20 }}>
          <div className="card fade-up stagger-1" style={{ padding:32, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
            <div className="section-rule" style={{ alignSelf:"flex-start" }} />
            <h2 style={{ alignSelf:"flex-start", fontFamily:"'Playfair Display',serif", fontSize:18, color:T.ink }}>Return Risk Index</h2>
            <RiskRing value={product.avg_return_risk} />
            <div style={{ width:"100%", textAlign:"center", padding:"10px 20px", borderRadius:10, background:product.avg_return_risk>70?"#F5E6E6":product.avg_return_risk>40?"#FDF8ED":"#EFF6F0" }}>
              <span style={{ fontSize:13, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase", color:product.avg_return_risk>70?"#8B1A1A":product.avg_return_risk>40?T.gold:T.sage }}>
                {product.avg_return_risk>70?"⚠ High Risk — Immediate Action":product.avg_return_risk>40?"◎ Medium Risk — Monitor":"✓ Low Risk — Looking Good"}
              </span>
            </div>
          </div>

          <div className="card fade-up stagger-2" style={{ padding:32 }}>
            <div className="section-rule" />
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.ink, marginBottom:24 }}>Product Health Scores</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 40px", marginBottom:20 }}>
              <div>{["fit","quality","style"].map(k => <ScoreBar key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} value={product.scores[k]} />)}</div>
              <div>{["comfort","value"].map(k => <ScoreBar key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} value={product.scores[k]} />)}</div>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={barData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fill:T.inkLight }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,5]} hide />
                <Tooltip contentStyle={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, background:T.white, border:`1px solid ${T.clay}`, borderRadius:8, color:T.ink }} cursor={{ fill:`${T.parchment}88` }} />
                <Bar dataKey="value" radius={[5,5,0,0]}>
                  {barData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Radar + Complaints */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          <div className="card fade-up stagger-3" style={{ padding:32 }}>
            <div className="section-rule" />
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.ink, marginBottom:8 }}>Dimension Overview</h2>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.clay} strokeOpacity={1} />
                <PolarAngleAxis dataKey="dim" tick={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fill:T.inkLight }} />
                <Radar dataKey="score" fill={T.terracotta} fillOpacity={0.28} stroke={T.terracotta} strokeWidth={2.5}
                  dot={({ cx, cy, payload }) => (
                    <g key={`dot-${cx}-${cy}`}>
                      <circle cx={cx} cy={cy} r={6} fill={T.terracotta} stroke={T.white} strokeWidth={2} />
                      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fill={T.inkLight} fontFamily="'DM Sans',sans-serif" fontWeight={600}>
                        {payload.score}
                      </text>
                    </g>
                  )} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="card fade-up stagger-4" style={{ padding:32 }}>
            <div className="section-rule" />
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.ink, marginBottom:20 }}>Top Complaints</h2>
            {product.top_complaints.length === 0
              ? <div style={{ display:"flex", alignItems:"center", gap:10, color:T.sage, fontSize:14 }}><span style={{ fontSize:22 }}>✓</span> No major complaints — product is performing well.</div>
              : product.top_complaints.map((c,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"14px 0", borderBottom:i<product.top_complaints.length-1?`1px solid ${T.parchment}`:"none" }}>
                  <span style={{ minWidth:26, height:26, borderRadius:"50%", background:T.terracotta, color:T.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>{i+1}</span>
                  <span style={{ color:T.inkLight, fontSize:14, lineHeight:1.6 }}>{c}</span>
                </div>
              ))}
          </div>
        </div>

        {/* AI Recommendation */}
        {data.ai_insights[selectedProduct] && (
          <div className="card fade-up" style={{ padding:36, marginBottom:20, background:T.white, borderLeft:`4px solid ${T.terracotta}` }}>
            <div className="section-rule" />
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:600, color:T.ink, marginBottom:18 }}>Executive Recommendation</h2>
            <p style={{ color:T.inkLight, fontSize:15, lineHeight:1.9, whiteSpace:"pre-wrap", fontWeight:400 }}>
              {data.ai_insights[selectedProduct].replace(/\*\*/g,"")}
            </p>
          </div>
        )}

        {/* Recent Reviews */}
        <div className="card fade-up" style={{ padding:32 }}>
          <div className="section-rule" />
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:T.ink, marginBottom:20 }}>Recent Reviews</h2>
          {data.reviews.filter(r => r.product_id===selectedProduct).slice(0,5).map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"14px 0", borderBottom:i<4?`1px solid ${T.parchment}`:"none" }}>
              <span className="pill" style={{
                background: r.sentiment==="POSITIVE"?"#EAF3EB": r.sentiment==="NEGATIVE"?"#F8EAE6":"#F0E8DC",
                color: r.sentiment==="POSITIVE"?"#3D6644": r.sentiment==="NEGATIVE"?"#8B3020":T.inkLight,
                minWidth:80, justifyContent:"center",
              }}>
                {r.sentiment}
              </span>
              <span className="pill" style={{ background:T.parchment, color:T.inkLight, minWidth:72, justifyContent:"center" }}>
                Risk {r.risk}%
              </span>
              <span style={{ color:T.inkLight, fontSize:14, lineHeight:1.6 }}>{r.translated}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  useGlobalStyles();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [animKey, setAnimKey] = useState(0);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true); setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${API}/analyze`, form);
      setData(res.data);
      const brands = Object.keys(groupByBrand(res.data.products));
      setSelectedBrand(brands[0] || "");
      setAnimKey(k => k+1);
    } catch (e) {
      setError("Analysis failed: " + (e.response?.data?.detail || e.message));
    }
    setLoading(false);
  }

  function selectBrand(brand) { setSelectedBrand(brand); setAnimKey(k => k+1); }

  const brandMap = data ? groupByBrand(data.products) : {};
  const brandProductIds = (selectedBrand && brandMap[selectedBrand]) ? brandMap[selectedBrand] : [];

  return (
    <div style={{ minHeight:"100vh", background:T.cream, padding:"0 0 60px" }}>
      {/* Header */}
      <header style={{ background:T.ink, padding:"0 48px", display:"flex", alignItems:"center", justifyContent:"space-between", height:72, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 24px rgba(42,31,20,0.2)" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:T.white, letterSpacing:"-0.01em" }}>FashionSense</span>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontStyle:"italic", color:T.clay }}>AI</span>
        </div>
        <span style={{ fontSize:11, color:T.white, letterSpacing:"0.18em", textTransform:"uppercase", opacity:0.85 }}>Multilingual Product Intelligence</span>
      </header>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 24px 0" }}>
        {/* Upload */}
        <div className="fade-up upload-zone" style={{ padding:"48px 40px", textAlign:"center", marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:600, color:T.ink, marginBottom:28, lineHeight:1.2 }}>Upload Customer Reviews</h1>
          <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} style={{ display:"block", margin:"0 auto 24px" }} />
          <button className="analyze-btn" onClick={handleAnalyze} disabled={!file||loading}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:16, height:16, border:`2px solid ${T.white}44`, borderTopColor:T.white, borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite" }} />
                  Analysing — 1 to 2 min
                </span>
              : "Analyse Reviews →"}
          </button>
          {error && <p style={{ color:T.terracotta, marginTop:14, fontSize:13 }}>{error}</p>}
        </div>

        {data && Object.keys(brandMap).length > 0 && (
          <div key={`outer-${animKey}`} style={{ display:"flex", gap:24, alignItems:"flex-start" }}>

            {/* ── Left: Brand Sidebar ── */}
            <BrandSidebar
              brandMap={brandMap}
              products={data.products}
              selectedBrand={selectedBrand}
              onSelectBrand={selectBrand}
            />

            {/* ── Right: Brand content ── */}
            <div style={{ flex:1, minWidth:0 }} className="slide-in">

              {selectedBrand && brandProductIds.length > 0 && (
                <>
                  {/* Brand overview summary */}
                  <BrandOverviewCard
                    brand={selectedBrand}
                    productIds={brandProductIds}
                    products={data.products}
                  />

                  {/* Product detail drill-down */}
                  <ProductDetailPanel
                    data={data}
                    productIds={brandProductIds}
                    animKey={animKey}
                  />

                  {/* Supplier email section for this brand's products */}
                  <SupplierEmailSection
                    brand={selectedBrand}
                    productIds={brandProductIds}
                    products={data.products}
                    aiInsights={data.ai_insights}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
