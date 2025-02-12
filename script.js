//-------------------------------------------------------------------
// 0. DATOS DE COLEGIATURA BASE Y DESCUENTOS EXACTOS POR AÑO ESCOLAR
//-------------------------------------------------------------------
const colegiaturaBase = {
  "Inicial": 115488.75,
  "Primaria": 123632.19,
  "Secundaria": 132960.13
};

/*
  MONTOS FINALES EXACTOS tras el "Descuento Año Escolar".
  Usaremos estos valores para forzar costSoFar a ese EXACT final
  si no es 2025-2026 => 0% => sin descuento => final = base
*/
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
    // sin descuento => final=base => discount=0
    "Inicial": null,
    "Primaria": null,
    "Secundaria": null
  }
};

// Descuento Familiar (orden)
const familyDiscounts = [0, 5, 10, 15, 25];

// Descuento por Plan
function getPlanDiscountPct(plan) {
  if (plan.includes("Plan B")) return 8;
  if (plan.includes("Plan C")) return 16;
  return 0; // Plan A => 0
}

//-------------------------------------------------------------------
// 1. REFERENCIAS AL DOM
//-------------------------------------------------------------------
const form = document.getElementById("colegiaturaForm");
const studentContainer = document.getElementById("studentContainer");
const discountContainer = document.getElementById("discountContainer");

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

const tablaAcuerdoBody = document.getElementById("tablaAcuerdo");
const spanTotalAPagar = document.getElementById("totalAPagar");
const spanTotalPagado = document.getElementById("totalPagado");

//-------------------------------------------------------------------
// 2. FECHAS POR DEFECTO
//-------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  document.getElementById("inputFechaEmision").value = formatDateDMY(today);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  document.getElementById("inputFechaVencimiento").value = formatDateDMY(nextMonth);
});

//-------------------------------------------------------------------
// 3. AGREGAR / ELIMINAR ESTUDIANTE
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
// 4. AÑADIR DESCUENTO/CARGO MANUAL
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
// 5. AL ENVIAR FORM => CÁLCULOS
//-------------------------------------------------------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Datos generales
  const familia = document.getElementById("inputFamilia").value.trim();
  const anioSelect = document.getElementById("selectAnioEscolar").value;
  const fechaE = document.getElementById("inputFechaEmision").value.trim();
  const fechaV = document.getElementById("inputFechaVencimiento").value.trim();
  const planPago = document.getElementById("selectPlan").value;

  tablaDescuentosBody.innerHTML = "";

  let baseSum = 0;  // suma de bases totales (para comparar)
  let finalSum = 0; // suma final tras descuentos
  const discountRowsGlobal = [];

  // Plan B=8%, Plan C=16%, A=0
  const planDiscount = getPlanDiscountPct(planPago);

  students.forEach((st, index) => {
    const nivel = st.selectNivel.value;
    const base = colegiaturaBase[nivel];

    // (1) Cargo Colegiatura Base
    let costSoFar = 0;
    costSoFar += base;
    discountRowsGlobal.push({
      est: index + 1,
      concepto: `Cargo Colegiatura Base (${nivel})`,
      base: null, // se mostrará “—”
      pct: 0,
      monto: base
    });
    baseSum += base;

    // (2) Descuento Año Escolar EXACTO
    // Si anioSelect es “2025-2026”, no hay descuento => final= base
    // De lo contrario, tomamos yearFinal[anioSelect][nivel] => "montoFinal"
    const finalAnio = yearFinal[anioSelect]?.[nivel];
    if (finalAnio !== null && finalAnio !== undefined) {
      // Hacemos: discount = costSoFar - finalAnio
      // Y forzamos costSoFar = finalAnio
      const descAnio = costSoFar - finalAnio;
      if (descAnio > 0) {
        // Solo aplicamos si finalAnio < costSoFar
        const pctAnio = (descAnio / costSoFar) * 100; // para mostrar en la tabla
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
    // si finalAnio es null => no hay descuento => costSoFar = base (sin cambio)

    // (3) Descuento Plan
    if (planDiscount > 0) {
      const descPlan = costSoFar * (planDiscount / 100);
      discountRowsGlobal.push({
        est: index + 1,
        concepto: `Descuento por plan de pago - ${planPago}`,
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

  // Mostrar filas en la tabla
  discountRowsGlobal.forEach((row) => {
    let sign = "";
    if (row.pct < 0) sign = "-";
    else if (row.pct > 0) sign = "+";

    // Si base=null => "—"
    const baseAplicada = row.base === null
      ? "—"
      : "RD$ " + formatearMonto(row.base);

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

  // Totales
  const totalDiff = finalSum - baseSum;
  let signDiff = "";
  if (totalDiff < 0) signDiff = "-";
  else if (totalDiff > 0) signDiff = "+";

  spanTotalDescuentos.textContent = `${signDiff} RD$ ${formatearMonto(Math.abs(totalDiff))}`;
  spanTotalACobrar.textContent = `RD$ ${formatearMonto(finalSum)}`;

  // Generar cuotas (Acuerdo de Pago)
  generateAutomaticPlan(planPago, finalSum);

  // Actualizar Recibo
  spanFechaEmision.textContent = fechaE;
  spanFechaVencimiento.textContent = fechaV;
  spanAnioEscolar.textContent = anioSelect;
  spanFamilia.textContent = familia;
  spanPlanSeleccionado.textContent = planPago;

  reciboContainer.style.display = "block";
  accionesPDF.style.display = "block";
});

//-------------------------------------------------------------------
// 6. Generar Cuotas (Plan)
//-------------------------------------------------------------------
function generateAutomaticPlan(plan, totalAPagar) {
  tablaAcuerdoBody.innerHTML = "";

  let rows = [];

  if (plan === "Plan A - 10 pagos") {
    const cuotaInicial = totalAPagar * 0.16;
    const restante = totalAPagar - cuotaInicial;
    const cuotaMensual = restante / 10;

    rows.push({ concepto: "Cuota Inicial (16%)", montoPagar: cuotaInicial });
    for (let i = 1; i <= 10; i++) {
      rows.push({ concepto: `Cuota ${i}`, montoPagar: cuotaMensual });
    }
  }
  else if (plan === "Plan A - 11 pagos") {
    const cuotaInicial = totalAPagar * 0.16;
    const restante = totalAPagar - cuotaInicial;
    const cuotaMensual = restante / 11;

    rows.push({ concepto: "Cuota Inicial (16%)", montoPagar: cuotaInicial });
    for (let i = 1; i <= 11; i++) {
      rows.push({ concepto: `Cuota ${i}`, montoPagar: cuotaMensual });
    }
  }
  else if (plan === "Plan B - 2 pagos") {
    const cuotaInicial = totalAPagar * 0.55;
    const restante = totalAPagar - cuotaInicial;
    rows.push({ concepto: "Cuota Inicial (55%)", montoPagar: cuotaInicial });
    rows.push({ concepto: "Cuota Final", montoPagar: restante });
  }
  else if (plan === "Plan C - 1 pago") {
    rows.push({ concepto: "Cuota Única", montoPagar: totalAPagar });
  }

  let sumPagar = 0;
  rows.forEach((r) => {
    sumPagar += r.montoPagar;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.concepto}</td>
      <td>RD$ ${formatearMonto(r.montoPagar)}</td>
      <td>RD$ 0.00</td>
    `;
    tablaAcuerdoBody.appendChild(tr);
  });

  spanTotalAPagar.textContent = `RD$ ${formatearMonto(sumPagar)}`;
  spanTotalPagado.textContent = `RD$ 0.00`;
}

//-------------------------------------------------------------------
// 7. Generar PDF
//-------------------------------------------------------------------
document.getElementById("btnGenerarPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const reciboElement = document.getElementById("recibo-container");

  // Si la imagen "images/logosmp.png" se sirve localmente 
  // con un servidor (ej. http://localhost:3000/), no necesitas useCORS
  html2canvas(reciboElement, { scale: 2 })
    .then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = doc.internal.pageSize.getWidth();
      const imgProps = doc.getImageProperties(imgData);

      const pdfWidth = pageWidth - 40;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      doc.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
      doc.save('informacion_colegiatura.pdf');
    })
    .catch((err) => {
      console.error("Error al generar PDF:", err);
      alert("Ocurrió un error al generar el PDF. Revisa la consola.");
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
