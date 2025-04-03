//-------------------------------------------------------------------
// 0. DATOS DE COLEGIATURA BASE Y DESCUENTOS EXACTOS POR AÑO ESCOLAR
//-------------------------------------------------------------------
const colegiaturaBase = {
  "Inicial": 115488.75,
  "Primaria": 123632.19,
  "Secundaria": 132960.13
};

const yearFinal = {
  "2022-2023": {
    "Inicial": 65017.26,
    "Primaria": 81954.53,
    "Secundaria": 81954.53
  },
  "2023-2024": {
    "Inicial": 79567.50,
    "Primaria": 88585.15,
    "Secundaria": 95268.82
  },
  "2024-2025": {
    "Inicial": 97500.00,
    "Primaria": 104375.00,
    "Secundaria": 112250.00
  },
  "2025-2026": {
    "Inicial": null,
    "Primaria": null,
    "Secundaria": null
  }
};

const familyDiscounts = [0, 5, 10, 15, 25];

//-------------------------------------------------------------------
// 1. FUNCIONES PLAN COLEGIATURA
//-------------------------------------------------------------------
function getPlanDiscountPct(plan) {
  if (plan.includes("Plan B")) return 8;   // B => 8%
  if (plan.includes("Plan C")) return 16;  // C => 16%
  return 0; // Plan A => 0
}

// Distribuye la colegiatura según el plan
function distributeColegiatura(planName, total) {
  let rows = [];

  if (planName === "Plan A - 10 pagos") {
    const cuotaInicial = total * 0.16;
    const restante = total - cuotaInicial;
    const cuotaMensual = restante / 10;
    rows.push({ concepto: "Cuota Inicial (16%)", colegiatura: cuotaInicial });
    for (let i = 1; i <= 10; i++) {
      rows.push({ concepto: `Cuota ${i}`, colegiatura: cuotaMensual });
    }
  }
  else if (planName === "Plan A - 11 pagos") {
    const cuotaInicial = total * 0.16;
    const restante = total - cuotaInicial;
    const cuotaMensual = restante / 11;
    rows.push({ concepto: "Cuota Inicial (16%)", colegiatura: cuotaInicial });
    for (let i = 1; i <= 11; i++) {
      rows.push({ concepto: `Cuota ${i}`, colegiatura: cuotaMensual });
    }
  }
  else if (planName === "Plan B - 2 pagos") {
    const cuotaInicial = total * 0.55;
    const restante = total - cuotaInicial;
    rows.push({ concepto: "Cuota Inicial (55%)", colegiatura: cuotaInicial });
    rows.push({ concepto: "Cuota Final (45%)", colegiatura: restante });
  }
  else if (planName === "Plan C - 1 pago") {
    rows.push({ concepto: "Cuota Única (100%)", colegiatura: total });
  }

  return rows;
}

//-------------------------------------------------------------------
// 2. FUNCIONES PARA DISTRIBUIR CARGOS ADICIONALES
//-------------------------------------------------------------------
function distributeExtraCost(distributionType, totalCost) {
  const dist = [];
  const d = parseInt(distributionType, 10) || 1;
  if (d === 1) {
    // 100% en la primera cuota
    dist.push(totalCost);
  } else {
    const each = totalCost / d;
    for (let i = 0; i < d; i++) {
      dist.push(each);
    }
  }
  return dist;
}

//-------------------------------------------------------------------
// 3. REFERENCIAS AL DOM
//-------------------------------------------------------------------
const form = document.getElementById("colegiaturaForm");
const studentContainer = document.getElementById("studentContainer");
const discountContainer = document.getElementById("discountContainer");
const extraProgramsContainer = document.getElementById("extraProgramsContainer");

const reciboContainer = document.getElementById("recibo-container");
const accionesPDF = document.getElementById("accionesPDF");

const spanFechaEmision = document.getElementById("fechaEmision");
const spanFechaVencimiento = document.getElementById("fechaVencimiento");
const spanAnioEscolar = document.getElementById("anioEscolar");
const spanFamilia = document.getElementById("nombreFamilia");
const spanPlanSeleccionado = document.getElementById("planSeleccionado");

const tablaDescuentosBody = document.getElementById("tablaDescuentos");
const spanTotalDescuentos = document.getElementById("totalDescuentos");
const spanTotalACobrar = document.getElementById("totalACobrar");

const tablaProgramasAdicionalesBody = document.getElementById("tablaProgramasAdicionales");
const spanTotalExtras = document.getElementById("totalExtras");

const tablaAcuerdoBody = document.getElementById("tablaAcuerdo");
const spanTotalAPagar = document.getElementById("totalAPagar");
const spanTotalPagado = document.getElementById("totalPagado");

//-------------------------------------------------------------------
// 4. FECHAS POR DEFECTO
//-------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  document.getElementById("inputFechaEmision").value = formatDateDMY(today);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  document.getElementById("inputFechaVencimiento").value = formatDateDMY(nextMonth);
});

//-------------------------------------------------------------------
// 5. AGREGAR / ELIMINAR ESTUDIANTE
//-------------------------------------------------------------------
let students = [];

document.getElementById("btnAddStudent").addEventListener("click", () => {
  if (students.length >= 5) {
    alert("Máximo 5 estudiantes.");
    return;
  }
  addStudentRow();
});

function addStudentRow() {
  const id = Date.now();
  const index = students.length;
  const numEst = index + 1;

  const div = document.createElement("div");
  div.classList.add("student-row");
  div.setAttribute("data-student-id", id);

  div.innerHTML = `
    <label>Est. ${numEst}:</label>
    <select class="nivel-select">
      <option value="Inicial">Inicial</option>
      <option value="Primaria">Primaria</option>
      <option value="Secundaria">Secundaria</option>
    </select>
    <button type="button" class="btnRemoveStudent">X</button>
  `;

  const btnRemove = div.querySelector(".btnRemoveStudent");
  btnRemove.addEventListener("click", () => removeStudent(id));

  studentContainer.appendChild(div);

  students.push({
    id,
    rowElement: div,
    selectNivel: div.querySelector(".nivel-select")
  });
}

function removeStudent(studentId) {
  const idx = students.findIndex(s => s.id === studentId);
  if (idx !== -1) {
    studentContainer.removeChild(students[idx].rowElement);
    students.splice(idx, 1);
  }
}

//-------------------------------------------------------------------
// 6. AÑADIR DESCUENTO/CARGO MANUAL (Colegiatura)
//-------------------------------------------------------------------
document.getElementById("btnAddDiscount").addEventListener("click", () => {
  const div = document.createElement("div");
  div.classList.add("discount-row");

  let options = "";
  for (let i = 1; i <= 5; i++) {
    options += `<option value="${i}">Est. ${i}</option>`;
  }

  div.innerHTML = `
    <select class="discount-student">
      ${options}
    </select>
    <input type="text" placeholder="Concepto" class="desc-concepto">
    <input type="number" step="0.01" placeholder="% (ej: -10 desc, +5 cargo)" class="desc-porcentaje">
    <button type="button" class="btnRemove">X</button>
  `;
  
  const btnRemove = div.querySelector(".btnRemove");
  btnRemove.addEventListener("click", () => discountContainer.removeChild(div));
  discountContainer.appendChild(div);
});

//-------------------------------------------------------------------
// 7. PROGRAMAS ADICIONALES (ligados a un estudiante, con distribución)
//-------------------------------------------------------------------
let extraPrograms = [];

document.getElementById("btnAddExtraProgram").addEventListener("click", () => {
  const div = document.createElement("div");
  div.classList.add("extra-program-row");

  const id = Date.now();

  // Preparamos un select para los estudiantes
  let studentOptions = "";
  students.forEach((st, idx) => {
    const numEst = idx + 1;
    studentOptions += `<option value="${numEst}">Est. ${numEst}</option>`;
  });
  if (!studentOptions) {
    // Si no hay estudiantes, igual permitimos, pero a "Est. 1" ficticio
    studentOptions = `<option value="1">Est. 1</option>`;
  }

  // Select para distribución (1, 2 o 10 cuotas)
  div.innerHTML = `
    <select class="extra-student">
      ${studentOptions}
    </select>
    <input type="text" placeholder="Nombre del Programa (ej: AFTERSCHOOL)" class="program-name" />
    <input type="number" step="0.01" placeholder="Monto (RD$)" class="program-cost" />
    <select class="program-dist">
      <option value="1" selected>Distribuir en 1 cuota</option>
      <option value="2">Distribuir en 2 cuotas</option>
      <option value="10">Distribuir en 10 cuotas</option>
    </select>
    <button type="button" class="btnRemove">X</button>
  `;

  const btnRemove = div.querySelector(".btnRemove");
  btnRemove.addEventListener("click", () => {
    extraProgramsContainer.removeChild(div);
    extraPrograms = extraPrograms.filter(ep => ep.id !== id);
  });

  extraProgramsContainer.appendChild(div);

  extraPrograms.push({
    id,
    rowElement: div,
    studentSelect: div.querySelector(".extra-student"),
    programNameInput: div.querySelector(".program-name"),
    programCostInput: div.querySelector(".program-cost"),
    distributionSelect: div.querySelector(".program-dist")
  });
});

//-------------------------------------------------------------------
// 8. AL ENVIAR FORM => CÁLCULOS
//-------------------------------------------------------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Datos generales
  const familia = document.getElementById("inputFamilia").value.trim();
  const anioSelect = document.getElementById("selectAnioEscolar").value;
  const fechaE = document.getElementById("inputFechaEmision").value.trim();
  const fechaV = document.getElementById("inputFechaVencimiento").value.trim();
  const planPago = document.getElementById("selectPlan").value;

  // Limpiar tablas previas
  tablaDescuentosBody.innerHTML = "";
  tablaProgramasAdicionalesBody.innerHTML = "";
  tablaAcuerdoBody.innerHTML = "";

  let baseSum = 0;  // suma de bases totales (colegiatura "plena")
  let finalSum = 0; // suma final tras descuentos (colegiatura neta)
  const discountRowsGlobal = [];

  // 8.1. % Descuento Plan
  const planDiscount = getPlanDiscountPct(planPago);

  // -----------------------------------------------------------------
  // A) Calcular la COLEGIATURA por cada estudiante
  // -----------------------------------------------------------------
  students.forEach((st, index) => {
    const nivel = st.selectNivel.value;
    const base = colegiaturaBase[nivel];

    // (1) Cargo Colegiatura Base => 100%
    let costSoFar = 0;
    discountRowsGlobal.push({
      est: index + 1,
      concepto: `Cargo Colegiatura Base (${nivel})`,
      base: base,
      pct: 100,
      monto: base
    });
    costSoFar += base;
    baseSum += base;

    // (2) Descuento Año Escolar EXACTO
    const finalAnio = yearFinal[anioSelect]?.[nivel];
    if (finalAnio !== null && finalAnio !== undefined) {
      const descAnio = costSoFar - finalAnio;
      if (descAnio > 0) {
        const pctAnio = (descAnio / costSoFar) * 100;
        discountRowsGlobal.push({
          est: index + 1,
          concepto: `Descuento Año Escolar (${anioSelect})`,
          base: costSoFar,
          pct: -pctAnio,
          monto: descAnio
        });
        costSoFar = finalAnio;
      }
    }

    // (3) Descuento Plan
    if (planDiscount > 0) {
      const descPlan = costSoFar * (planDiscount / 100);
      discountRowsGlobal.push({
        est: index + 1,
        concepto: `Descuento por plan (${planPago})`,
        base: costSoFar,
        pct: -planDiscount,
        monto: descPlan
      });
      costSoFar -= descPlan;
    }

    // (4) Descuento Familiar
    const famPct = familyDiscounts[index] || 0;
    if (famPct > 0) {
      const descFam = costSoFar * (famPct / 100);
      discountRowsGlobal.push({
        est: index + 1,
        concepto: "Descuento Familiar",
        base: costSoFar,
        pct: -famPct,
        monto: descFam
      });
      costSoFar -= descFam;
    }

    // (5) Descuentos/Cargos manuales
    const discountRows = discountContainer.querySelectorAll(".discount-row");
    discountRows.forEach((dr) => {
      const estSelect = dr.querySelector(".discount-student");
      const concepto = dr.querySelector(".desc-concepto").value.trim() || "Desc/Cargo";
      const pct = parseFloat(dr.querySelector(".desc-porcentaje").value) || 0;

      if (parseInt(estSelect.value) === (index + 1)) {
        const dAmount = costSoFar * (Math.abs(pct) / 100);
        discountRowsGlobal.push({
          est: index + 1,
          concepto,
          base: costSoFar,
          pct,
          monto: dAmount
        });
        if (pct < 0) {
          costSoFar -= dAmount;
        } else {
          costSoFar += dAmount;
        }
      }
    });

    finalSum += costSoFar;
  });

  // Mostrar filas de COLEGIATURA en la tabla
  discountRowsGlobal.forEach((row) => {
    let sign = "";
    if (row.pct < 0) sign = "-";
    else if (row.pct > 0) sign = "+";

    const baseAplicada = "RD$ " + formatearMonto(row.base);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.est}</td>
      <td>${row.concepto}</td>
      <td>${baseAplicada}</td>
      <td>${row.pct.toFixed(2)}%</td>
      <td>${sign} RD$ ${formatearMonto(row.monto)}</td>
    `;
    tablaDescuentosBody.appendChild(tr);
  });

  // Totales de COLEGIATURA
  const totalDiff = finalSum - baseSum;
  let signDiff = "";
  if (totalDiff < 0) signDiff = "-";
  else if (totalDiff > 0) signDiff = "+";

  spanTotalDescuentos.textContent = `${signDiff} RD$ ${formatearMonto(Math.abs(totalDiff))}`;
  spanTotalACobrar.textContent = `RD$ ${formatearMonto(finalSum)}`;

  // -----------------------------------------------------------------
  // B) Calcular PROGRAMAS ADICIONALES
  // -----------------------------------------------------------------
  let totalExtras = 0;
  let extraDistributions = []; // [ { student, name, distArray: [m1, m2,...] }, ...]

  extraPrograms.forEach((ep) => {
    const studentNum = parseInt(ep.studentSelect.value) || 1;
    const name = ep.programNameInput.value.trim() || "Programa";
    const cost = parseFloat(ep.programCostInput.value) || 0;
    const distType = ep.distributionSelect.value; // "1","2","10"

    totalExtras += cost;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${studentNum}</td>
      <td>${name}</td>
      <td>${distType} cuota(s)</td>
      <td>RD$ ${formatearMonto(cost)}</td>
    `;
    tablaProgramasAdicionalesBody.appendChild(tr);

    const distArray = distributeExtraCost(distType, cost);
    extraDistributions.push({
      student: studentNum,
      name,
      distArray
    });
  });

  spanTotalExtras.textContent = `RD$ ${formatearMonto(totalExtras)}`;

  // -----------------------------------------------------------------
  // C) Generar tabla ACUERDO DE PAGO
  // -----------------------------------------------------------------
  // 1) Distribución COLEGIATURA
  const colegRows = distributeColegiatura(planPago, finalSum);
  let mainPlanLength = colegRows.length;

  // 2) Profundidad de Extras
  let maxExtraInstallments = 0;
  extraDistributions.forEach((ed) => {
    if (ed.distArray.length > maxExtraInstallments) {
      maxExtraInstallments = ed.distArray.length;
    }
  });

  // 3) Filas totales => max(mainPlanLength, maxExtraInstallments)
  let totalRows = Math.max(mainPlanLength, maxExtraInstallments);

  let finalInstallments = [];
  for (let i = 0; i < totalRows; i++) {
    let colegObj = colegRows[i];
    let concepto = colegObj ? colegObj.concepto : `Cuota ${i + 1} (Sin Colegiatura)`;
    let colegAmount = colegObj ? colegObj.colegiatura : 0;

    let extraAmount = 0;
    extraDistributions.forEach((ed) => {
      if (ed.distArray[i] !== undefined) {
        extraAmount += ed.distArray[i];
      }
    });

    let totalCuota = colegAmount + extraAmount;
    finalInstallments.push({
      concepto,
      colegiatura: colegAmount,
      cargos: extraAmount,
      totalCuota
    });
  }

  let sumPagar = 0;
  finalInstallments.forEach((inst) => {
    sumPagar += inst.totalCuota;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inst.concepto}</td>
      <td>RD$ ${formatearMonto(inst.colegiatura)}</td>
      <td>RD$ ${formatearMonto(inst.cargos)}</td>
      <td>RD$ ${formatearMonto(inst.totalCuota)}</td>
      <td>RD$ 0.00</td>
    `;
    tablaAcuerdoBody.appendChild(tr);
  });

  spanTotalAPagar.textContent = `RD$ ${formatearMonto(sumPagar)}`;
  spanTotalPagado.textContent = `RD$ 0.00`;

  // -----------------------------------------------------------------
  // D) Mostrar vista previa
  // -----------------------------------------------------------------
  spanFechaEmision.textContent = fechaE;
  spanFechaVencimiento.textContent = fechaV;
  spanAnioEscolar.textContent = anioSelect;
  spanFamilia.textContent = familia;
  spanPlanSeleccionado.textContent = planPago;

  reciboContainer.style.display = "block";
  accionesPDF.style.display = "block";
});

//-------------------------------------------------------------------
// 9. Generar PDF con doc.html (texto real, multipágina)
//-------------------------------------------------------------------
document.getElementById("btnGenerarPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const reciboElement = document.getElementById("recibo-container");

  // Generar PDF con doc.html
  doc.html(reciboElement, {
    x: 20,
    y: 20,
    html2canvas: {
      // Ajusta scale si necesitas que el contenido
      // quepa más en la página o se vea más grande
      scale: 0.9
    },
    callback: function (doc) {
      doc.save('informacion_colegiatura.pdf');
    }
  });
});

//-------------------------------------------------------------------
// FUNCIONES AUXILIARES
//-------------------------------------------------------------------
function formatDateDMY(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatearMonto(monto) {
  return monto.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}