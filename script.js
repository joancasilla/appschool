//-------------------------------------------------------------------
// 0. DATOS DE COLEGIATURA, DESCUENTO FAMILIAR, DESCUENTO PLAN
//-------------------------------------------------------------------
const colegiaturaAnual = {
  "Inicial": 115488.75,
  "Primaria": 123632.19,
  "Secundaria": 132960.13
};

// Descuento familiar según el orden (1ro=0%, 2do=5%, 3ro=10%, 4to=15%, 5to=25%)
const familyDiscounts = [0, 5, 10, 15, 25];

// Descuento extra según plan (B=8%, C=16%, A=0)
function getPlanDiscountPct(plan) {
  if (plan.includes("Plan B")) return 8;
  if (plan.includes("Plan C")) return 16;
  return 0;
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

let students = []; // info de estudiantes

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
  const num = index + 1;

  const div = document.createElement("div");
  div.classList.add("student-row");
  div.setAttribute("data-student-id", id);

  div.innerHTML = `
    <label>Est. ${num}:</label>
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
// 5. AL ENVIAR FORM => CALCULAMOS
//-------------------------------------------------------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // 5.1 Datos generales
  const familia = document.getElementById("inputFamilia").value.trim();
  const anioEscolar = document.getElementById("inputAnioEscolar").value.trim();
  const fechaE = document.getElementById("inputFechaEmision").value.trim();
  const fechaV = document.getElementById("inputFechaVencimiento").value.trim();
  const planPago = document.getElementById("selectPlan").value;

  // 5.2 Limpiar la tabla
  tablaDescuentosBody.innerHTML = "";

  let baseSum = 0;
  let finalSum = 0;
  const discountRowsGlobal = [];

  // Descuento extra por plan
  const planDiscount = getPlanDiscountPct(planPago);

  // 5.3 Recorremos cada estudiante
  students.forEach((st, index) => {
    const level = st.selectNivel.value;
    const baseNivel = colegiaturaAnual[level] || 0;

    // Comenzamos con costSoFar = 0
    let costSoFar = 0;

    // (1) CARGO BASE
    costSoFar += baseNivel;
    discountRowsGlobal.push({
      est: index + 1,
      concepto: `Cargo Colegiatura Base (${level})`,
      base: null,   // null => luego muestra “—”
      pct: 0,
      monto: baseNivel
    });
    baseSum += baseNivel;

    // (2) DESCUENTO POR PLAN (PRIMERO)
    if (planDiscount > 0) {
      const descPlanAmount = costSoFar * (planDiscount / 100);
      discountRowsGlobal.push({
        est: index + 1,
        concepto: `Descuento por plan de pago - ${planPago}`,
        base: costSoFar,
        pct: -planDiscount,
        monto: descPlanAmount
      });
      costSoFar -= descPlanAmount;
    }

    // (3) DESCUENTO FAMILIAR
    const famPct = familyDiscounts[index] || 0;
    if (famPct > 0) {
      const descAmount = costSoFar * (famPct / 100);
      discountRowsGlobal.push({
        est: index + 1,
        concepto: "Descuento Familiar",
        base: costSoFar,
        pct: -famPct,
        monto: descAmount
      });
      costSoFar -= descAmount;
    }

    // (4) DESCUENTOS/CARGOS MANUALES
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

  // 5.4 Mostrar filas en la tabla
  discountRowsGlobal.forEach((row) => {
    let sign = "";
    if (row.pct < 0) sign = "-";
    else if (row.pct > 0) sign = "+";

    // Si base=null => mostramos “—” en Base Aplicada
    const baseAplicada = row.base === null 
      ? "—" 
      : "RD$ " + formatearMonto(row.base);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.est}</td>
      <td>${row.concepto}</td>
      <td>${baseAplicada}</td>
      <td>${row.pct}%</td>
      <td>${sign} RD$ ${formatearMonto(row.monto)}</td>
    `;
    tablaDescuentosBody.appendChild(tr);
  });

  // 5.5 Totales
  const totalDiff = finalSum - baseSum;
  let signDiff = "";
  if (totalDiff < 0) signDiff = "-";
  else if (totalDiff > 0) signDiff = "+";

  spanTotalDescuentos.textContent = `${signDiff} RD$ ${formatearMonto(Math.abs(totalDiff))}`;
  spanTotalACobrar.textContent = `RD$ ${formatearMonto(finalSum)}`;

  // 5.6 Generar cuotas
  generateAutomaticPlan(planPago, finalSum);

  // 5.7 Mostrar en Recibo
  spanFechaEmision.textContent = fechaE;
  spanFechaVencimiento.textContent = fechaV;
  spanAnioEscolar.textContent = anioEscolar;
  spanFamilia.textContent = familia;
  spanPlanSeleccionado.textContent = planPago;

  reciboContainer.style.display = "block";
  accionesPDF.style.display = "block";
});

//-------------------------------------------------------------------
// 6. GENERAR PLAN (cuotas) 
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
// 7. GENERAR PDF 
//-------------------------------------------------------------------
document.getElementById("btnGenerarPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const reciboElement = document.getElementById("recibo-container");

  // Basta con .then(...) sin useCORS, si el logo está local y se sirve por el mismo dominio
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
      alert("Ocurrió un error al generar el PDF.");
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
