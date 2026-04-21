//===================================================================
// COLEGIATURA SMP — Wizard + Live Preview
//===================================================================
const colegiaturaBase={"Inicial":141993.42,"Primaria":143351.52,"Secundaria":152837.67};
const yearFinal={"2022-2023":{"Inicial":68235.61,"Primaria":86011.28,"Secundaria":91745.36},"2023-2024":{"Inicial":83506.09,"Primaria":92970.11,"Secundaria":99984.63},"2024-2025":{"Inicial":102326.25,"Primaria":109541.56,"Secundaria":117806.38},"2025-2026":{"Inicial":115488.75,"Primaria":123632.19,"Secundaria":132960.13},"2026-2027":{"Inicial":141993.42,"Primaria":143351.52,"Secundaria":152837.67}};
const familyDiscounts=[0,5,10,15,25];
const yearLabels={"2022-2023":"2022-2023 · 4+ años","2023-2024":"2023-2024 · 3 años","2024-2025":"2024-2025 · 2 años","2025-2026":"2025-2026 · 1 año","2026-2027":"2026-2027 · Nuevo"};

function getPlanDiscountPct(p){return p.includes("Plan B")?8:p.includes("Plan C")?16:0;}
function getDiscountPctForYear(a,n){const b=colegiaturaBase[n],f=yearFinal[a]?.[n];return(!f||!b)?0:Math.max(0,((b-f)/b)*100);}
function buildYearOptions(){return Object.keys(yearFinal).map(y=>`<option value="${y}">${yearLabels[y]}</option>`).join("");}
function distributeColegiatura(plan,total){
  const s=[];
  if(plan==="Plan A - 10 pagos"){const i=total*.16,c=(total-i)/10;s.push({month:0,label:"Cuota Inicial (16%)",amount:i});for(let x=1;x<=10;x++)s.push({month:x,label:`Cuota ${x}`,amount:c});}
  else if(plan==="Plan A - 11 pagos"){const i=total*.16,c=(total-i)/11;s.push({month:0,label:"Cuota Inicial (16%)",amount:i});for(let x=1;x<=11;x++)s.push({month:x,label:`Cuota ${x}`,amount:c});}
  else if(plan==="Plan B - 2 pagos"){const i=total*.55;s.push({month:0,label:"Cuota Inicial — Colegiatura",amount:i});s.push({month:4,label:"Cuota Final — Colegiatura",amount:total-i});}
  else if(plan==="Plan C - 1 pago"){s.push({month:0,label:"Pago Único — Colegiatura",amount:total});}
  return s;
}
function distributeExtraCost(d,t){d=parseInt(d)||1;return d===1?[t]:Array.from({length:d},()=>t/d);}
function fmt(n){return n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
function titleCase(s){return s.replace(/\w\S*/g,t=>t.charAt(0).toUpperCase()+t.substr(1).toLowerCase());}

const $=id=>document.getElementById(id);
let students=[],discounts=[],extraPrograms=[],idCounter=0;
const nextId=()=>++idCounter;

// ── WIZARD ───────────────────────────────────────────────────────
const stepTitles={1:"Familia",2:"Estudiantes",3:"Plan de pago",4:"Ajustes"};
let currentStep=1;

function goToStep(n){
  if(n===2&&!$("inputFamilia").value.trim()){$("inputFamilia").focus();$("inputFamilia").style.borderColor="#f87171";setTimeout(()=>$("inputFamilia").style.borderColor="",1200);return;}
  if(n===3&&!students.length)return;
  for(let i=1;i<=4;i++)$(`step${i}`).classList.add("hidden");
  $(`step${n}`).classList.remove("hidden");
  $(`step${n}`).classList.add("step-animate");
  setTimeout(()=>$(`step${n}`).classList.remove("step-animate"),300);
  currentStep=n;
  $("stepLabel").textContent=`Paso ${n} de 4`;
  $("stepTitle").textContent=stepTitles[n];
  $("progressFill").style.width=`${n*25}%`;
  window.scrollTo({top:0,behavior:"smooth"});
}

function showEditAll(){
  for(let i=1;i<=4;i++){$(`step${i}`).classList.remove("hidden");$(`step${i}`).classList.add("edit-all-step");}
  $("progressBar").classList.add("hidden");
  $("editAllBar").classList.remove("hidden");
  document.querySelectorAll(".step-nav").forEach(el=>el.style.display="none");
  document.querySelectorAll(".step-icon").forEach(el=>el.style.display="none");
  document.querySelectorAll(".compact-header").forEach(el=>el.style.display="flex");
  $("wizardPanel").classList.add("edit-all-mode");
  window.scrollTo({top:0,behavior:"smooth"});
}

function backToWizard(){
  document.querySelectorAll(".step-nav").forEach(el=>el.style.display="");
  document.querySelectorAll(".step-icon").forEach(el=>el.style.display="");
  document.querySelectorAll(".compact-header").forEach(el=>el.style.display="");
  $("wizardPanel").classList.remove("edit-all-mode");
  $("progressBar").classList.remove("hidden");
  $("editAllBar").classList.add("hidden");
  for(let i=1;i<=4;i++)$(`step${i}`).classList.remove("edit-all-step");
  goToStep(1);
}
document.addEventListener("DOMContentLoaded",()=>{
  const today=new Date(),pad=n=>String(n).padStart(2,"0");
  window._fechaEmision=`${pad(today.getDate())}/${pad(today.getMonth()+1)}/${today.getFullYear()}`;
  window._fechaVencimiento="31/08/2026";

  $("inputFamilia").addEventListener("input",recalculate);
  $("inputFamilia").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();goToStep(2);}});
  document.querySelectorAll('input[name="plan"]').forEach(r=>r.addEventListener("change",recalculate));
  $("btnAddStudent").addEventListener("click",()=>{if(students.length>=5)return;addStudent();recalculate();});
  $("btnAddStudent2").addEventListener("click",()=>{if(students.length>=5)return;addStudent();recalculate();});
  $("btnAddDiscount").addEventListener("click",()=>{addDiscount();recalculate();});
  $("btnAddExtraProgram").addEventListener("click",()=>{addExtraProgram();recalculate();});
  $("btnGenerarPDF").addEventListener("click",generatePDF);

  addStudent();
  $("inputFamilia").focus();
});

// ── STUDENT ──────────────────────────────────────────────────────
function addStudent(){
  const id=nextId(),num=students.length+1,div=document.createElement("div");
  div.className="student-card rounded-lg border border-slate-200 bg-white overflow-hidden";
  div.dataset.id=id;
  div.innerHTML=`
    <div class="flex items-center gap-2 px-3 pt-3 pb-2">
      <span class="student-num text-[10px] font-extrabold text-white w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center shrink-0">${num}</span>
      <input type="text" placeholder="Nombre" class="student-name flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-300 focus:bg-white outline-none capitalize-input">
      <button type="button" class="btn-x"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>
    <div class="flex gap-2 px-3 pb-2">
      <select class="nivel-select flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600 outline-none">
        <option value="Inicial">Inicial</option><option value="Primaria">Primaria</option><option value="Secundaria">Secundaria</option>
      </select>
      <select class="anio-select flex-[1.6] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600 outline-none">
        ${buildYearOptions()}
      </select>
    </div>
    <div class="anio-hint px-3 pb-2.5"><p class="hint-text text-[10px] font-semibold text-slate-400 bg-slate-50 rounded px-2 py-0.5 inline-block">Sin desc. antigüedad</p></div>`;
  div.querySelector(".anio-select").value="2026-2027";
  div.querySelector(".btn-x").addEventListener("click",()=>{students=students.filter(s=>s.id!==id);div.remove();renumber();syncSel();recalculate();});
  ["input","change"].forEach(ev=>{
    div.querySelector(".student-name").addEventListener(ev,recalculate);
    div.querySelector(".nivel-select").addEventListener(ev,()=>{updateHint(div);recalculate();});
    div.querySelector(".anio-select").addEventListener(ev,()=>{updateHint(div);recalculate();});
  });
  $("studentContainer").appendChild(div);
  students.push({id,el:div});
  syncSel();updateHint(div);
  div.querySelector(".student-name").focus();
}
function updateHint(d){
  const n=d.querySelector(".nivel-select").value,a=d.querySelector(".anio-select").value,pct=getDiscountPctForYear(a,n),p=d.querySelector(".hint-text");
  if(pct>0){p.textContent=`↓ ${pct.toFixed(1)}% desc. antigüedad`;p.className="hint-text text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5 inline-block";}
  else{p.textContent="Sin desc. antigüedad";p.className="hint-text text-[10px] font-semibold text-slate-400 bg-slate-50 rounded px-2 py-0.5 inline-block";}
}
function renumber(){students.forEach((s,i)=>{const b=s.el.querySelector(".student-num");if(b)b.textContent=i+1;});}
function syncSel(){
  const o=students.length?students.map((_,i)=>`<option value="${i+1}">Est. ${i+1}</option>`).join(""):`<option value="1">Est. 1</option>`;
  document.querySelectorAll(".disc-student-select,.prog-student-select").forEach(s=>{const p=s.value;s.innerHTML=o;if(s.querySelector(`option[value="${p}"]`))s.value=p;});
}

// ── DISCOUNT ─────────────────────────────────────────────────────
function addDiscount(){
  const id=nextId(),div=document.createElement("div");
  div.className="discount-card rounded-lg border border-slate-200 bg-white p-3";
  const opts=students.length?students.map((_,i)=>`<option value="${i+1}">Est. ${i+1}</option>`).join(""):`<option value="1">Est. 1</option>`;
  div.innerHTML=`<div class="flex items-center gap-2 flex-wrap">
    <select class="disc-student-select px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm w-20">${opts}</select>
    <div class="toggle-group"><button type="button" class="toggle-btn active" data-val="descuento">Desc.</button><button type="button" class="toggle-btn" data-val="cargo">Cargo</button></div>
    <input type="text" placeholder="Concepto" class="disc-concepto flex-1 min-w-[60px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
    <div class="flex items-center gap-1"><input type="number" step="0.01" min="0" placeholder="0" class="disc-pct w-14 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right"><span class="text-[10px] text-slate-400 font-bold">%</span></div>
    <button type="button" class="btn-x"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
  </div>`;
  div.querySelectorAll(".toggle-btn").forEach(b=>b.addEventListener("click",()=>{div.querySelectorAll(".toggle-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");recalculate();}));
  div.querySelector(".btn-x").addEventListener("click",()=>{discounts=discounts.filter(d=>d.id!==id);div.remove();recalculate();});
  div.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",recalculate));
  $("discountContainer").appendChild(div);discounts.push({id,el:div});
}

// ── PROGRAM ──────────────────────────────────────────────────────
function addExtraProgram(){
  const id=nextId(),div=document.createElement("div");
  div.className="program-card rounded-lg border border-slate-200 bg-white p-3";
  const opts=students.length?students.map((_,i)=>`<option value="${i+1}">Est. ${i+1}</option>`).join(""):`<option value="1">Est. 1</option>`;
  div.innerHTML=`<div class="flex items-center gap-2 flex-wrap">
    <select class="prog-student-select px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm w-20">${opts}</select>
    <input type="text" placeholder="Programa" class="prog-name flex-1 min-w-[80px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
    <input type="number" step="0.01" placeholder="Monto" class="prog-cost w-24 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right">
    <button type="button" class="btn-x"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
  </div>
  <div class="flex items-center gap-2 mt-2">
    <select class="prog-dist px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]"><option value="1">1 cuota</option><option value="2">2 cuotas</option><option value="10">10 cuotas</option></select>
    <div class="toggle-group"><button type="button" class="toggle-btn" data-val="0">Desde Inicial</button><button type="button" class="toggle-btn active" data-val="1">Desde Cuota 1</button></div>
  </div>`;
  div.querySelectorAll(".toggle-btn").forEach(b=>b.addEventListener("click",()=>{const g=b.closest(".toggle-group");g.querySelectorAll(".toggle-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");recalculate();}));
  div.querySelector(".btn-x").addEventListener("click",()=>{extraPrograms=extraPrograms.filter(p=>p.id!==id);div.remove();recalculate();});
  div.querySelectorAll("input,select").forEach(el=>el.addEventListener("input",recalculate));
  $("extraProgramsContainer").appendChild(div);extraPrograms.push({id,el:div});
}

// ── RECALCULATE (reactive, runs on every change) ─────────────────
function recalculate(){
  const familia=$("inputFamilia").value.trim();
  const planR=document.querySelector('input[name="plan"]:checked');
  const plan=planR?planR.value:"";

  // Always populate header
  $("rFechaEmision").textContent=window._fechaEmision;
  $("rFechaVencimiento").textContent=window._fechaVencimiento;
  $("rFamilia").textContent=familia?titleCase(familia):"—";
  $("rPlan").textContent=plan||"—";
  $("rCantEstudiantes").textContent=students.length||"0";

  // Seniority
  const curY=2026;let earlyY=curY;
  students.forEach(st=>{const y=parseInt(st.el.querySelector(".anio-select").value)||curY;if(y<earlyY)earlyY=y;});
  const sen=curY-earlyY;
  $("rAntiguedad").textContent=sen>0?`Desde ${earlyY}`:"Nuevo ingreso";
  const badge=$("rBadge"),bI=$("rBadgeIcon"),bY=$("rBadgeYears");
  if(sen>=3){badge.classList.remove("hidden");bI.className="w-11 h-11 rounded-full flex items-center justify-center bg-yellow-50 text-yellow-500";bY.className="text-[9px] font-bold text-center mt-0.5 text-yellow-600";bY.textContent=`${sen} años`;}
  else if(sen>=1){badge.classList.remove("hidden");bI.className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100 text-slate-400";bY.className="text-[9px] font-bold text-center mt-0.5 text-slate-500";bY.textContent=`${sen} año${sen>1?"s":""}`;}
  else badge.classList.add("hidden");

  // PDF button + tables: need students + plan
  if(!students.length||!plan){
    $("btnGenerarPDF").classList.add("hidden");$("btnGenerarPDF").style.display="";
    $("tablaDescuentos").innerHTML="";$("tablaAcuerdo").innerHTML="";$("tablaProgramas").innerHTML="";
    $("totalDescuentos").textContent="—";$("totalACobrar").textContent="—";$("totalAPagar").textContent="—";
    $("seccionProgramas").style.display="none";
    return;
  }
  $("btnGenerarPDF").classList.remove("hidden");$("btnGenerarPDF").style.display="flex";

  // COLEGIATURA
  const pD=getPlanDiscountPct(plan),dR=[];let bS=0,fS=0;
  students.forEach((st,idx)=>{
    const nivel=st.el.querySelector(".nivel-select").value,anio=st.el.querySelector(".anio-select").value;
    const nombre=st.el.querySelector(".student-name").value.trim(),display=nombre?`${titleCase(nombre)} (${nivel})`:nivel;
    const base=colegiaturaBase[nivel];let cost=0;
    dR.push({est:idx+1,concepto:`Colegiatura Base — ${display}`,base,pct:100,monto:base});cost+=base;bS+=base;
    const fA=yearFinal[anio]?.[nivel];
    if(fA!=null){const d=cost-fA;if(d>0){dR.push({est:idx+1,concepto:`Desc. Antigüedad (${anio})`,base:cost,pct:-(d/cost)*100,monto:d});cost=fA;}}
    if(pD>0){const d=cost*(pD/100);dR.push({est:idx+1,concepto:"Desc. Plan",base:cost,pct:-pD,monto:d});cost-=d;}
    const fP=familyDiscounts[idx]||0;
    if(fP>0){const d=cost*(fP/100);dR.push({est:idx+1,concepto:"Desc. Familiar",base:cost,pct:-fP,monto:d});cost-=d;}
    discounts.forEach(disc=>{
      const dEl=disc.el,dEst=parseInt(dEl.querySelector(".disc-student-select").value);if(dEst!==idx+1)return;
      const aBtn=dEl.querySelector(".toggle-btn.active"),tipo=aBtn?aBtn.dataset.val:"descuento";
      const concepto=dEl.querySelector(".disc-concepto").value.trim()||(tipo==="descuento"?"Descuento":"Cargo");
      const rP=Math.abs(parseFloat(dEl.querySelector(".disc-pct").value)||0),pct=tipo==="descuento"?-rP:rP,amt=cost*(rP/100);
      dR.push({est:idx+1,concepto,base:cost,pct,monto:amt});cost+=(tipo==="descuento"?-amt:amt);
    });
    fS+=cost;
  });
  const tb=$("tablaDescuentos");tb.innerHTML="";
  dR.forEach(r=>{const s=r.pct<0?"–":r.pct>0?"+":"",cc=r.pct<0?"text-red-600":r.pct>0?"text-emerald-600":"";
    const tr=document.createElement("tr");tr.innerHTML=`<td class="text-slate-400">${r.est}</td><td>${r.concepto}</td><td class="text-right font-mono text-slate-500">RD$ ${fmt(r.base)}</td><td class="text-right font-mono ${cc}">${r.pct.toFixed(2)}%</td><td class="text-right font-mono ${cc}">${s} RD$ ${fmt(r.monto)}</td>`;tb.appendChild(tr);});
  const tD=fS-bS;$("totalDescuentos").textContent=`${tD<0?"–":"+"} RD$ ${fmt(Math.abs(tD))}`;
  $("totalDescuentos").className=`font-extrabold text-sm ${tD<0?"text-red-500":"text-emerald-600"}`;$("totalACobrar").textContent=`RD$ ${fmt(fS)}`;

  // PROGRAMAS
  let tE=0;const pSch=[];const tbP=$("tablaProgramas");tbP.innerHTML="";
  extraPrograms.forEach(ep=>{const el=ep.el,stN=parseInt(el.querySelector(".prog-student-select").value)||1;
    const name=el.querySelector(".prog-name").value.trim()||"Programa",cost=parseFloat(el.querySelector(".prog-cost").value)||0;
    const distT=el.querySelector(".prog-dist").value,aS=el.querySelector(".toggle-group:last-child .toggle-btn.active"),off=aS?parseInt(aS.dataset.val)||0:1;
    if(cost<=0)return;tE+=cost;const sL=off===0?"Desde Inicial":"Desde Cuota 1";
    const tr=document.createElement("tr");tr.innerHTML=`<td class="text-slate-400">${stN}</td><td>${name}</td><td>${distT} cuota(s) · ${sL}</td><td class="text-right font-mono">RD$ ${fmt(cost)}</td>`;tbP.appendChild(tr);
    const dArr=distributeExtraCost(distT,cost);pSch.push({name,months:dArr.map((a,i)=>({month:off+i,cuotaNum:i+1,amount:a}))});
  });
  $("seccionProgramas").style.display=tE>0?"block":"none";$("totalExtras").textContent=`RD$ ${fmt(tE)}`;

  // ACUERDO
  const cSch=distributeColegiatura(plan,fS),mSet=new Set();cSch.forEach(c=>mSet.add(c.month));pSch.forEach(p=>p.months.forEach(m=>mSet.add(m.month)));
  const allM=[...mSet].sort((a,b)=>a-b),tbA=$("tablaAcuerdo");tbA.innerHTML="";let sP=0;
  allM.forEach(month=>{const coleg=cSch.find(c=>c.month===month),progs=[];
    pSch.forEach(p=>{const m=p.months.find(m=>m.month===month);if(m)progs.push({name:p.name,cuotaNum:m.cuotaNum,amount:m.amount});});
    const cA=coleg?coleg.amount:0,pA=progs.reduce((s,p)=>s+p.amount,0),tot=cA+pA;sP+=tot;
    let con="";
    if(coleg&&progs.length){if(/^Cuota \d+$/.test(coleg.label))con=`${coleg.label} <span class="text-slate-400">+</span> ${progs.map(p=>p.name).join(", ")}`;
      else con=`${coleg.label} <span class="text-slate-400">+</span> ${progs.map(p=>`Cuota ${p.cuotaNum} — ${p.name}`).join(" + ")}`;}
    else if(coleg)con=coleg.label;else con=progs.map(p=>`Cuota ${p.cuotaNum} — ${p.name}`).join(" + ");
    const tr=document.createElement("tr");tr.innerHTML=`<td>${con}</td><td class="text-right font-mono">${cA>0?"RD$ "+fmt(cA):"—"}</td><td class="text-right font-mono">${pA>0?"RD$ "+fmt(pA):"—"}</td><td class="text-right font-mono font-bold">RD$ ${fmt(tot)}</td>`;tbA.appendChild(tr);});
  $("totalAPagar").textContent=`RD$ ${fmt(sP)}`;
}

// ── PDF ──────────────────────────────────────────────────────────
function generatePDF(){
  const{jsPDF}=window.jspdf,el=$("recibo-printable"),wr=$("previewWrapper"),sP=wr.closest(".lg\\:sticky")||wr.parentElement;
  const sv={w:el.style.width,bg:el.style.background,ov:wr.style.overflow,mh:wr.style.maxHeight,h:wr.style.height,pp:sP.style.position,po:sP.style.overflow};
  el.style.width="800px";el.style.background="white";wr.style.overflow="visible";wr.style.maxHeight="none";wr.style.height="auto";sP.style.position="relative";sP.style.overflow="visible";window.scrollTo(0,0);
  html2canvas(el,{scale:2,useCORS:true,backgroundColor:"#fff",scrollY:0,scrollX:0,windowWidth:900,windowHeight:el.scrollHeight+200}).then(canvas=>{
    el.style.width=sv.w;el.style.background=sv.bg;wr.style.overflow=sv.ov;wr.style.maxHeight=sv.mh;wr.style.height=sv.h;sP.style.position=sv.pp;sP.style.overflow=sv.po;
    const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"}),pW=pdf.internal.pageSize.getWidth(),pH=pdf.internal.pageSize.getHeight(),mg=10,uW=pW-mg*2,uH=pH-mg*2,ppm=canvas.width/uW,sH=Math.floor(uH*ppm);
    let yO=0,pg=0;while(yO<canvas.height){if(pg>0)pdf.addPage();const tH=Math.min(sH,canvas.height-yO),pc=document.createElement("canvas");pc.width=canvas.width;pc.height=tH;pc.getContext("2d").drawImage(canvas,0,yO,canvas.width,tH,0,0,canvas.width,tH);pdf.addImage(pc.toDataURL("image/png"),"PNG",mg,mg,uW,tH/ppm);yO+=sH;pg++;}
    pdf.save(`${($("inputFamilia").value.trim()||"colegiatura").toLowerCase().replace(/\s+/g,"_")}_colegiatura.pdf`);
  });
}
