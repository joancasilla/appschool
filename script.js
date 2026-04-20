//===================================================================
// COLEGIATURA SMP — script.js (Refactored, Reactive)
//===================================================================

// ── 0. DATA ──────────────────────────────────────────────────────
const colegiaturaBase = {
  "Inicial":    141993.42,
  "Primaria":   143351.52,
  "Secundaria": 152837.67
};

const yearFinal = {
  "2022-2023": { "Inicial": 68235.61,  "Primaria": 86011.28,  "Secundaria": 91745.36  },
  "2023-2024": { "Inicial": 83506.09,  "Primaria": 92970.11,  "Secundaria": 99984.63  },
  "2024-2025": { "Inicial": 102326.25, "Primaria": 109541.56, "Secundaria": 117806.38 },
  "2025-2026": { "Inicial": 115488.75, "Primaria": 123632.19, "Secundaria": 132960.13 },
  "2026-2027": { "Inicial": 141993.42, "Primaria": 143351.52, "Secundaria": 152837.67 }
};

const familyDiscounts = [0, 5, 10, 15, 25];

function getPlanDiscountPct(plan) {
  if (plan.includes("Plan B")) return 8;
  if (plan.includes("Plan C")) return 16;
  return 0;
}

function distributeColegiatura(planName, total) {
  const schedule = [];
  if (planName === "Plan A - 10 pagos") {
    const ini = total * 0.16;
    const cuota = (total - ini) / 10;
    schedule.push({ month: 0, label: "Cuota Inicial (16%)", amount: ini });
    for (let i = 1; i <= 10; i++) schedule.push({ month: i, label: `Cuota ${i}`, amount: cuota });
  } else if (planName === "Plan A - 11 pagos") {
    const ini = total * 0.16;
    const cuota = (total - ini) / 11;
    schedule.push({ month: 0, label: "Cuota Inicial (16%)", amount: ini });
    for (let i = 1; i <= 11; i++) schedule.push({ month: i, label: `Cuota ${i}`, amount: cuota });
  } else if (planName === "Plan B - 2 pagos") {
    const ini = total * 0.55;
    schedule.push({ month: 0, label: "Cuota Inicial — Colegiatura", amount: ini });
    schedule.push({ month: 4, label: "Cuota Final — Colegiatura", amount: total - ini });
  } else if (planName === "Plan C - 1 pago") {
    schedule.push({ month: 0, label: "Pago Único — Colegiatura", amount: total });
  }
  return schedule;
}

function distributeExtraCost(distType, totalCost) {
  const d = parseInt(distType, 10) || 1;
  if (d === 1) return [totalCost];
  return Array.from({ length: d }, () => totalCost / d);
}

function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateDMY(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ── 1. DOM REFS ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const studentContainer     = $("studentContainer");
const discountContainer    = $("discountContainer");
const extraProgramsContainer = $("extraProgramsContainer");

// ── 2. STATE ─────────────────────────────────────────────────────
let students = [];
let discounts = [];
let extraPrograms = [];
let idCounter = 0;
const nextId = () => ++idCounter;

// ── 3. INIT ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  $("inputFechaEmision").value = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const next = new Date(); next.setMonth(next.getMonth() + 1);
  $("inputFechaVencimiento").value = `${next.getFullYear()}-${pad(next.getMonth()+1)}-${pad(next.getDate())}`;

  // Reactive listeners on all general inputs
  ["inputFamilia","inputFechaEmision","inputFechaVencimiento","selectAnioEscolar","selectPlan"].forEach(id => {
    $(id).addEventListener("input", recalculate);
    $(id).addEventListener("change", recalculate);
  });

  $("btnAddStudent").addEventListener("click", () => {
    if (students.length >= 5) return;
    addStudent();
    recalculate();
  });

  $("btnAddDiscount").addEventListener("click", () => {
    addDiscount();
    recalculate();
  });

  $("btnAddExtraProgram").addEventListener("click", () => {
    addExtraProgram();
    recalculate();
  });

  $("btnGenerarPDF").addEventListener("click", generatePDF);
});

// ── 4. ADD / REMOVE HELPERS ──────────────────────────────────────

function addStudent() {
  const id = nextId();
  const index = students.length;
  const num = index + 1;

  const div = document.createElement("div");
  div.className = "student-card flex flex-wrap items-center gap-2 rounded-xl p-3 border border-slate-200 bg-white hover:border-slate-300 transition-colors";
  div.dataset.id = id;
  div.innerHTML = `
    <span class="text-[10px] font-black text-white w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center shrink-0">${num}</span>
    <input type="text" placeholder="Nombre del estudiante" class="student-name flex-1 min-w-[120px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400 focus:bg-white outline-none transition-all">
    <select class="nivel-select px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-300 outline-none transition-all">
      <option value="Inicial">Inicial</option>
      <option value="Primaria">Primaria</option>
      <option value="Secundaria">Secundaria</option>
    </select>
    <button type="button" class="btn-remove text-slate-300 hover:text-red-400 transition-colors p-0.5" title="Eliminar">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;

  div.querySelector(".btn-remove").addEventListener("click", () => {
    students = students.filter(s => s.id !== id);
    div.remove();
    renumberStudents();
    syncStudentSelectors();
    recalculate();
  });
  div.querySelector(".student-name").addEventListener("input", recalculate);
  div.querySelector(".nivel-select").addEventListener("change", recalculate);

  studentContainer.appendChild(div);
  students.push({ id, el: div });
  updateEmptyState();
  syncStudentSelectors();
}

function renumberStudents() {
  students.forEach((s, i) => {
    const badge = s.el.querySelector("span");
    if (badge) badge.textContent = i + 1;
  });
  updateEmptyState();
}

function updateEmptyState() {
  const empty = $("emptyStudents");
  if (empty) empty.style.display = students.length ? "none" : "block";
}

function syncStudentSelectors() {
  // Update all discount & program student selects to match current student count
  const buildOpts = () => {
    if (students.length === 0) return `<option value="1">Est. 1</option>`;
    return students.map((_, i) => `<option value="${i+1}">Est. ${i+1}</option>`).join("");
  };
  const opts = buildOpts();
  document.querySelectorAll(".disc-student-select, .prog-student-select").forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = opts;
    if (sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
  });
}

function addDiscount() {
  const id = nextId();
  const div = document.createElement("div");
  div.className = "discount-card flex flex-wrap items-center gap-2 rounded-xl p-3 border border-slate-200 bg-white hover:border-slate-300 transition-colors";
  div.dataset.id = id;

  const studentOpts = students.length
    ? students.map((_, i) => `<option value="${i+1}">Est. ${i+1}</option>`).join("")
    : `<option value="1">Est. 1</option>`;

  div.innerHTML = `
    <select class="disc-student-select px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm w-20 focus:ring-2 focus:ring-brand-300 outline-none transition-all">${studentOpts}</select>
    <select class="disc-type px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-300 outline-none transition-all">
      <option value="descuento">Descuento</option>
      <option value="cargo">Cargo</option>
    </select>
    <input type="text" placeholder="Concepto" class="disc-concepto flex-1 min-w-[80px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-300 outline-none transition-all">
    <div class="flex items-center gap-1">
      <input type="number" step="0.01" min="0" placeholder="%" class="disc-pct w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-right focus:ring-2 focus:ring-brand-300 outline-none transition-all">
      <span class="text-[10px] text-slate-400 font-bold">%</span>
    </div>
    <button type="button" class="btn-remove text-slate-300 hover:text-red-400 transition-colors p-0.5">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;

  div.querySelector(".btn-remove").addEventListener("click", () => {
    discounts = discounts.filter(d => d.id !== id);
    div.remove();
    recalculate();
  });
  div.querySelectorAll("input, select").forEach(el => el.addEventListener("input", recalculate));
  div.querySelectorAll("select").forEach(el => el.addEventListener("change", recalculate));

  discountContainer.appendChild(div);
  discounts.push({ id, el: div });
}

function addExtraProgram() {
  const id = nextId();
  const div = document.createElement("div");
  div.className = "program-card flex flex-wrap items-center gap-2 rounded-xl p-3 border border-slate-200 bg-white hover:border-slate-300 transition-colors";
  div.dataset.id = id;

  const studentOpts = students.length
    ? students.map((_, i) => `<option value="${i+1}">Est. ${i+1}</option>`).join("")
    : `<option value="1">Est. 1</option>`;

  div.innerHTML = `
    <select class="prog-student-select px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm w-20 focus:ring-2 focus:ring-brand-300 outline-none transition-all">${studentOpts}</select>
    <input type="text" placeholder="Nombre programa" class="prog-name flex-1 min-w-[100px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-300 outline-none transition-all">
    <input type="number" step="0.01" placeholder="Monto RD$" class="prog-cost w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-right focus:ring-2 focus:ring-brand-300 outline-none transition-all">
    <select class="prog-dist px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-300 outline-none transition-all">
      <option value="1">1 cuota</option>
      <option value="2">2 cuotas</option>
      <option value="10">10 cuotas</option>
    </select>
    <select class="prog-start px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-brand-300 outline-none transition-all">
      <option value="0">Desde Cuota Inicial</option>
      <option value="1" selected>Desde Cuota 1</option>
    </select>
    <button type="button" class="btn-remove text-slate-300 hover:text-red-400 transition-colors p-0.5">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;

  div.querySelector(".btn-remove").addEventListener("click", () => {
    extraPrograms = extraPrograms.filter(p => p.id !== id);
    div.remove();
    recalculate();
  });
  div.querySelectorAll("input, select").forEach(el => el.addEventListener("input", recalculate));
  div.querySelectorAll("select").forEach(el => el.addEventListener("change", recalculate));

  extraProgramsContainer.appendChild(div);
  extraPrograms.push({ id, el: div });
}

// ── 5. REACTIVE RECALCULATE ──────────────────────────────────────

function recalculate() {
  const familia   = $("inputFamilia").value.trim();
  const anio      = $("selectAnioEscolar").value;
  const plan      = $("selectPlan").value;
  const fechaE    = $("inputFechaEmision").value;
  const fechaV    = $("inputFechaVencimiento").value;

  // Need at minimum: students + año + plan to show preview
  if (!students.length || !anio || !plan) {
    $("recibo-container").classList.add("hidden");
    $("emptyPreview").style.display = "flex";
    $("btnGenerarPDF").classList.add("hidden");
    return;
  }

  // Show preview
  $("recibo-container").classList.remove("hidden");
  $("emptyPreview").style.display = "none";
  $("btnGenerarPDF").classList.remove("hidden");

  // Fill header fields
  $("rFechaEmision").textContent    = fmtDateDMY(fechaE);
  $("rFechaVencimiento").textContent = fmtDateDMY(fechaV);
  $("rFamilia").textContent          = familia || "—";
  $("rAnioIngreso").textContent      = anio;
  $("rPlan").textContent             = plan;
  $("rCantEstudiantes").textContent  = students.length;

  // Seniority badge
  const currentYear = 2026;
  const ingressYear = parseInt(anio.split("-")[0]) || currentYear;
  const seniority = currentYear - ingressYear;
  const badge = $("rBadge");
  const badgeIcon = $("rBadgeIcon");
  const badgeYears = $("rBadgeYears");

  badge.classList.remove("hidden");
  if (seniority >= 3) {
    badgeIcon.className = "w-11 h-11 rounded-full flex items-center justify-center bg-yellow-50 text-yellow-500";
    badgeYears.className = "text-[9px] font-bold text-center mt-0.5 text-yellow-600";
    badgeYears.textContent = `${seniority} años`;
  } else if (seniority === 2) {
    badgeIcon.className = "w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 text-slate-400";
    badgeYears.className = "text-[9px] font-bold text-center mt-0.5 text-slate-500";
    badgeYears.textContent = "2 años";
  } else if (seniority === 1) {
    badgeIcon.className = "w-11 h-11 rounded-full flex items-center justify-center bg-orange-50 text-orange-400";
    badgeYears.className = "text-[9px] font-bold text-center mt-0.5 text-orange-500";
    badgeYears.textContent = "1 año";
  } else {
    badge.classList.add("hidden");
  }

  // ── A) COLEGIATURA ──
  const planDiscount = getPlanDiscountPct(plan);
  const discountRowsGlobal = [];
  let baseSum = 0, finalSum = 0;

  students.forEach((st, index) => {
    const nivel = st.el.querySelector(".nivel-select").value;
    const nombre = st.el.querySelector(".student-name").value.trim();
    const displayName = nombre ? `${nombre} (${nivel})` : nivel;
    const base = colegiaturaBase[nivel];

    let costSoFar = 0;

    // (1) Base
    discountRowsGlobal.push({
      est: index + 1, concepto: `Colegiatura Base — ${displayName}`,
      base, pct: 100, monto: base
    });
    costSoFar += base;
    baseSum += base;

    // (2) Descuento año escolar
    const finalAnio = yearFinal[anio]?.[nivel];
    if (finalAnio != null) {
      const descAnio = costSoFar - finalAnio;
      if (descAnio > 0) {
        const pctAnio = (descAnio / costSoFar) * 100;
        discountRowsGlobal.push({
          est: index + 1, concepto: `Desc. Antigüedad (${anio})`,
          base: costSoFar, pct: -pctAnio, monto: descAnio
        });
        costSoFar = finalAnio;
      }
    }

    // (3) Descuento plan
    if (planDiscount > 0) {
      const descPlan = costSoFar * (planDiscount / 100);
      discountRowsGlobal.push({
        est: index + 1, concepto: `Desc. Plan (${plan})`,
        base: costSoFar, pct: -planDiscount, monto: descPlan
      });
      costSoFar -= descPlan;
    }

    // (4) Descuento familiar
    const famPct = familyDiscounts[index] || 0;
    if (famPct > 0) {
      const descFam = costSoFar * (famPct / 100);
      discountRowsGlobal.push({
        est: index + 1, concepto: "Desc. Familiar",
        base: costSoFar, pct: -famPct, monto: descFam
      });
      costSoFar -= descFam;
    }

    // (5) Descuentos/cargos manuales
    discounts.forEach((disc) => {
      const dEl = disc.el;
      const dEst = parseInt(dEl.querySelector(".disc-student-select").value);
      if (dEst !== index + 1) return;
      const tipo = dEl.querySelector(".disc-type").value; // "descuento" or "cargo"
      const concepto = dEl.querySelector(".disc-concepto").value.trim() || (tipo === "descuento" ? "Descuento" : "Cargo");
      const rawPct = Math.abs(parseFloat(dEl.querySelector(".disc-pct").value) || 0);
      const pct = tipo === "descuento" ? -rawPct : rawPct;
      const dAmount = costSoFar * (rawPct / 100);
      discountRowsGlobal.push({
        est: index + 1, concepto, base: costSoFar, pct, monto: dAmount
      });
      costSoFar += (tipo === "descuento" ? -dAmount : dAmount);
    });

    finalSum += costSoFar;
  });

  // Render colegiatura table
  const tbody = $("tablaDescuentos");
  tbody.innerHTML = "";
  discountRowsGlobal.forEach(row => {
    const sign = row.pct < 0 ? "–" : row.pct > 0 ? "+" : "";
    const colorClass = row.pct < 0 ? "text-red-600" : row.pct > 0 ? "text-emerald-600" : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-2 py-2 text-slate-400">${row.est}</td>
      <td class="px-2 py-2">${row.concepto}</td>
      <td class="px-2 py-2 text-right font-mono text-slate-500">RD$ ${fmt(row.base)}</td>
      <td class="px-2 py-2 text-right font-mono ${colorClass}">${row.pct.toFixed(2)}%</td>
      <td class="px-2 py-2 text-right font-mono ${colorClass}">${sign} RD$ ${fmt(row.monto)}</td>
    `;
    tbody.appendChild(tr);
  });

  const totalDiff = finalSum - baseSum;
  $("totalDescuentos").textContent = `${totalDiff < 0 ? "–" : "+"} RD$ ${fmt(Math.abs(totalDiff))}`;
  $("totalDescuentos").className = `font-black text-sm ${totalDiff < 0 ? "text-red-500" : "text-emerald-600"}`;
  $("totalACobrar").textContent = `RD$ ${fmt(finalSum)}`;

  // ── B) PROGRAMAS ADICIONALES ──
  let totalExtras = 0;
  const progSchedules = [];
  const tbodyProg = $("tablaProgramas");
  tbodyProg.innerHTML = "";

  extraPrograms.forEach(ep => {
    const el = ep.el;
    const stNum = parseInt(el.querySelector(".prog-student-select").value) || 1;
    const name = el.querySelector(".prog-name").value.trim() || "Programa";
    const cost = parseFloat(el.querySelector(".prog-cost").value) || 0;
    const distType = el.querySelector(".prog-dist").value;
    const startOffset = parseInt(el.querySelector(".prog-start").value) || 0;
    if (cost <= 0) return;

    totalExtras += cost;
    const startLabel = startOffset === 0 ? "Desde Cuota Inicial" : "Desde Cuota 1";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-2 py-2 text-slate-400">${stNum}</td>
      <td class="px-2 py-2">${name}</td>
      <td class="px-2 py-2">${distType} cuota(s) · ${startLabel}</td>
      <td class="px-2 py-2 text-right font-mono">RD$ ${fmt(cost)}</td>
    `;
    tbodyProg.appendChild(tr);

    // Build month schedule for this program
    const distArray = distributeExtraCost(distType, cost);
    const months = distArray.map((amt, idx) => ({
      month: startOffset + idx,
      cuotaNum: idx + 1,
      amount: amt
    }));
    progSchedules.push({ name, months });
  });

  $("seccionProgramas").style.display = totalExtras > 0 ? "block" : "none";
  $("totalExtras").textContent = `RD$ ${fmt(totalExtras)}`;

  // ── C) ACUERDO DE PAGO (month-based timeline) ──
  const colegSchedule = distributeColegiatura(plan, finalSum);

  // Collect all months that have any payment
  const monthsSet = new Set();
  colegSchedule.forEach(c => monthsSet.add(c.month));
  progSchedules.forEach(p => p.months.forEach(m => monthsSet.add(m.month)));
  const allMonths = [...monthsSet].sort((a, b) => a - b);

  const tbodyAcuerdo = $("tablaAcuerdo");
  tbodyAcuerdo.innerHTML = "";
  let sumPagar = 0;

  allMonths.forEach(month => {
    const coleg = colegSchedule.find(c => c.month === month);
    const progsThisMonth = [];
    progSchedules.forEach(p => {
      const m = p.months.find(m => m.month === month);
      if (m) progsThisMonth.push({ name: p.name, cuotaNum: m.cuotaNum, amount: m.amount });
    });

    const colegAmt = coleg ? coleg.amount : 0;
    const progAmt = progsThisMonth.reduce((sum, p) => sum + p.amount, 0);
    const total = colegAmt + progAmt;
    sumPagar += total;

    // Build smart label
    let concepto = "";
    if (coleg && progsThisMonth.length) {
      const isRegularCuota = /^Cuota \d+$/.test(coleg.label);
      if (isRegularCuota) {
        // Plan A: "Cuota 3 + Afterschool"
        const progNames = progsThisMonth.map(p => p.name).join(", ");
        concepto = `${coleg.label} <span class="text-slate-400">+</span> ${progNames}`;
      } else {
        // Plan B/C special payments: "Cuota Final — Colegiatura + Cuota 4 — Afterschool"
        const progParts = progsThisMonth.map(p => `Cuota ${p.cuotaNum} — ${p.name}`).join(" + ");
        concepto = `${coleg.label} <span class="text-slate-400">+</span> ${progParts}`;
      }
    } else if (coleg) {
      concepto = coleg.label;
    } else {
      concepto = progsThisMonth.map(p => `Cuota ${p.cuotaNum} — ${p.name}`).join(" + ");
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-2 py-2">${concepto}</td>
      <td class="px-2 py-2 text-right font-mono">${colegAmt > 0 ? "RD$ " + fmt(colegAmt) : "—"}</td>
      <td class="px-2 py-2 text-right font-mono">${progAmt > 0 ? "RD$ " + fmt(progAmt) : "—"}</td>
      <td class="px-2 py-2 text-right font-mono font-bold">RD$ ${fmt(total)}</td>
    `;
    tbodyAcuerdo.appendChild(tr);
  });

  $("totalAPagar").textContent = `RD$ ${fmt(sumPagar)}`;
}

// ── 6. PDF GENERATION ────────────────────────────────────────────

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const el = $("recibo-printable");
  const wrapper = $("previewWrapper");
  const stickyParent = wrapper.closest(".lg\\:sticky") || wrapper.parentElement;

  // ── Temporarily neutralize all clipping/sticky/overflow ──
  const savedStyles = {
    elWidth: el.style.width,
    elBg: el.style.background,
    wrapperOverflow: wrapper.style.overflow,
    wrapperMaxH: wrapper.style.maxHeight,
    wrapperH: wrapper.style.height,
    parentPos: stickyParent.style.position,
    parentOverflow: stickyParent.style.overflow,
  };

  el.style.width = "800px";
  el.style.background = "white";
  wrapper.style.overflow = "visible";
  wrapper.style.maxHeight = "none";
  wrapper.style.height = "auto";
  stickyParent.style.position = "relative";
  stickyParent.style.overflow = "visible";

  // Scroll to top so nothing is offset
  window.scrollTo(0, 0);

  html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    scrollY: 0,
    scrollX: 0,
    windowWidth: 900,
    windowHeight: el.scrollHeight + 200,
  }).then(canvas => {
    // ── Restore styles ──
    el.style.width = savedStyles.elWidth;
    el.style.background = savedStyles.elBg;
    wrapper.style.overflow = savedStyles.wrapperOverflow;
    wrapper.style.maxHeight = savedStyles.wrapperMaxH;
    wrapper.style.height = savedStyles.wrapperH;
    stickyParent.style.position = savedStyles.parentPos;
    stickyParent.style.overflow = savedStyles.parentOverflow;

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;

    const pxPerMm = canvas.width / usableW;
    const sliceH = Math.floor(usableH * pxPerMm);

    let yOffset = 0;
    let page = 0;

    while (yOffset < canvas.height) {
      if (page > 0) pdf.addPage();

      const thisSliceH = Math.min(sliceH, canvas.height - yOffset);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = thisSliceH;
      const ctx = pageCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, yOffset, canvas.width, thisSliceH, 0, 0, canvas.width, thisSliceH);

      const imgData = pageCanvas.toDataURL("image/png");
      const imgH = thisSliceH / pxPerMm;
      pdf.addImage(imgData, "PNG", margin, margin, usableW, imgH);

      yOffset += sliceH;
      page++;
    }

    const familia = $("inputFamilia").value.trim() || "colegiatura";
    pdf.save(`${familia.toLowerCase().replace(/\s+/g, "_")}_colegiatura.pdf`);
  });
}
