//===================================================================
// COLEGIATURA SMP — Wizard Flow
//===================================================================

// ── DATA ─────────────────────────────────────────────────────────
const colegiaturaBase = {
  "Inicial":141993.42, "Primaria":143351.52, "Secundaria":152837.67
};
const yearFinal = {
  "2022-2023":{"Inicial":68235.61,"Primaria":86011.28,"Secundaria":91745.36},
  "2023-2024":{"Inicial":83506.09,"Primaria":92970.11,"Secundaria":99984.63},
  "2024-2025":{"Inicial":102326.25,"Primaria":109541.56,"Secundaria":117806.38},
  "2025-2026":{"Inicial":115488.75,"Primaria":123632.19,"Secundaria":132960.13},
  "2026-2027":{"Inicial":141993.42,"Primaria":143351.52,"Secundaria":152837.67}
};
const familyDiscounts = [0, 5, 10, 15, 25];
const yearLabels = {
  "2022-2023":"2022-2023 · 4+ años","2023-2024":"2023-2024 · 3 años",
  "2024-2025":"2024-2025 · 2 años","2025-2026":"2025-2026 · 1 año","2026-2027":"2026-2027 · Nuevo"
};

function getPlanDiscountPct(p){if(p.includes("Plan B"))return 8;if(p.includes("Plan C"))return 16;return 0;}
function getDiscountPctForYear(a,n){const b=colegiaturaBase[n],f=yearFinal[a]?.[n];if(!f||!b)return 0;return Math.max(0,((b-f)/b)*100);}
function buildYearOptions(){return Object.keys(yearFinal).map(y=>`<option value="${y}">${yearLabels[y]}</option>`).join("");}
function distributeColegiatura(plan,total){
  const s=[];
  if(plan==="Plan A - 10 pagos"){const i=total*.16,c=(total-i)/10;s.push({month:0,label:"Cuota Inicial (16%)",amount:i});for(let x=1;x<=10;x++)s.push({month:x,label:`Cuota ${x}`,amount:c});}
  else if(plan==="Plan A - 11 pagos"){const i=total*.16,c=(total-i)/11;s.push({month:0,label:"Cuota Inicial (16%)",amount:i});for(let x=1;x<=11;x++)s.push({month:x,label:`Cuota ${x}`,amount:c});}
  else if(plan==="Plan B - 2 pagos"){const i=total*.55;s.push({month:0,label:"Cuota Inicial — Colegiatura",amount:i});s.push({month:4,label:"Cuota Final — Colegiatura",amount:total-i});}
  else if(plan==="Plan C - 1 pago"){s.push({month:0,label:"Pago Único — Colegiatura",amount:total});}
  return s;
}
function distributeExtraCost(d,t){d=parseInt(d)||1;if(d===1)return[t];return Array.from({length:d},()=>t/d);}
function fmt(n){return n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDateDMY(s){if(!s)return"—";const[y,m,d]=s.split("-");return`${d}/${m}/${y}`;}

// ── DOM ──────────────────────────────────────────────────────────
const $=id=>document.getElementById(id);
const studentContainer=$("studentContainer");
const discountContainer=$("discountContainer");
const extraProgramsContainer=$("extraProgramsContainer");

// ── STATE ────────────────────────────────────────────────────────
let students=[],discounts=[],extraPrograms=[];
let idCounter=0;const nextId=()=>++idCounter;
let currentStep=1;

// ── WIZARD NAVIGATION ────────────────────────────────────────────
const stepTitles={1:"Datos de la familia",2:"Estudiantes",3:"Plan de pago",4:"Extras opcionales",5:"Presupuesto listo"};

function goToStep(n){
  // Validation
  if(n===2 && !$("inputFamilia").value.trim()){
    $("inputFamilia").focus();
    $("inputFamilia").classList.add("border-red-400");
    setTimeout(()=>$("inputFamilia").classList.remove("border-red-400"),1500);
    return;
  }
  if(n===3 && students.length===0) return;
  if(n===4 && !getSelectedPlan()) return;
  if(n===5) recalculate();

  // Hide all
  for(let i=1;i<=5;i++) $(`step${i}`).classList.add("hidden");
  // Show target
  $(`step${n}`).classList.remove("hidden");
  currentStep=n;

  // Progress
  const bar=$("progressBar");
  if(n===5){bar.classList.add("hidden");}
  else{
    bar.classList.remove("hidden");
    $("stepLabel").textContent=`Paso ${n} de 4`;
    $("stepTitle").textContent=stepTitles[n];
    $("progressFill").style.width=`${n*25}%`;
  }

  // Scroll top
  window.scrollTo({top:0,behavior:"smooth"});
}

function getSelectedPlan(){
  const r=document.querySelector('input[name="plan"]:checked');
  return r?r.value:"";
}

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",()=>{
  const today=new Date();
  const pad=n=>String(n).padStart(2,"0");
  $("inputFechaEmision").value=`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const next=new Date();next.setMonth(next.getMonth()+1);
  $("inputFechaVencimiento").value=`${next.getFullYear()}-${pad(next.getMonth()+1)}-${pad(next.getDate())}`;

  // Auto-focus family name
  $("inputFamilia").focus();

  // Enter key to advance on step 1
  $("inputFamilia").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();goToStep(2);}});

  $("btnAddStudent").addEventListener("click",()=>{if(students.length>=5)return;addStudent();});
  $("btnAddDiscount").addEventListener("click",()=>addDiscount());
  $("btnAddExtraProgram").addEventListener("click",()=>addExtraProgram());
  $("btnGenerarPDF").addEventListener("click",generatePDF);

  // Plan selection visual feedback
  document.querySelectorAll('input[name="plan"]').forEach(r=>{
    r.addEventListener("change",()=>{
      document.querySelectorAll(".plan-option div:first-child").forEach(d=>{
        d.classList.remove("border-brand-500","bg-brand-50");
        d.classList.add("border-slate-200");
      });
      if(r.checked){
        const wrap=r.closest("label").querySelector("div");
        wrap.classList.remove("border-slate-200");
        wrap.classList.add("border-brand-500","bg-brand-50");
      }
    });
  });

  // Auto-add first student
  addStudent();
});

// ── STUDENT CARD ─────────────────────────────────────────────────
function addStudent(){
  const id=nextId(),num=students.length+1;
  const div=document.createElement("div");
  div.className="student-card rounded-lg border border-slate-200 bg-white overflow-hidden";
  div.dataset.id=id;
  div.innerHTML=`
    <div class="flex items-center gap-2 px-3 pt-3 pb-2">
      <span class="student-num text-[10px] font-extrabold text-white w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center shrink-0">${num}</span>
      <input type="text" placeholder="Nombre del estudiante" class="student-name flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-brand-300 focus:bg-white outline-none transition-all">
      <button type="button" class="btn-remove text-slate-300 hover:text-red-400 transition-colors p-0.5" title="Eliminar">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flex gap-2 px-3 pb-2">
      <select class="nivel-select flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[12px] text-slate-600 focus:ring-1 focus:ring-brand-300 outline-none">
        <option value="Inicial">Inicial</option>
        <option value="Primaria">Primaria</option>
        <option value="Secundaria">Secundaria</option>
      </select>
      <select class="anio-select flex-[1.5] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[12px] text-slate-600 focus:ring-1 focus:ring-brand-300 outline-none">
        ${buildYearOptions()}
      </select>
    </div>
    <div class="anio-hint px-3 pb-2.5">
      <p class="text-[10px] font-semibold text-slate-400 bg-slate-50 rounded px-2 py-0.5 inline-block">Nuevo ingreso</p>
    </div>
  `;
  div.querySelector(".anio-select").value="2026-2027";
  div.querySelector(".btn-remove").addEventListener("click",()=>{
    students=students.filter(s=>s.id!==id);
    div.remove();
    renumberStudents();
    syncStudentSelectors();
  });
  div.querySelector(".nivel-select").addEventListener("change",()=>updateStudentHint(div));
  div.querySelector(".anio-select").addEventListener("change",()=>updateStudentHint(div));

  studentContainer.appendChild(div);
  students.push({id,el:div});
  syncStudentSelectors();
  updateStudentHint(div);
  // Focus name
  div.querySelector(".student-name").focus();
}

function updateStudentHint(div){
  const nivel=div.querySelector(".nivel-select").value;
  const anio=div.querySelector(".anio-select").value;
  const pct=getDiscountPctForYear(anio,nivel);
  const p=div.querySelector(".anio-hint p");
  if(pct>0){
    p.textContent=`↓ ${pct.toFixed(1)}% desc. antigüedad`;
    p.className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5 inline-block";
  }else{
    p.textContent="Nuevo ingreso — sin desc. antigüedad";
    p.className="text-[10px] font-semibold text-slate-400 bg-slate-50 rounded px-2 py-0.5 inline-block";
  }
}

function renumberStudents(){students.forEach((s,i)=>{const b=s.el.querySelector(".student-num");if(b)b.textContent=i+1;});}
function syncStudentSelectors(){
  const opts=students.length?students.map((_,i)=>`<option value="${i+1}">Est. ${i+1}</option>`).join(""):`<option value="1">Est. 1</option>`;
  document.querySelectorAll(".disc-student-select,.prog-student-select").forEach(sel=>{const p=sel.value;sel.innerHTML=opts;if(sel.querySelector(`option[value="${p}"]`))sel.value=p;});
}

// ── DISCOUNT / PROGRAM ───────────────────────────────────────────
function addDiscount(){
  const id=nextId(),div=document.createElement("div");
  div.className="discount-card flex flex-wrap items-center gap-2 rounded-lg p-3 border border-slate-200 bg-white";
  div.dataset.id=id;
  const opts=students.length?students.map((_,i)=>`<option value="${i+1}">Est. ${i+1}</option>`).join(""):`<option value="1">Est. 1</option>`;
  div.innerHTML=`
    <select class="disc-student-select px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm w-20">${opts}</select>
    <select class="disc-type px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm">
      <option value="descuento">Descuento</option><option value="cargo">Cargo</option>
    </select>
    <input type="text" placeholder="Concepto" class="disc-concepto flex-1 min-w-[80px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm">
    <div class="flex items-center gap-1">
      <input type="number" step="0.01" min="0" placeholder="%" class="disc-pct w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-right">
      <span class="text-[10px] text-slate-400 font-bold">%</span>
    </div>
    <button type="button" class="btn-remove text-slate-300 hover:text-red-400 p-0.5">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;
  div.querySelector(".btn-remove").addEventListener("click",()=>{discounts=discounts.filter(d=>d.id!==id);div.remove();});
  discountContainer.appendChild(div);
  discounts.push({id,el:div});
}

function addExtraProgram(){
  const id=nextId(),div=document.createElement("div");
  div.className="program-card flex flex-wrap items-center gap-2 rounded-lg p-3 border border-slate-200 bg-white";
  div.dataset.id=id;
  const opts=students.length?students.map((_,i)=>`<option value="${i+1}">Est. ${i+1}</option>`).join(""):`<option value="1">Est. 1</option>`;
  div.innerHTML=`
    <select class="prog-student-select px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm w-20">${opts}</select>
    <input type="text" placeholder="Nombre programa" class="prog-name flex-1 min-w-[80px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm">
    <input type="number" step="0.01" placeholder="Monto RD$" class="prog-cost w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-right">
    <select class="prog-dist px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm">
      <option value="1">1 cuota</option><option value="2">2 cuotas</option><option value="10">10 cuotas</option>
    </select>
    <select class="prog-start px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm">
      <option value="0">Desde Cuota Inicial</option><option value="1" selected>Desde Cuota 1</option>
    </select>
    <button type="button" class="btn-remove text-slate-300 hover:text-red-400 p-0.5">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;
  div.querySelector(".btn-remove").addEventListener("click",()=>{extraPrograms=extraPrograms.filter(p=>p.id!==id);div.remove();});
  extraProgramsContainer.appendChild(div);
  extraPrograms.push({id,el:div});
}

// ── RECALCULATE ──────────────────────────────────────────────────
function recalculate(){
  const familia=$("inputFamilia").value.trim();
  const plan=getSelectedPlan();
  const fechaE=$("inputFechaEmision").value;
  const fechaV=$("inputFechaVencimiento").value;

  $("rFechaEmision").textContent=fmtDateDMY(fechaE);
  $("rFechaVencimiento").textContent=fmtDateDMY(fechaV);
  $("rFamilia").textContent=familia||"—";
  $("rPlan").textContent=plan;
  $("rCantEstudiantes").textContent=students.length;

  // Seniority
  const curY=2026;let earlyY=curY;
  students.forEach(st=>{const y=parseInt(st.el.querySelector(".anio-select").value)||curY;if(y<earlyY)earlyY=y;});
  const sen=curY-earlyY;
  $("rAntiguedad").textContent=sen>0?`Desde ${earlyY}`:"Nuevo ingreso";
  const badge=$("rBadge"),bIcon=$("rBadgeIcon"),bYrs=$("rBadgeYears");
  if(sen>=3){badge.classList.remove("hidden");bIcon.className="w-11 h-11 rounded-full flex items-center justify-center bg-yellow-50 text-yellow-500";bYrs.className="text-[9px] font-bold text-center mt-0.5 text-yellow-600";bYrs.textContent=`${sen} años`;}
  else if(sen>=1){badge.classList.remove("hidden");bIcon.className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 text-slate-400";bYrs.className="text-[9px] font-bold text-center mt-0.5 text-slate-500";bYrs.textContent=`${sen} año${sen>1?"s":""}`;}
  else badge.classList.add("hidden");

  // A) COLEGIATURA
  const planDiscount=getPlanDiscountPct(plan);
  const dRows=[];let baseSum=0,finalSum=0;
  students.forEach((st,idx)=>{
    const nivel=st.el.querySelector(".nivel-select").value;
    const anio=st.el.querySelector(".anio-select").value;
    const nombre=st.el.querySelector(".student-name").value.trim();
    const display=nombre?`${nombre} (${nivel})`:nivel;
    const base=colegiaturaBase[nivel];
    let cost=0;
    dRows.push({est:idx+1,concepto:`Colegiatura Base — ${display}`,base,pct:100,monto:base});
    cost+=base;baseSum+=base;
    const fAnio=yearFinal[anio]?.[nivel];
    if(fAnio!=null){const d=cost-fAnio;if(d>0){dRows.push({est:idx+1,concepto:`Desc. Antigüedad (${anio})`,base:cost,pct:-(d/cost)*100,monto:d});cost=fAnio;}}
    if(planDiscount>0){const d=cost*(planDiscount/100);dRows.push({est:idx+1,concepto:`Desc. Plan (${plan})`,base:cost,pct:-planDiscount,monto:d});cost-=d;}
    const fP=familyDiscounts[idx]||0;
    if(fP>0){const d=cost*(fP/100);dRows.push({est:idx+1,concepto:"Desc. Familiar",base:cost,pct:-fP,monto:d});cost-=d;}
    discounts.forEach(disc=>{
      const dEl=disc.el,dEst=parseInt(dEl.querySelector(".disc-student-select").value);
      if(dEst!==idx+1)return;
      const tipo=dEl.querySelector(".disc-type").value;
      const concepto=dEl.querySelector(".disc-concepto").value.trim()||(tipo==="descuento"?"Descuento":"Cargo");
      const rawP=Math.abs(parseFloat(dEl.querySelector(".disc-pct").value)||0);
      const pct=tipo==="descuento"?-rawP:rawP;const amt=cost*(rawP/100);
      dRows.push({est:idx+1,concepto,base:cost,pct,monto:amt});
      cost+=(tipo==="descuento"?-amt:amt);
    });
    finalSum+=cost;
  });

  const tb=$("tablaDescuentos");tb.innerHTML="";
  dRows.forEach(r=>{
    const sign=r.pct<0?"–":r.pct>0?"+":"";
    const cc=r.pct<0?"text-red-600":r.pct>0?"text-emerald-600":"";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="px-2 py-2 text-slate-400">${r.est}</td><td class="px-2 py-2">${r.concepto}</td><td class="px-2 py-2 text-right font-mono text-slate-500">RD$ ${fmt(r.base)}</td><td class="px-2 py-2 text-right font-mono ${cc}">${r.pct.toFixed(2)}%</td><td class="px-2 py-2 text-right font-mono ${cc}">${sign} RD$ ${fmt(r.monto)}</td>`;
    tb.appendChild(tr);
  });
  const tDiff=finalSum-baseSum;
  $("totalDescuentos").textContent=`${tDiff<0?"–":"+"} RD$ ${fmt(Math.abs(tDiff))}`;
  $("totalDescuentos").className=`font-extrabold text-sm ${tDiff<0?"text-red-500":"text-emerald-600"}`;
  $("totalACobrar").textContent=`RD$ ${fmt(finalSum)}`;

  // B) PROGRAMAS
  let totalExtras=0;const progSch=[];
  const tbP=$("tablaProgramas");tbP.innerHTML="";
  extraPrograms.forEach(ep=>{
    const el=ep.el,stN=parseInt(el.querySelector(".prog-student-select").value)||1;
    const name=el.querySelector(".prog-name").value.trim()||"Programa";
    const cost=parseFloat(el.querySelector(".prog-cost").value)||0;
    const distT=el.querySelector(".prog-dist").value;
    const off=parseInt(el.querySelector(".prog-start").value)||0;
    if(cost<=0)return;
    totalExtras+=cost;
    const sL=off===0?"Desde Cuota Inicial":"Desde Cuota 1";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="px-2 py-2 text-slate-400">${stN}</td><td class="px-2 py-2">${name}</td><td class="px-2 py-2">${distT} cuota(s) · ${sL}</td><td class="px-2 py-2 text-right font-mono">RD$ ${fmt(cost)}</td>`;
    tbP.appendChild(tr);
    const dArr=distributeExtraCost(distT,cost);
    progSch.push({name,months:dArr.map((a,i)=>({month:off+i,cuotaNum:i+1,amount:a}))});
  });
  $("seccionProgramas").style.display=totalExtras>0?"block":"none";
  $("totalExtras").textContent=`RD$ ${fmt(totalExtras)}`;

  // C) ACUERDO DE PAGO
  const cSch=distributeColegiatura(plan,finalSum);
  const mSet=new Set();cSch.forEach(c=>mSet.add(c.month));progSch.forEach(p=>p.months.forEach(m=>mSet.add(m.month)));
  const allM=[...mSet].sort((a,b)=>a-b);
  const tbA=$("tablaAcuerdo");tbA.innerHTML="";let sumP=0;
  allM.forEach(month=>{
    const coleg=cSch.find(c=>c.month===month);
    const progs=[];progSch.forEach(p=>{const m=p.months.find(m=>m.month===month);if(m)progs.push({name:p.name,cuotaNum:m.cuotaNum,amount:m.amount});});
    const cA=coleg?coleg.amount:0,pA=progs.reduce((s,p)=>s+p.amount,0),tot=cA+pA;sumP+=tot;
    let con="";
    if(coleg&&progs.length){
      if(/^Cuota \d+$/.test(coleg.label))con=`${coleg.label} <span class="text-slate-400">+</span> ${progs.map(p=>p.name).join(", ")}`;
      else con=`${coleg.label} <span class="text-slate-400">+</span> ${progs.map(p=>`Cuota ${p.cuotaNum} — ${p.name}`).join(" + ")}`;
    }else if(coleg)con=coleg.label;
    else con=progs.map(p=>`Cuota ${p.cuotaNum} — ${p.name}`).join(" + ");
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="px-2 py-2">${con}</td><td class="px-2 py-2 text-right font-mono">${cA>0?"RD$ "+fmt(cA):"—"}</td><td class="px-2 py-2 text-right font-mono">${pA>0?"RD$ "+fmt(pA):"—"}</td><td class="px-2 py-2 text-right font-mono font-bold">RD$ ${fmt(tot)}</td>`;
    tbA.appendChild(tr);
  });
  $("totalAPagar").textContent=`RD$ ${fmt(sumP)}`;
}

// ── PDF ──────────────────────────────────────────────────────────
function generatePDF(){
  const{jsPDF}=window.jspdf;
  const el=$("recibo-printable"),wr=$("previewWrapper");
  const saved={w:el.style.width,bg:el.style.background,ov:wr.style.overflow,mh:wr.style.maxHeight,h:wr.style.height};
  el.style.width="800px";el.style.background="white";wr.style.overflow="visible";wr.style.maxHeight="none";wr.style.height="auto";
  window.scrollTo(0,0);
  html2canvas(el,{scale:2,useCORS:true,backgroundColor:"#fff",scrollY:0,scrollX:0,windowWidth:900,windowHeight:el.scrollHeight+200}).then(canvas=>{
    el.style.width=saved.w;el.style.background=saved.bg;wr.style.overflow=saved.ov;wr.style.maxHeight=saved.mh;wr.style.height=saved.h;
    const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const pW=pdf.internal.pageSize.getWidth(),pH=pdf.internal.pageSize.getHeight(),mg=10;
    const uW=pW-mg*2,uH=pH-mg*2,ppm=canvas.width/uW,sH=Math.floor(uH*ppm);
    let yO=0,pg=0;
    while(yO<canvas.height){
      if(pg>0)pdf.addPage();
      const tH=Math.min(sH,canvas.height-yO),pc=document.createElement("canvas");
      pc.width=canvas.width;pc.height=tH;pc.getContext("2d").drawImage(canvas,0,yO,canvas.width,tH,0,0,canvas.width,tH);
      pdf.addImage(pc.toDataURL("image/png"),"PNG",mg,mg,uW,tH/ppm);yO+=sH;pg++;
    }
    const fam=$("inputFamilia").value.trim()||"colegiatura";
    pdf.save(`${fam.toLowerCase().replace(/\s+/g,"_")}_colegiatura.pdf`);
  });
}
