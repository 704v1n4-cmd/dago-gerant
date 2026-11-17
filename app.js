/* =====================================================================
   App Gérant — Dago Moto Shop (téléphone, Android et iPhone)
   Lit le résumé envoyé par la caisse (boutique/etat) en temps réel.
   Envoie les décisions (ventes sous le minimum) et des messages (commandes).
   Hors ligne : affiche les dernières données reçues.
   ===================================================================== */
"use strict";
const APP_VERSION="3.4 · 17/11";
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtN=n=>Math.round(Number(n)||0).toLocaleString("fr-FR").replace(/ | /g," ");
const fd=d=>d?d.slice(8,10)+"/"+d.slice(5,7):"";
const MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const ago=ts=>{const s=Math.round((Date.now()-ts)/1000);return s<60?"à l'instant":s<3600?"il y a "+Math.round(s/60)+" min":s<86400?"il y a "+Math.round(s/3600)+" h":"le "+new Date(ts).toLocaleDateString("fr-FR")};
const tag=(t,k)=>`<span class="tag ${k||""}">${esc(t)}</span>`;
let E=null,META={fromCache:false},TAB="jour",SENT={},USER=null,UNSUB=null;
try{SENT=JSON.parse(localStorage.getItem("dg_sent")||"{}")}catch(e){}
function toast(m,ms){const e=document.createElement("div");e.className="toast";e.textContent=m;$("#toasts").appendChild(e);setTimeout(()=>e.remove(),ms||3000)}
function ask(msg,ok,reason){return new Promise(res=>{const bg=document.createElement("div");bg.className="sheet-bg";
 bg.innerHTML=`<div class="sheet" role="dialog"><p><b>${esc(msg)}</b></p>${reason?`<textarea id="ar" rows="3" placeholder="${esc(reason)}"></textarea>`:""}<div class="acts"><button class="b2 no" data-n>Annuler</button><button class="b2 yes" data-y>${esc(ok)}</button></div></div>`;
 document.body.appendChild(bg);bg.querySelector("[data-n]").onclick=()=>{bg.remove();res(false)};bg.querySelector("[data-y]").onclick=()=>{const v=reason?bg.querySelector("#ar").value.trim():true;if(reason&&reason.includes("obligatoire")&&v.length<3){toast("Motif obligatoire");return}bg.remove();res(v||true)};
 setTimeout(()=>{const t=bg.querySelector("textarea");if(t)t.focus()},50)})}

/* ---------- démarrage ---------- */
(async()=>{if(!window.DG_CONFIG||!DG_CONFIG.apiKey&&FBX.kind!=="mock"){$("#app").innerHTML=`<div class="login"><div class="lbox"><div class="logo">DMS</div><h1>App Gérant</h1><p>La configuration Firebase n'est pas encore installée (fichier config.js).</p></div></div>`;return}
 const NOP=(()=>{try{return localStorage.getItem("dg_nopersist")==="1"}catch(e){return true}})();
 /* Secours : si rien ne s'affiche (stockage du téléphone bloqué), on redémarre une fois sans le cache hors ligne. */
 const fallback=()=>{if(NOP)return;try{localStorage.setItem("dg_nopersist","1")}catch(e){}location.reload()};
 setTimeout(()=>{if(!window.DG_BOOT||!DG_BOOT.ok)fallback()},8000);
 setTimeout(()=>{if(USER&&!E&&navigator.onLine)fallback()},14000);
 try{const r=FBX.init(DG_CONFIG||{},{persistent:!NOP});if(r&&r.then)await Promise.race([r,new Promise(z=>setTimeout(z,4000))])}catch(e){const m=document.getElementById("bootmsg");if(m)m.textContent="Erreur : "+(e.message||e)}
 FBX.onAuth(u=>{USER=u;if(!u){if(UNSUB){UNSUB();UNSUB=null}return loginScreen()}
  if(!UNSUB)UNSUB=FBX.onDoc("boutique/etat",(d,m)=>{try{E=d&&typeof d.json==="string"?JSON.parse(d.json):d}catch(x){E=null};META=m||{};adjOld();watchObj();render()},e=>{$("#app").innerHTML=`<div class="login"><div class="lbox"><h1>Accès refusé</h1><p>${esc(e.message||e)}</p><button class="b2 yes" id="lo">Se déconnecter</button></div></div>`;$("#lo").onclick=()=>FBX.signOut()});
  render();setTimeout(majRelay,3000)})})();
async function majRelay(){/* publie la dernière version de la caisse (maj/derniere.json) dans Firebase si elle est plus récente */
 try{if(!/gerant@/.test(USER&&USER.email||""))return;const r=await fetch("maj/derniere.json?"+Date.now(),{cache:"no-store"});if(!r.ok)return;const j=await r.json();
 const cur=await FBX.get("maj/caisse");const n=v=>String(v||"0").split(".").map(Number),c=(a,b)=>{a=n(a);b=n(b);for(let i=0;i<3;i++)if((a[i]||0)!==(b[i]||0))return(a[i]||0)-(b[i]||0);return 0};
 if(cur&&cur.cle&&j.version&&j.url&&c(j.version,cur.version)>0)await FBX.set("maj/caisse",{version:j.version,url:j.url,publie:Date.now()},true)}catch(e){}}
if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
window.addEventListener("online",render);window.addEventListener("offline",render);
const EYE='<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
function loginScreen(){window.DG_BOOT&&(DG_BOOT.ok=true);$("#app").innerHTML=`<div class="login"><form class="lbox" id="lf"><div class="logo">DMS</div><h1>Dago Moto Shop</h1><p class="mute">App Gérant · version ${APP_VERSION}</p>
 <label>E-mail<input id="le" type="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(localStorage.getItem("dg_email")||"")}"></label>
 <label>Mot de passe<span class="pw"><input id="lp" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false"><button type="button" class="eye" id="lv" aria-label="Afficher le mot de passe">${ic(EYE)}</button></span></label>
 <button class="b2 yes" type="submit">Se connecter</button></form></div>`;
 $("#lv").onclick=()=>{const p=$("#lp");p.type=p.type==="password"?"text":"password"};$("#lf").onsubmit=async e=>{e.preventDefault();const em=$("#le").value.trim().toLowerCase();try{await FBX.signIn(em,$("#lp").value.trim());localStorage.setItem("dg_email",em)}catch(x){toast(/invalid|wrong|not-found/.test(String(x.code||x.message))?"E-mail ou mot de passe incorrect":"Connexion impossible : vérifiez internet",4000)}}}

/* ---------- affichage ---------- */
const TABS=[["jour","Jour",'<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>'],["valider","Valider",'<path d="m5 12 5 5 9-10"/>'],["dettes","Dettes",'<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6M17 11h5M19.5 8.5v5"/>'],["mois","Mois",'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],["plus","Plus",'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>']];
const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const PEN='<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>';const SRCH='<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>';const CLOCK='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',BOX='<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>';const WARN='<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/>',CHEV='<path d="m9 6 6 6-6 6"/>',MSG='<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>';
let DF="tout";
function pending(){return E?E.validations.filter(v=>!SENT[v.cle]):[]}
function render(){if(!USER)return;window.DG_BOOT&&(DG_BOOT.ok=true);const sy=$(".body")?$(".body").scrollTop:0;
 if(!E){$("#app").innerHTML=`<div class="login"><div class="lbox"><div class="logo">DMS</div><p>${navigator.onLine?"Chargement des données de la caisse…":"Pas de connexion internet. Les données apparaîtront dès que le téléphone sera connecté."}</p><p class="mute sm">Si rien n'arrive : vérifiez que la caisse est allumée et liée (Réglages › Téléphone et cloud).</p><p class="s">App version ${APP_VERSION}</p><button class="lnk" id="lo">Se déconnecter</button></div></div>`;$("#lo").onclick=()=>FBX.signOut();return}
 const off=!navigator.onLine||META.fromCache,old=Date.now()-E.maj>15*60000,nV=pending().length;
 const mois=(m=>m[0].toUpperCase()+m.slice(1))(MOIS[+E.mois.m.slice(5)-1]);
 const titles={jour:["",new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}).replace(/^./,c=>c.toUpperCase()),"Aujourd'hui"],valider:["","Ventes sous le prix minimum","À valider"+(E.validations.length?` <span class="mute">(${nV})</span>`:"")],dettes:["","Ce que les clients doivent","Dettes clients"],mois:["",E.mois.m.slice(0,4),mois],plus:["",esc(E.boutique),"Plus"]};
 const T=titles[TAB];
 $("#app").innerHTML=`<header class="mh"><div class="hl"><div class="lg" aria-hidden="true">DMS</div><div><small>${T[1]}</small><h1>${T[2]}</h1></div></div>
 <div class="hr"><span class="sync ${off||old?"w":""}">${off?"Hors ligne":"Caisse · "+ago(E.maj).replace("il y a ","").replace("à l'instant","maintenant")}</span><button class="ib" id="srch" aria-label="Rechercher">${ic(SRCH)}</button></div></header>
 ${old&&!off?`<div class="warnbar" role="status">La caisse n'a rien envoyé depuis ${ago(E.maj).replace("il y a ","")} : PC éteint, logiciel fermé ou pas d'internet au magasin.</div>`:""}
 <main class="body">${({jour:vJour,valider:vValider,dettes:vDettes,mois:vMois,plus:vPlus})[TAB]()}</main>
 <nav class="tabs" aria-label="Menu">${TABS.map(([k,l,p])=>`<button class="${k===TAB?"on":""}" data-t="${k}" ${k===TAB?'aria-current="page"':""}><span class="pill">${ic(p)}${k==="valider"&&nV?`<em>${nV}</em>`:""}</span>${l}</button>`).join("")}</nav>`;
 $$("[data-t]").forEach(b=>b.onclick=()=>{TAB=b.dataset.t;render();$(".body").scrollTop=0});
 bind();const bd=$(".body");if(bd&&sy)bd.scrollTop=sy}
function bar(v,max,a){return`<span class="bt ${a?"a":""}"><i style="width:${max?Math.max(2,Math.round(v*100/max)):0}%"></i></span>`}
function hbars(L,a){const mx=Math.max(1,...L.map(x=>x[1]));return L.map(([c,v])=>`<div class="hb"><div class="t"><span>${esc(c)}</span><b>${fmtN(v)}</b></div>${bar(v,mx,a)}</div>`).join("")}
function spark(){const P=E.mois.parJour.slice(-7);if(P.length<2)return"";const mx=Math.max(1,...P.map(x=>x[1]));
 return`<div class="spark" role="img" aria-label="Ventes des derniers jours">${P.map(([d,v],i)=>`<div><i class="${i===P.length-1?"on":""}" style="height:${Math.max(3,Math.round(v*44/mx))}px"></i><span>${d}</span></div>`).join("")}</div>`}
const kbox=(k,l,v,cls,sub)=>`<button class="kb" data-sh="${k}"><span class="l">${l}</span><b class="${cls||""}">${v}</b>${sub?`<small>${sub}</small>`:""}</button>`;
const lrow=(k,l,v,cls)=>`<button class="lr" data-sh="${k}"><span>${l}</span><b class="${cls||""}">${v}</b>${ic(CHEV)}</button>`;
function vJour(){const j=E.jour,nV=pending().length,late=E.dettes.liste.filter(x=>x.retard),nA=(nV?1:0)+(E.refusees?1:0)+(late.length?1:0)+(E.stock.faible.length?1:0);
 return`<button class="card hero tap" data-sh="ventes"><div class="ht"><div><div class="l">Ventes du jour</div><div class="v">${fmtN(j.ventes)} <small>Ar</small></div>
 <div class="leg"><span>${j.motos} moto${j.motos>1?"s":""} · ${j.tickets.filter(t=>!t.annule&&!t.ancienne).length} ticket(s)</span></div>${j.anciennes?`<div class="s" style="margin-top:4px">Hors anciennes dettes : ${fmtN(j.anciennes)} Ar</div>`:""}</div>${j.cloture?tag("Clôturée","g"):hoursOf(new Date())?tag("Journée ouverte","w"):tag("Boutique fermée")}</div>${spark()}</button>
 <section class="kg" aria-label="Chiffres clés">${kbox("encaisse","Encaissé",fmtN(j.encaisse))}${kbox("depenses","Dépenses",(j.depenses?"−":"")+fmtN(j.depenses),j.depenses?"red":"")}${kbox("marge","Marge estimée",j.marge==null?"—":fmtN(j.marge),"",j.couv&&j.couv<100?"coût connu "+j.couv+" %":"")}${kbox("credit","À crédit",fmtN(j.credit),j.credit?"amb":"")}</section>
 ${vObjJour()}
 <section class="card list" aria-label="Résumé">${lrow("soldes","Espèces attendues",fmtN(j.especes))}${lrow("cloture","Clôture",j.cloture?(j.cloture.ecart?"Écart "+fmtN(j.cloture.ecart):"Caisse juste"):"Pas encore faite",j.cloture?(j.cloture.ecart?"red":""):"amb")}</section>
 ${nA?`<div class="sec"><h2>À traiter</h2>${tag(nA,"r")}</div><section class="card list" aria-label="À traiter">
 ${nV?`<button class="ar" data-go="valider"><i class="ic a">${ic(WARN)}</i><span class="grow"><b>${nV} vente${nV>1?"s":""} sous le minimum</b><small>à accepter ou refuser</small></span>${ic(CHEV)}</button>`:""}
 ${E.refusees?`<div class="ar"><i class="ic r">${ic(WARN)}</i><span class="grow"><b>${E.refusees} vente(s) refusée(s)</b><small>pas encore régularisée(s) au magasin</small></span></div>`:""}
 ${late.length?`<button class="ar" data-go="dettes"><i class="ic r">${ic(CLOCK)}</i><span class="grow"><b>${late.length} dette${late.length>1?"s":""} en retard</b><small>${esc(late.slice(0,2).map(x=>x.tiers).join(", "))} · ${fmtN(late.reduce((s,x)=>s+x.reste,0))}</small></span>${ic(CHEV)}</button>`:""}
 ${E.stock.faible.length?`<button class="ar" data-go="plus"><i class="ic a">${ic(BOX)}</i><span class="grow"><b>Stock faible : ${E.stock.faible.length} article(s)</b><small>${esc(E.stock.faible.slice(0,2).map(i=>i.nom).join(", "))}</small></span>${ic(CHEV)}</button>`:""}</section>`:""}
 <div class="sec"><h2>Tickets du jour</h2></div><section class="card list">${j.tickets.map((t,i)=>`<button class="li tap ${t.annule?"strike":""}" data-tk="${i}"><span class="grow"><b>${esc(t.lib)}</b><small class="mute">${t.h}${t.n?" · n° "+t.n:""}${t.tiers?" · "+esc(t.tiers):""}</small>${t.annule?`<span class="tgs">${tag("annulé","r")}</span>`:t.ancienne?`<span class="tgs">${tag("ancienne dette · non comptée")}</span>`:""}</span><b>${fmtN(t.tot)}</b></button>`).join("")||`<p class="mute pad">Aucune vente pour l'instant.</p>`}</section>
 <div class="sec"><h2>Dépenses du jour</h2></div><section class="card list">${j.depensesListe.map(o=>`<button class="li tap" data-sh="depenses"><span class="grow"><b>${esc(o.lib)}</b><small class="mute">${o.h} · ${esc(o.cat)}${o.tiers?" · "+esc(o.tiers):""}</small></span><b class="red">−${fmtN(o.m)}</b></button>`).join("")||`<p class="mute pad">Aucune dépense.</p>`}</section>`}
function vValider(){const L=E.validations;if(!L.length)return`<div class="empty">Aucune vente à valider. Tout est en ordre.</div>`;
 return L.map(v=>{const prix=v.lignes.reduce((s,l)=>s+l.prix,0),mn=v.lignes.reduce((s,l)=>s+l.minimum,0),ct=v.lignes.reduce((s,l)=>s+l.cout,0),sent=SENT[v.cle];
  return`<article class="card vc"><div class="top"><div><h3>${esc(v.lignes.map(l=>l.lib).join(" + "))}</h3><div class="mute sm">${v.ticket?"Ticket n° "+v.ticket+" · ":""}${fd(v.date)} · ${esc(v.par)}</div></div>${tag(v.vente)}</div>
  <div class="cmp"><div><small>Vendu</small><b>${fmtN(prix)}</b></div><div><small>Minimum</small><b>${fmtN(mn)}</b></div><div class="bad"><small>Écart</small><b>${fmtN(prix-mn)}</b></div></div>
  <div class="motif"><b>Client :</b> ${esc(v.tiers||"client comptoir")}${ct?`<br><b>Marge restante :</b> <span class="${prix<ct?"red":""}">${fmtN(prix-ct)} Ar (${Math.round((prix-ct)*100/prix)} %)</span>`:""}${v.motif?`<br><b>Motif du caissier :</b> « ${esc(v.motif)} »`:""}</div>
  ${sent?`<div class="note">${sent==="accepte"?"Accepté":"Refusé"} — transmis à la caisse${navigator.onLine?"":" dès le retour du réseau"}.</div>`:`<div class="acts"><button class="b2 no" data-ref="${esc(v.cle)}">Refuser</button><button class="b2 yes" data-acc="${esc(v.cle)}">Accepter</button></div>
  <div class="s">La décision s'affiche sur la caisse tout de suite (ou dès que le PC retrouve internet).</div>`}</article>`}).join("")}
function dueSoon(x){if(!x.ech||x.retard)return false;const d=(new Date(x.ech)-new Date(new Date().toISOString().slice(0,10)))/864e5;return d>=0&&d<=7}
function relance(x){return`Bonjour ${x.tiers}, c'est Dago Moto Shop. Petit rappel : il reste ${fmtN(x.reste)} Ar à régler${x.lib?" pour « "+x.lib+" »":""}${x.ech?(x.retard?", l'échéance était le ":", échéance le ")+fd(x.ech):""}. Merci de passer à la boutique ou de payer par MVola.`}
function daysLate(x){return Math.max(1,Math.round((new Date(new Date().toISOString().slice(0,10))-new Date(x.ech))/864e5))}
function ini(n){const w=String(n||"?").trim().split(/\s+/);return(w.length>1?w[0][0]+w[1][0]:w[0].slice(0,2)).toUpperCase()}
function vDettes(){const all=E.dettes.liste,late=all.filter(x=>x.retard),L=DF==="retard"?late:DF==="semaine"?all.filter(dueSoon):all,sl=late.reduce((s,x)=>s+x.reste,0),tt=E.dettes.total;
 return`<section class="card" aria-label="Total des dettes"><div class="l2">Total à encaisser · ${E.dettes.n} client${E.dettes.n>1?"s":""}</div><div class="big">${fmtN(tt)} <small>Ar</small></div>
 ${tt?`<div class="split" role="img" aria-label="En retard ${fmtN(sl)}, à venir ${fmtN(tt-sl)}"><i style="width:${Math.round(sl*100/tt)}%"></i><b></b></div><div class="spl"><span><b class="red">En retard</b> · ${fmtN(sl)}</span><span>À venir · ${fmtN(tt-sl)}</span></div>`:""}</section>
 <div class="seg3" role="group" aria-label="Filtre">${[["tout","Toutes"],["retard","En retard"],["semaine","Cette semaine"]].map(([k,l])=>`<button class="${DF===k?"on":""}" data-df="${k}" aria-pressed="${DF===k}">${l}</button>`).join("")}</div>
 ${L.length?`<section class="card list" aria-label="Liste des dettes">${L.map(x=>`<div class="dr"><span class="av" aria-hidden="true">${esc(ini(x.tiers))}</span><div class="grow"><div class="dt"><b>${esc(x.tiers)}</b><b>${fmtN(x.reste)}</b></div><small class="mute el">${esc(x.lib)}</small><div>${MODS["d:"+x.id]==="modif"?tag("modification envoyée","w")+" ":""}${x.ech?(x.retard?tag(daysLate(x)+" j de retard","r"):tag("Échéance le "+fd(x.ech),dueSoon(x)?"w":"")):tag("Sans échéance")}</div></div>
 <span class="dbtn"><button class="ib" data-rel="${all.indexOf(x)}" aria-label="Relancer ${esc(x.tiers)}">${ic(MSG)}</button>${x.id&&E.listes?`<button class="ib" data-edd="${all.indexOf(x)}" aria-label="Modifier la dette de ${esc(x.tiers)}">${ic(PEN)}</button>`:""}</span></div>`).join("")}</section><p class="s" style="text-align:center;margin:0">Le bouton bulle prépare le message de relance (WhatsApp, SMS…).</p>`:`<div class="empty">Aucune dette ici.</div>`}`}
let MF="mois";
function vModeles(){const m=E.mois;if(!m.modeles)return`<section class="card"><div class="ct"><b>Scooters vendus par modèle</b></div><div class="note">Ce graphique apparaîtra après la mise à jour de la caisse du PC (version 2.1).</div></section>`;
 const L=(MF==="tout"?m.modelesTout:m.modeles)||[],mx=Math.max(1,...L.map(x=>x[1])),n=L.reduce((s,x)=>s+x[1],0);
 return`<section class="card" aria-label="Scooters vendus par modèle"><div class="ct"><b>Scooters vendus par modèle</b><span class="sm mute">${n} moto${n>1?"s":""}</span></div>
 <div class="seg3" role="group" aria-label="Période" style="margin:4px 0 12px">${[["mois","Ce mois"],["tout","Depuis le début"]].map(([k,l])=>`<button class="${MF===k?"on":""}" data-mf="${k}" aria-pressed="${MF===k}">${l}</button>`).join("")}</div>
 ${L.map(([nom,q,v])=>`<div class="hb"><div class="t"><span>${esc(nom)}</span><b>${q}</b></div><span class="bt a mdl"><i style="width:${Math.max(3,Math.round(q*100/mx))}%"></i></span><div class="s" style="margin-top:3px">${fmtN(v)} Ar${q>1?" · moyenne "+fmtN(v/q):""}</div></div>`).join("")||`<p class="mute pad">Aucun scooter vendu sur cette période.</p>`}</section>`}
function cumul(){/* courbe du cumul des ventes du mois face à l'objectif (réparti selon les heures d'ouverture) */
 const m=E.mois,[y,mo]=m.m.split("-").map(Number),nd=new Date(y,mo,0).getDate(),O=objMois(),goal=O.ca;if(!goal)return"";
 const per={};m.parJour.forEach(([d,v])=>per[+d]=v);const now=new Date(),cur=(now.getFullYear()===y&&now.getMonth()===mo-1)?now.getDate():nd;
 let c=0,h=0;const act=[],tgt=[[0,0]];for(let d=1;d<=nd;d++){h+=hoursOf(new Date(y,mo-1,d));tgt.push([d,goal*h/O.H]);if(d<=cur){c+=per[d]||0;act.push([d,c])}}
 const W=320,Hh=150,mx=Math.max(goal,c)*1.05,X=d=>(d/nd*W).toFixed(1),Y=v=>(Hh-v/mx*Hh).toFixed(1),pth=a=>a.map((p,i)=>(i?"L":"M")+X(p[0])+" "+Y(p[1])).join(" ");
 const last=act[act.length-1]||[0,0],tAt=(tgt[cur]||[0,0])[1],diff=c-tAt;
 return`<section class="card" aria-label="Cumul du mois"><div class="ct"><b>Cumul du mois</b><span class="sm ${diff>=0?"okc":"amb"}">${diff>=0?"En avance de ":"En retard de "}${fmtN(Math.abs(Math.round(diff/1000)*1000))} Ar</span></div>
 <svg class="cum" viewBox="-4 -8 ${W+8} ${Hh+24}" role="img" aria-label="Cumul des ventes ${fmtN(c)} Ar, objectif ${fmtN(goal)} Ar">
 <line x1="0" y1="${Y(goal)}" x2="${W}" y2="${Y(goal)}" class="cg"/><text x="${W}" y="${(+Y(goal)-5).toFixed(1)}" text-anchor="end" class="ctx">Objectif ${(goal/1e6).toFixed(0)} M</text>
 <path d="${pth(tgt)}" class="ct2"/><path d="${pth([[0,0],...act])} L${X(last[0])} ${Hh} L0 ${Hh}Z" class="ca2"/><path d="${pth([[0,0],...act])}" class="cl"/>
 <circle cx="${X(last[0])}" cy="${Y(last[1])}" r="5" class="cd"/><line x1="0" y1="${Hh}" x2="${W}" y2="${Hh}" class="cx"/>
 <text x="0" y="${Hh+16}" class="ctx">1</text><text x="${X(15)}" y="${Hh+16}" text-anchor="middle" class="ctx">15</text><text x="${W}" y="${Hh+16}" text-anchor="end" class="ctx">${nd}</text></svg>
 <div class="leg2"><span><i class="la"></i>Ventes cumulées · ${fmtN(c)}</span><span><i class="lt"></i>Rythme objectif</span></div></section>`}
function vMois(){const m=E.mois,maxJ=Math.max(1,...m.parJour.map(x=>x[1]));
 return`<section class="card" aria-label="Résultat du mois"><div class="ht"><button class="tap in2" data-sh="mres"><div class="l2">Résultat estimé</div><div class="big">${m.marge==null?"—":fmtN(m.marge-m.charges)} <small>Ar</small></div></button>${tag(m.motos+" moto"+(m.motos>1?"s":""),"g")}</div>
 <div class="c3"><button data-sh="mca"><small>Chiffre d'affaires</small><b>${fmtN(m.ca)}</b></button><button data-sh="mmarge"><small>Marge</small><b>${m.marge==null?"—":fmtN(m.marge)}</b></button><button data-sh="mcharges"><small>Charges</small><b>${fmtN(m.charges)}</b></button></div>
 ${m.couv?`<div class="s" style="margin-top:8px">Coût d'achat connu pour ${m.couv} % des ventes.</div>`:""}${m.anciennes?`<div class="s" style="margin-top:4px">Hors anciennes dettes : ${fmtN(m.anciennes)} Ar.</div>`:""}</section>
 
 ${cumul()}<section class="card" aria-label="Ventes par jour"><div class="ct"><b>Ventes par jour</b><span class="sm mute">millions d'Ar</span></div>
 <div class="vbars">${m.parJour.map(([d,v])=>`<div class="vb"><b>${(v/1e6).toFixed(1).replace(".",",")}</b><i style="height:${Math.round(v*72/maxJ)}%"></i><span>${d}</span></div>`).join("")||`<p class="mute">Aucune vente ce mois-ci.</p>`}</div></section>
 ${vObjMois()}
 ${vModeles()}
 <section class="card"><div class="ct"><b>Ventes par catégorie</b></div>${hbars(m.parCat,true)||`<p class="mute pad">—</p>`}</section>
 <section class="card"><div class="ct"><b>Plus grosses sorties</b></div>${hbars(m.depCat)||`<p class="mute pad">—</p>`}
 <div class="s" style="margin-top:10px">Retraits des associés ${fmtN(m.retraits)} · camion à refacturer ${fmtN(m.camion)} (hors charges)</div></section>
 <h2>Soldes</h2><section class="card list">${Object.entries(E.soldes).map(([k,v])=>`<div class="li"><span class="grow">${esc(k)}</span><b>${fmtN(v)}</b></div>`).join("")}</section>`}
const STL={recue:"Reçue",encours:"En réparation",prete:"Prête",livree:"Livrée"};
function vPlus(){const dark=document.documentElement.dataset.theme!=="light";
 return`<h2>Envoyer un message à la caisse</h2><section class="card"><label class="sm" for="msg" style="font-weight:600;color:var(--sub)">Message</label><textarea id="msg" rows="3" placeholder="Ex. : Ne pas vendre la Kymco Many sous 2 500 000." style="margin-top:6px"></textarea><button class="b2 yes full" id="sendm">Envoyer</button><p class="mute sm" style="margin:8px 0 0">Le message s'affiche en haut de l'écran de la caisse jusqu'à ce qu'un caissier clique « Lu ».</p></section>
 <h2>Atelier</h2><section class="card list">${E.atelier.map(r=>`<div class="li"><span class="grow"><b>${esc(r.num)} · ${esc(r.moto)}</b><small class="mute">${esc(r.client||"comptoir")}${r.meca?" · "+esc(r.meca):""}</small></span><span class="r">${tag(STL[r.statut]||r.statut,r.statut==="prete"?"g":r.attente?"w":"")}${r.total?`<small>${fmtN(r.total)}</small>`:""}</span></div>`).join("")||`<p class="mute pad">Aucune réparation en cours.</p>`}</section>
 <h2>Stock faible</h2><section class="card list">${E.stock.faible.map(i=>`<div class="li"><span class="grow">${esc(i.nom)}</span><b class="red">${i.qte}</b><small class="mute"> / ${i.seuil}</small></div>`).join("")||`<p class="mute pad">Rien à signaler.</p>`}${E.stock.negatif?`<p class="pad sm red">${E.stock.negatif} article(s) à inventorier (stock négatif).</p>`:""}</section>
 <h2>Arrivages</h2><section class="card list">${E.arrivages.map(a=>`<div class="li"><span class="grow"><b>${esc(a.ref)}</b><small class="mute">${fd(a.date)} · ${a.lignes} ligne(s)</small></span><span class="r">${a.statut==="valide"?tag("Validé","g"):tag("Brouillon","w")}<small>${fmtN(a.total)}</small></span></div>`).join("")||`<p class="mute pad">Aucun arrivage.</p>`}</section>
 <h2>Apparence</h2><div class="ths" role="radiogroup" aria-label="Thème">${[["auto","Automatique","Suit le réglage du téléphone"],["light","Clair","Meilleur en plein soleil, à la boutique"],["dark","Sombre","Repose les yeux le soir"]].map(([k,t,d])=>`<button class="th ${curTheme()===k?"on":""}" role="radio" aria-checked="${curTheme()===k}" data-th="${k}"><span class="sw ${k}" aria-hidden="true"></span><span class="grow"><b>${t}</b><small>${d}</small></span><i class="rd"></i></button>`).join("")}</div>
 <h2>Compte</h2><section class="card"><p class="sm" style="margin:0">Connecté : ${esc(USER.email)}</p><p class="sm mute" style="margin:4px 0 0">App version ${APP_VERSION} · caisse version ${esc(E.version)}. Dernier envoi de la caisse : ${new Date(E.maj).toLocaleString("fr-FR")}.</p><button class="b2 ghost full" id="lo">Se déconnecter</button></section>
 <p class="mute sm" style="margin:0 2px">Installer l'app : Android (Chrome) menu ⋮ › « Ajouter à l'écran d'accueil ». iPhone (Safari) bouton Partager › « Sur l'écran d'accueil ».</p>`}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy")}catch(x){}a.remove();return ok}}
function curTheme(){try{return localStorage.getItem("dg_theme")||"auto"}catch(e){return"auto"}}
function applyTheme(){const p=curTheme(),light=p==="light"||(p==="auto"&&window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches);
 if(light)document.documentElement.dataset.theme="light";else delete document.documentElement.dataset.theme;const m=$('meta[name="theme-color"]');if(m)m.content=light?"#f5f6f8":"#09090b"}
function setTheme(t){try{localStorage.setItem("dg_theme",t)}catch(e){}applyTheme();render()}
try{matchMedia("(prefers-color-scheme: light)").addEventListener("change",()=>{applyTheme();if(USER)render()})}catch(e){}applyTheme();
/* ---------- panneaux de détail (clic sur une carte) ---------- */
const X_ICON='<path d="M6 6l12 12M18 6 6 18"/>';
function closeSheet(fromPop){const bg=$("#dsheet");if(!bg)return;bg.remove();if(!fromPop&&history.state&&history.state.sheet)history.back()}
window.addEventListener("popstate",()=>closeSheet(true));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
function openSheet(title,html){closeSheet(true);const bg=document.createElement("div");bg.className="sheet-bg";bg.id="dsheet";
 bg.innerHTML=`<div class="sheet tall" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sh-h"><h2 class="sh-t">${esc(title)}</h2><button class="x" id="shx" aria-label="Fermer">${ic(X_ICON)}</button></div><div class="sh-b">${html}</div></div>`;
 document.body.appendChild(bg);bg.onclick=e=>{if(e.target===bg)closeSheet()};$("#shx").onclick=()=>closeSheet();
 $$("[data-go]",bg).forEach(b=>b.onclick=()=>{closeSheet();TAB=b.dataset.go;render()});
 try{history.pushState({sheet:1},"")}catch(e){}setTimeout(()=>{const x=$("#shx");if(x)x.focus()},30)}
const row=(a,b,c,cls)=>`<div class="li"><span class="grow"><b>${a}</b>${c?`<small class="mute">${c}</small>`:""}</span><b class="${cls||""}">${b}</b></div>`;
const tot=(l,v,cls)=>`<div class="sh-tot"><span>${l}</span><b class="${cls||""}">${v}</b></div>`;
function tkTags(t){return[t.annule?tag("annulé","r"):"",t.ancienne?tag("ancienne dette · non comptée"):"",t.credit?tag("crédit","w"):"",t.acompte?tag("acompte","w"):"",t.sousMin?tag("sous le minimum","r"):""].join(" ")}
function tkRow(t,i){return`<button class="li tap" data-tk="${i}"><span class="grow"><b class="${t.annule?"strike":""}">${esc(t.lib)}</b><small class="mute">${t.h}${t.n?" · n° "+t.n:""}${t.tiers?" · "+esc(t.tiers):""}${t.modes?" · "+esc(t.modes):""}</small>${tkTags(t)?`<span class="tgs">${tkTags(t)}</span>`:""}</span><b>${fmtN(t.tot)}</b></button>`}
function groupSum(A,k,v){const o={};A.forEach(x=>{const kk=k(x)||"—";o[kk]=(o[kk]||0)+v(x)});return Object.entries(o).sort((a,b)=>b[1]-a[1])}
const SHEETS={
 ventes(){const j=E.jour,T=j.tickets;return[`Ventes du jour`,tot("Total des ventes",fmtN(j.ventes)+" Ar")+`<p class="s" style="margin:4px 0 8px">${j.motos} moto${j.motos>1?"s":""} · ${T.filter(t=>!t.annule).length} ticket(s). Touchez un ticket pour le détail.</p><div class="card list">${T.map(tkRow).join("")||`<p class="mute pad">Aucune vente pour l'instant.</p>`}</div>`]},
 encaisse(){const j=E.jour,P=j.tickets.filter(t=>!t.annule&&!t.credit),G=groupSum(P,t=>t.modes,t=>t.tot);
  return["Encaissé aujourd'hui",tot("Total encaissé",fmtN(j.encaisse)+" Ar")+`<p class="s" style="margin:4px 0 8px">Comprend les ventes payées, les paiements de dettes et les autres entrées (hors transferts).</p>
  <h3 class="sh-s">Ventes payées, par mode</h3><div class="card list">${G.map(([m,v])=>row(esc(m),fmtN(v))).join("")||`<p class="mute pad">Aucune vente payée.</p>`}</div>
  <h3 class="sh-s">Détail</h3><div class="card list">${P.map(t=>tkRow(t,j.tickets.indexOf(t))).join("")||`<p class="mute pad">—</p>`}</div>`]},
 depenses(){const j=E.jour,L=j.depensesListe,G=groupSum(L,o=>o.cat,o=>o.m);
  return["Dépenses du jour",tot("Total",(j.depenses?"−":"")+fmtN(j.depenses)+" Ar","red")+`<h3 class="sh-s">Par catégorie</h3><div class="card list">${G.map(([c,v])=>row(esc(c),"−"+fmtN(v),"","red")).join("")||`<p class="mute pad">Aucune dépense.</p>`}</div><h3 class="sh-s">Détail</h3>`,L.map(o=>({id:o.id,lib:o.lib,m:o.m,mode:o.mode,cat:o.cat,tiers:o.tiers,type:"S"}))]},
 credit(){const j=E.jour,L=j.tickets.filter(t=>!t.annule&&(t.credit||t.acompte));
  return["Ventes à crédit aujourd'hui",tot("Vendu à crédit",fmtN(j.credit)+" Ar")+`<div class="card list" style="margin-top:8px">${L.map(t=>tkRow(t,j.tickets.indexOf(t))).join("")||`<p class="mute pad">Aucune vente à crédit aujourd'hui.</p>`}</div>
  <button class="b2 ghost full" data-go="dettes">Voir toutes les dettes clients (${fmtN(E.dettes.total)} Ar)</button>`]},
 cloture(){const c=E.jour.cloture;if(!c)return["Clôture du jour",`<div class="note">La clôture n'est pas encore faite. Elle se fait sur le PC de la caisse (touche F9) : comptage du tiroir, puis MVola, Orange Money et banques.</div>`+tot("Espèces attendues dans le tiroir",fmtN(E.jour.especes)+" Ar")];
  return["Clôture du jour",`<div class="card list">${row("Faite par",esc(c.par))}${row("Heure",new Date(c.ts).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}))}${row("Espèces attendues",fmtN(c.attendu))}${row("Compté",c.compte==null?"—":fmtN(c.compte))}${row("Écart",fmtN(c.ecart),"",c.ecart?"red":"")}</div>${c.comment?`<div class="note" style="margin-top:10px"><b>Commentaire :</b> « ${esc(c.comment)} »</div>`:""}`]},
 soldes(){const S=Object.entries(E.soldes);return["Soldes par mode",tot("Espèces attendues",fmtN(E.jour.especes)+" Ar")+`<div class="card list" style="margin-top:8px">${S.map(([k,v])=>row(esc(k),fmtN(v))).join("")}</div>${tot("Total tous modes",fmtN(S.reduce((s,x)=>s+x[1],0))+" Ar")}<p class="s">Les soldes sont justes après chaque clôture où le gérant a corrigé les montants comptés.</p>`]},
 marge(){const j=E.jour;return["Marge du jour",j.marge==null?`<div class="note">Marge inconnue : aucun coût d'achat n'est renseigné pour les articles vendus aujourd'hui (page Articles ou Arrivages sur le PC).</div>`:
  `<div class="card list">${row("Ventes",fmtN(j.ventes))}${row("Marge estimée",fmtN(j.marge))}${row("Taux de marge",j.ventes?Math.round(j.marge*100/j.ventes)+" %":"—")}${row("Coût d'achat connu pour",j.couv+" % des ventes")}</div><p class="s">Si le coût d'un article n'est pas connu, sa marge n'est pas comptée : la marge réelle peut être un peu différente.</p>`]},
 mca(){const m=E.mois;return["Chiffre d'affaires du mois",tot("Total",fmtN(m.ca)+" Ar")+`<p class="s" style="margin:4px 0 8px">${m.motos} moto${m.motos>1?"s":""} vendue${m.motos>1?"s":""}${m.objCa?" · objectif "+fmtN(m.objCa)+" Ar ("+Math.round(m.ca*100/m.objCa)+" %)":""}</p>
  <h3 class="sh-s">Par jour</h3><div class="card list">${m.parJour.slice().reverse().map(([d,v])=>row(d+"/"+m.m.slice(5,7),fmtN(v))).join("")||`<p class="mute pad">—</p>`}</div>
  <h3 class="sh-s">Par catégorie</h3><div class="card list">${m.parCat.map(([c,v])=>row(esc(c),fmtN(v))).join("")}</div>`]},
 mmarge(){const m=E.mois;return["Marge du mois",m.marge==null?`<div class="note">Marge inconnue : renseignez les coûts d'achat sur le PC.</div>`:`<div class="card list">${row("Chiffre d'affaires",fmtN(m.ca))}${row("Marge estimée",fmtN(m.marge))}${row("Taux de marge",m.ca?Math.round(m.marge*100/m.ca)+" %":"—")}${row("Coût d'achat connu pour",m.couv+" % des ventes")}</div>`]},
 mcharges(){const m=E.mois;return["Charges du mois",tot("Charges de la boutique",fmtN(m.charges)+" Ar")+`<h3 class="sh-s">Sorties par catégorie</h3><div class="card list">${m.depCat.map(([c,v])=>row(esc(c),fmtN(v),/Retraits des associés|camion/i.test(c)?"hors charges":"")).join("")||`<p class="mute pad">—</p>`}</div>
  <p class="s">Les retraits des associés (${fmtN(m.retraits)}) et les dépenses du camion à refacturer (${fmtN(m.camion)}) ne comptent pas dans les charges.</p>`]},
 mres(){const m=E.mois;return["Résultat du mois",m.marge==null?`<div class="note">Résultat inconnu tant que les coûts d'achat ne sont pas renseignés.</div>`:`<div class="card list">${row("Marge estimée",fmtN(m.marge))}${row("− Charges",fmtN(m.charges),"","red")}${row("= Résultat",fmtN(m.marge-m.charges))}</div><p class="s">Hors retraits des associés (${fmtN(m.retraits)}) et camion (${fmtN(m.camion)}).</p>`]}
};
function showSheet(k){const f=SHEETS[k];if(!f||!E)return;const[t,h,ops]=f();if(ops){if(ops.length&&ops[0].id)opsSheet(t,h,ops);else openSheet(t,h+`<div class="card list">${ops.map(o=>row(esc(o.lib),"−"+fmtN(o.m),"","red")).join("")||`<p class="mute pad">—</p>`}</div>`);return}openSheet(t,h);bindSheetTickets()}
function showTicket(i){const t=E.jour.tickets[+i];if(!t)return;
 const head=`${tot("Total",fmtN(t.tot)+" Ar")}<div class="card list" style="margin-top:8px">${row("Heure",t.h)}${row("Client",esc(t.tiers||"client comptoir"))}${row("Paiement",esc(t.modes||"—"))}${t.par?row("Caissier",esc(t.par)):""}</div>${tkTags(t)?`<p style="margin:10px 0 0">${tkTags(t)}</p>`:""}${t.sousMin?`<button class="b2 ghost full" data-go="valider">Voir les ventes à valider</button>`:""}<h3 class="sh-s">Lignes du ticket</h3>`;
 const ops=t.annule?[]:(t.lignes||[]).map(l=>({id:l.id,lib:l.lib,m:l.m,mode:l.mode,cat:l.cat,tiers:l.tiers,type:"E"}));
 if(!ops.length){openSheet(t.n?"Ticket n° "+t.n:"Ticket",head+`<div class="card list"><div class="li"><span class="grow"><b>${esc(t.lib)}</b></span><b>${fmtN(t.tot)}</b></div></div>${t.credit?`<p class="s">Vente à crédit : modifiable sur le PC (page Clients).</p>`:t.annule?"":`<div class="note sm" style="margin-top:8px">Pour modifier depuis le téléphone, mettez à jour la caisse du PC (version 2.2).</div>`}`);return}
 opsSheet(t.n?"Ticket n° "+t.n:"Ticket",head,ops)}
function bindSheetTickets(){$$("#dsheet [data-tk]").forEach(b=>b.onclick=()=>showTicket(b.dataset.tk))}
/* ---------- objectifs (jour et mois) ----------
   Heures d'ouverture : lundi-vendredi 9h-17h (8 h), samedi 9h-12h (3 h), dimanche et jours fériés fermés.
   Objectif du jour fixe = objectif du mois × heures du jour ÷ heures du mois.
   Objectif pour rattraper = (objectif du mois − déjà fait avant aujourd'hui) × heures du jour ÷ heures restantes depuis ce matin. */
let OBJ=null,OBJ_YM="",OBJ_UNSUB=null;
/* Proposition par heure d'ouverture, calée sur novembre 2026 (180 h) : 70 M Ar de ventes, 21 M de marge (≈30 %), 22 motos. */
const OBJ_PROP={ca:70000000/180,marge:21000000/180,motos:22/180};
function paques(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=(h+l-7*m+114)%31+1;return new Date(y,mo-1,da)}
const FERIES={};
function feries(y){if(FERIES[y])return FERIES[y];const S=new Set(["01-01","03-08","03-29","05-01","06-26","08-15","11-01","12-25"].map(x=>y+"-"+x)),p=paques(y),add=n=>{const d=new Date(p);d.setDate(d.getDate()+n);S.add(ymd(d))};add(1);add(39);add(50);return FERIES[y]=S}
function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function openH(d){if(feries(d.getFullYear()).has(ymd(d)))return[0,0];const w=d.getDay();return w===0?[0,0]:w===6?[9,12]:[9,17]}
function hoursOf(d){const[a,b]=openH(d);return b-a}
function elapsedToday(now){const[a,b]=openH(now);if(a===b)return 0;const t=now.getHours()+now.getMinutes()/60;return Math.max(0,Math.min(b,t)-a)}
function monthHours(y,m){let h=0;const d=new Date(y,m,1);while(d.getMonth()===m){h+=hoursOf(d);d.setDate(d.getDate()+1)}return h}
function hoursBefore(now){let h=0;const d=new Date(now.getFullYear(),now.getMonth(),1);while(d.getDate()<now.getDate()){h+=hoursOf(d);d.setDate(d.getDate()+1)}return h}
function workDaysLeft(now){let n=0;const d=new Date(now);d.setHours(0,0,0,0);const m=d.getMonth();while(d.getMonth()===m){if(hoursOf(d))n++;d.setDate(d.getDate()+1)}return n}
function curYM(){return E&&E.mois&&E.mois.m||ymd(new Date()).slice(0,7)}
function watchObj(){const ym=curYM();if(OBJ_YM===ym&&OBJ_UNSUB)return;if(OBJ_UNSUB){OBJ_UNSUB();OBJ_UNSUB=null}OBJ_YM=ym;OBJ=null;
 OBJ_UNSUB=FBX.onDoc("objectifs/"+ym,d=>{OBJ=d||null;OBJ_OK=true;adjMonth();saveOld();render()},()=>{})}
function objMois(){const now=new Date(),H=monthHours(now.getFullYear(),now.getMonth());
 if(OBJ&&(OBJ.ca||OBJ.marge||OBJ.motos))return{ca:+OBJ.ca||0,marge:+OBJ.marge||0,motos:+OBJ.motos||0,prop:false,H};
 return{ca:Math.round(OBJ_PROP.ca*H/100000)*100000,marge:Math.round(OBJ_PROP.marge*H/100000)*100000,motos:Math.round(OBJ_PROP.motos*H),prop:true,H}}
function fmtQ(v,k){return k==="motos"?(Math.round(v*10)/10).toString().replace(".",","):fmtN(Math.round(v/1000)*1000)}
function gaugeRow(lbl,k,val,goal,expect,extra){if(!goal)return"";const pct=Math.min(100,val*100/goal),ex=Math.min(100,expect*100/goal),ahead=val>=expect,unit=k==="motos"?"":" Ar";
 const st=val>=goal?`<span class="ok">Objectif atteint</span>`:expect>0?(ahead?`<span class="ok">En avance de ${fmtQ(val-expect,k)}${unit}</span>`:`<span class="lt">En retard de ${fmtQ(expect-val,k)}${unit}</span>`):`<span class="mute">Pas encore commencé</span>`;
 return`<div class="gr"><div class="gt"><span>${lbl}</span><span><b>${val==null?"—":fmtQ(val,k)}</b><span class="mute"> / ${fmtQ(goal,k)}${unit}</span></span></div>
 <div class="gb" role="img" aria-label="${lbl} : ${Math.round(pct)} % de l'objectif"><i class="${val>=goal?"done":""}" style="width:${pct}%"></i>${expect>0&&expect<goal?`<u style="left:${ex}%"></u>`:""}</div>
 <div class="gs">${st}${extra?`<span class="mute">${extra}</span>`:""}</div></div>`}
function vObjJour(){const now=new Date(),hT=hoursOf(now);if(!E)return"";const O=objMois(),j=E.jour,m=E.mois;
 if(!hT)return`<section class="card obj"><div class="ct"><b>Objectifs du jour</b><button class="lk" data-objedit>Modifier</button></div><p class="mute sm" style="margin:0">Boutique fermée aujourd'hui (${now.getDay()===0?"dimanche":"jour férié"}). Pas d'objectif.</p></section>`;
 const hB=hoursBefore(now),rest=O.H-hB,frac=elapsedToday(now)/hT,R=k=>{const done=(k==="motos"?m.motos-j.motos:k==="ca"?m.ca-j.ventes:(m.marge==null?0:m.marge)-(j.marge||0)),g=O[k];return{fixe:g*hT/O.H,ratt:rest>0?Math.max(0,g-done)*hT/rest:0}};
 const row=(lbl,k,val)=>{const r=R(k),tgt=Math.max(r.fixe,r.ratt),unit=k==="motos"?"":" Ar";return gaugeRow(lbl,k,val,tgt,tgt*frac,Math.abs(r.ratt-r.fixe)>(k==="motos"?0.05:1000)?`Prévu ${fmtQ(r.fixe,k)}${unit} · pour tenir le mois : ${fmtQ(r.ratt,k)}${unit}`:`Prévu ${fmtQ(r.fixe,k)}${unit}`)};
 return`<section class="card obj" aria-label="Objectifs du jour"><div class="ct"><b>Objectifs du jour</b><button class="lk" data-objedit>${O.prop?"Proposés · modifier":"Modifier"}</button></div>
 <p class="s" style="margin:-2px 0 8px">${now.getDay()===6?"Samedi 9h–12h":"9h–17h"} · ${Math.round(frac*100)} % de la journée passée · trait : niveau attendu</p>
 ${row("Ventes","ca",j.ventes)}${row("Marge","marge",j.marge==null?0:j.marge)}${row("Motos","motos",j.motos)}
 ${j.marge==null&&j.ventes?`<p class="s" style="margin:6px 0 0">Marge du jour inconnue : coûts d'achat non renseignés.</p>`:""}</section>`}
function vObjMois(){if(!E)return"";const now=new Date(),O=objMois(),m=E.mois,hB=hoursBefore(now)+elapsedToday(now),fr=O.H?hB/O.H:0,left=workDaysLeft(now)-(elapsedToday(now)>=hoursOf(now)&&hoursOf(now)?1:0);
 const row=(lbl,k,val)=>{const g=O[k],rem=Math.max(0,g-(val||0)),unit=k==="motos"?"":" Ar";return gaugeRow(lbl,k,val||0,g,g*fr,rem>0&&left>0?`Reste ${fmtQ(rem,k)}${unit} · ${fmtQ(rem/left,k)}${unit} par jour ouvré (${left} j)`:"")};
 return`<section class="card obj" aria-label="Objectifs du mois"><div class="ct"><b>Objectifs du mois</b><button class="lk" data-objedit>Modifier</button></div>
 ${O.prop?`<div class="note sm" style="margin:0 0 10px">Objectifs <b>proposés</b> d'après vos ventes du 28/10 au 12/11. Touchez « Modifier » pour les valider ou les changer.</div>`:""}
 <p class="s" style="margin:-2px 0 8px">${O.H} h d'ouverture ce mois · ${Math.round(fr*100)} % écoulé</p>
 ${row("Ventes","ca",m.ca)}${row("Marge","marge",m.marge)}${row("Motos","motos",m.motos)}</section>`}
function parseAmt(s){s=String(s||"").trim().toLowerCase().replace(/\s| |ar/g,"").replace(",",".");const mm=s.match(/^([\d.]+)(m|k)?$/);if(!mm)return NaN;return Math.round(parseFloat(mm[1])*(mm[2]==="m"?1e6:mm[2]==="k"?1e3:1))}
function editObj(){const O=objMois(),now=new Date(),mn=(m=>m[0].toUpperCase()+m.slice(1))(MOIS[now.getMonth()]);
 openSheet("Objectifs de "+mn,`<p class="s" style="margin:0 0 4px">${O.H} heures d'ouverture ce mois (lundi–vendredi 9h–17h, samedi 9h–12h, jours fériés retirés). L'objectif du jour est calculé tout seul à partir du mois.</p>
 <label class="fl">Ventes du mois (Ar)<input id="o_ca" inputmode="decimal" value="${fmtN(O.ca)}"><small>Ex. 70M ou 70 000 000</small></label>
 <label class="fl">Marge du mois (Ar)<input id="o_mg" inputmode="decimal" value="${fmtN(O.marge)}"><small>Proposition : environ 30 % des ventes (votre marge constatée en novembre)</small></label>
 <label class="fl">Motos vendues dans le mois<input id="o_mo" inputmode="numeric" value="${O.motos}"></label>
 <div class="note sm">Repères : au rythme du 28/10 au 12/11, la boutique fait environ 4 M Ar de ventes par jour ouvré. Avec environ 6 M Ar de charges par mois (loyer, salaires, frais), il faut environ <b>19 M Ar de ventes</b> (≈ 7 motos) pour couvrir les charges.</div>
 <div id="o_err" class="red sm" role="alert"></div>
 <button class="b2 yes full" id="o_save">Enregistrer</button>`);
 $("#o_save").onclick=async()=>{const ca=parseAmt($("#o_ca").value),mg=parseAmt($("#o_mg").value),mo=parseInt(String($("#o_mo").value).replace(/\D/g,""),10);
  if(!(ca>0)||!(mg>=0)||!(mo>=0)){$("#o_err").textContent="Vérifiez les montants (chiffres uniquement, ou 70M).";return}
  try{await FBX.set("objectifs/"+curYM(),{ca,marge:mg,motos:mo,par:USER.email,ts:Date.now()},true);closeSheet();toast("Objectifs enregistrés")}catch(e){toast("Enregistrement impossible : vérifiez internet",4000)}}}
/* ---------- modifications par le gérant (envoyées à la caisse, appliquées par le PC) ---------- */
let MODS={};try{MODS=JSON.parse(localStorage.getItem("dg_mods")||"{}")}catch(e){}
function modState(id){const m=E&&E.modifs&&E.modifs[id];if(m)return"appliquee";return MODS[id]||""}
function modTag(id){const s=modState(id);return s==="appliquee"?tag("modifié par le gérant","g"):s==="annul"?tag("annulation envoyée","w"):s?tag("modification envoyée","w"):""}
function canEdit(){return!!(E&&E.listes)}
function opRow(o,k){return`<div class="li" style="flex-wrap:wrap"><span class="grow"><b>${esc(o.lib)}</b><small class="mute">${esc(o.mode||"")}${o.cat?" · "+esc(o.cat):""}${o.tiers?" · "+esc(o.tiers):""}</small>${modTag(o.id)?`<span class="tgs">${modTag(o.id)}</span>`:""}</span><b class="${o.type==="S"?"red":""}">${o.type==="S"?"−":""}${fmtN(o.m)}</b>
 ${canEdit()?`<div class="opb"><button class="b2 ghost" data-mod="${k}">Modifier</button><button class="b2 ghost dng" data-anl="${k}">Annuler</button></div>`:""}</div>`}
let OPS_CTX=[];
function bindOps(){$$("#dsheet [data-mod]").forEach(b=>b.onclick=()=>editOp(OPS_CTX[+b.dataset.mod]));$$("#dsheet [data-anl]").forEach(b=>b.onclick=()=>cancelOpTel(OPS_CTX[+b.dataset.anl]))}
function opsSheet(title,head,ops){OPS_CTX=ops;openSheet(title,head+`<div class="card list" style="margin-top:8px">${ops.map(opRow).join("")||`<p class="mute pad">—</p>`}</div>
 ${canEdit()?`<p class="s" style="margin:4px 0 0">Chaque changement est envoyé à la caisse avec ton motif et reste visible dans l'Historique du PC.</p>`:`<div class="note sm" style="margin-top:8px">Pour modifier depuis le téléphone, mettez à jour la caisse du PC (version 2.2).</div>`}`);bindOps()}
function editOp(o){if(!o)return;const L=E.listes,isS=o.type==="S";
 openSheet("Modifier l'opération",`<p class="s" style="margin:0">${esc(o.lib)} · ${fmtN(o.m)} Ar</p>
 <label class="fl">Libellé<input id="e_l" value="${esc(o.lib)}" maxlength="200"></label>
 <label class="fl">Montant (Ar)<input id="e_m" inputmode="decimal" value="${fmtN(o.m)}"><small>Ex. 2 500 000 ou 2,5M</small></label>
 <label class="fl">Mode de paiement<select id="e_p">${L.modes.map(m=>`<option ${m===o.mode?"selected":""}>${esc(m)}</option>`).join("")}</select></label>
 <label class="fl">Catégorie<select id="e_c">${(isS?L.S:L.E).map(c=>`<option ${c===o.cat?"selected":""}>${esc(c)}</option>`).join("")}${(isS?L.S:L.E).includes(o.cat)?"":`<option selected>${esc(o.cat)}</option>`}</select></label>
 <label class="fl">${isS?"Bénéficiaire":"Client"}<input id="e_t" value="${esc(o.tiers||"")}" maxlength="80"></label>
 <label class="fl">Motif de la modification (obligatoire)<input id="e_mo" placeholder="Ex. erreur de saisie du caissier" maxlength="200"></label>
 <div id="e_err" class="red sm" role="alert"></div><button class="b2 yes full" id="e_ok">Envoyer la modification</button>`);
 $("#e_ok").onclick=async()=>{const mo=$("#e_mo").value.trim(),m=parseAmt($("#e_m").value);
  if(mo.length<3){$("#e_err").textContent="Indiquez le motif de la modification.";$("#e_mo").focus();return}
  if(!(m>0)){$("#e_err").textContent="Montant invalide.";$("#e_m").focus();return}
  const ch={},nv={libelle:$("#e_l").value.trim(),montant:m,mode:$("#e_p").value,cat:$("#e_c").value,tiers:$("#e_t").value.trim()},av={libelle:o.lib,montant:o.m,mode:o.mode,cat:o.cat,tiers:o.tiers||""};
  Object.keys(nv).forEach(k=>{if(String(nv[k])!==String(av[k])&&!(k==="libelle"&&!nv[k]))ch[k]=nv[k]});
  if(!Object.keys(ch).length){$("#e_err").textContent="Rien n'a été changé.";return}
  MODS[o.id]="modif";localStorage.setItem("dg_mods",JSON.stringify(MODS));
  await sendCmd({type:"modif",id:o.id,champs:ch,motif:mo});closeSheet();render();toast(navigator.onLine?"Modification envoyée à la caisse":"Modification enregistrée : elle partira au retour du réseau",3500)}}
async function cancelOpTel(o){if(!o)return;const r=await ask("Annuler « "+o.lib+" » ("+fmtN(o.m)+" Ar) ? Si c'est une vente, tout le ticket est annulé et le stock remis.","Annuler l'opération","Motif de l'annulation (obligatoire)");if(!r)return;
 MODS[o.id]="annul";localStorage.setItem("dg_mods",JSON.stringify(MODS));await sendCmd({type:"annulation",id:o.id,motif:r===true?"":r});closeSheet();render();toast("Annulation envoyée à la caisse")}
function editDette(x){if(!x||!x.id)return;
 openSheet("Modifier la dette",`<p class="s" style="margin:0">${esc(x.tiers)} · reste ${fmtN(x.reste)} Ar</p>
 <label class="fl">Libellé<input id="d_l" value="${esc(x.lib)}" maxlength="200"></label>
 <label class="fl">Client<input id="d_t" value="${esc(x.tiers)}" maxlength="80"></label>
 <label class="fl">Montant total (Ar)<input id="d_m" inputmode="decimal" value="${fmtN(x.montant||x.reste)}"><small>Ce qui est déjà payé ne change pas ; le reste est recalculé.</small></label>
 <label class="fl">Échéance<input id="d_e" type="date" value="${esc(x.ech||"")}"></label>
 <label class="fl">Motif (obligatoire si libellé, client ou montant change)<input id="d_mo" maxlength="200" placeholder="Ex. erreur de saisie"></label>
 <div id="d_err" class="red sm" role="alert"></div><button class="b2 yes full" id="d_ok">Envoyer la modification</button>`);
 $("#d_ok").onclick=async()=>{const m=parseAmt($("#d_m").value),mo=$("#d_mo").value.trim(),nv={libelle:$("#d_l").value.trim(),tiers:$("#d_t").value.trim(),montant:m,echeance:$("#d_e").value},av={libelle:x.lib,tiers:x.tiers,montant:x.montant,echeance:x.ech||""},ch={};
  if(!(m>0)){$("#d_err").textContent="Montant invalide.";return}
  Object.keys(nv).forEach(k=>{if(String(nv[k])!==String(av[k])&&!((k==="libelle"||k==="tiers")&&!nv[k]))ch[k]=nv[k]});
  if(!Object.keys(ch).length){$("#d_err").textContent="Rien n'a été changé.";return}
  if(Object.keys(ch).some(k=>k!=="echeance")&&mo.length<3){$("#d_err").textContent="Indiquez le motif de la modification.";$("#d_mo").focus();return}
  MODS["d:"+x.id]="modif";localStorage.setItem("dg_mods",JSON.stringify(MODS));
  await sendCmd({type:"modifDette",id:x.id,champs:ch,motif:mo});closeSheet();render();toast(navigator.onLine?"Modification envoyée à la caisse":"Elle partira au retour du réseau",3500)}}
/* ---------- anciennes dettes saisies à la main (page Clients) : pas des ventes ----------
   Une dette créée sans ticket (ex. « Reste à payer 30/06 ») est une reprise de solde. On la retire des
   ventes du jour et du mois. Le total retiré par jour est gardé dans objectifs/{mois}.anciennes. */
let OBJ_OK=false;
function adjOld(){if(!E||!E.jour||E.jour._adj)return;const j=E.jour;let old=0;j.tickets.forEach(t=>{if(t.credit&&!t.n&&!t.annule){t.ancienne=true;old+=t.tot}});
 j._adj=true;j.anciennes=old;j.ventes-=old;j.credit=Math.max(0,j.credit-old);E.mois.caBrut=E.mois.ca;E.mois.parJourBrut=E.mois.parJour.map(x=>x.slice());adjMonth()}
function oldMap(){const a=Object.assign({},OBJ&&OBJ.anciennes||{});if(E&&E.jour&&E.jour.date&&E.jour.date.slice(0,7)===E.mois.m)a[E.jour.date]=E.jour.anciennes||0;return a}
function adjMonth(){if(!E||!E.mois||E.mois.caBrut==null)return;const a=oldMap(),ym=E.mois.m;let tot=0;
 E.mois.parJour=E.mois.parJourBrut.map(([d,v])=>{const o=+a[ym+"-"+d]||0;tot+=Math.min(o,v);return[d,Math.max(0,v-o)]}).filter(x=>x[1]>0);
 E.mois.ca=E.mois.caBrut-tot;E.mois.anciennes=tot}
function saveOld(){if(!OBJ_OK||!E||!E.jour||!E.jour._adj||!E.jour.date||E.jour.date.slice(0,7)!==curYM())return;const v=E.jour.anciennes||0,cur=+(OBJ&&OBJ.anciennes&&OBJ.anciennes[E.jour.date])||0;
 if(v!==cur)FBX.set("objectifs/"+curYM(),{anciennes:{[E.jour.date]:v}},true).catch(()=>{})}
/* ---------- recherche (dans la dernière sauvegarde en ligne de la caisse) ---------- */
let BK=null,BKQ="";
const nrm=s=>String(s==null?"":s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
async function loadBK(force){if(BK&&!force&&Date.now()-BK.loaded<5*60000)return BK;
 const L=(await FBX.list("sauvegardes")).sort((a,b)=>String(b.date).localeCompare(String(a.date)));if(!L.length)throw new Error("vide");
 const m=L[0];let s="";for(let i=0;i<(+m.parts||1);i++){const p=await FBX.get("sauvegardes_parts/"+m.date+"_"+i);s+=p&&p.data||""}
 const d=JSON.parse(s);BK={ts:m.ts,loaded:Date.now(),
  ops:Object.values(d.ops||{}).sort((a,b)=>(b.ts||0)-(a.ts||0)).map(o=>({o,h:nrm([o.libelle,o.tiers,o.cat,o.mode,o.montant,o.ticket?"ticket "+o.ticket+" n"+o.ticket:"",o.date,fd(o.date),(o.motos||[]).map(x=>[x.modele,x.moteur,x.chassis,x.couleur].join(" ")).join(" "),o.article&&o.article.nom].join(" "))})),
  arts:Object.values(d.catalogue||{}).filter(a=>a.actif!==false).map(a=>({a,h:nrm([a.nom,a.cat].join(" "))})),
  tiers:Object.values(d.tiers||{}).map(t=>({t,h:nrm([t.nom,t.tel,t.type].join(" "))}))};return BK}
function searchHtml(q){const W=/^[\d\s\u202f.]+$/.test(q.trim())?[q.replace(/\D/g,"")]:nrm(q).split(/\s+/).filter(Boolean);if(!W.length||nrm(q).replace(/\s/g,"").length<2)return`<p class="mute sm" style="margin:6px 0">Tapez au moins 2 lettres : article, client, n° moteur, libellé, montant, date (ex. 14/11)…</p>`;
 const ok=h=>W.every(w=>h.includes(w)),A=BK.arts.filter(x=>ok(x.h)),O=BK.ops.filter(x=>ok(x.h)),T=BK.tiers.filter(x=>ok(x.h)),Dt=(E?E.dettes.liste:[]).filter(x=>ok(nrm(x.tiers+" "+x.lib)));
 if(!A.length&&!O.length&&!T.length&&!Dt.length)return`<div class="empty" style="padding:30px 10px">Rien trouvé pour « ${esc(q)} ».</div>`;
 const more=(n,l)=>n>l?`<p class="s" style="margin:4px 2px">… et ${n-l} autre(s) : précisez la recherche.</p>`:"";
 return(A.length?`<h3 class="sh-s">Articles (${A.length})</h3><div class="card list">${A.slice(0,15).map(({a})=>`<div class="li"><span class="grow"><b>${esc(a.nom)}</b><small class="mute">${esc(a.cat||"")}${a.min?" · min. "+fmtN(a.min):""}${a.gros?" · gros "+fmtN(a.gros):""}${a.suivi?" · stock "+(a.qte||0):""}</small></span><b>${fmtN(a.ideal||a.annonce||0)}</b></div>`).join("")}</div>${more(A.length,15)}`:"")
 +(Dt.length?`<h3 class="sh-s">Dettes en cours (${Dt.length})</h3><div class="card list">${Dt.slice(0,10).map(x=>`<div class="li"><span class="grow"><b>${esc(x.tiers)}</b><small class="mute">${esc(x.lib)}${x.ech?" · échéance "+fd(x.ech):""}</small></span><b class="${x.retard?"red":""}">${fmtN(x.reste)}</b></div>`).join("")}</div>`:"")
 +(O.length?`<h3 class="sh-s">Ventes et opérations (${O.length})</h3><div class="card list">${O.slice(0,40).map(({o})=>`<div class="li ${o.annule?"strike":""}"><span class="grow"><b>${esc(o.libelle)}</b><small class="mute">${fd(o.date)}${o.ticket?" · ticket "+o.ticket:""} · ${esc(o.cat||"")}${o.mode?" · "+esc(o.mode):""}${o.tiers?" · "+esc(o.tiers):""}${(o.motos||[]).length?" · moteur "+esc(o.motos.map(x=>x.moteur).filter(Boolean).join(", ")):""}</small>${o.annule?`<span class="tgs">${tag("annulé","r")}</span>`:""}</span><b class="${o.type==="S"?"red":""}">${o.type==="S"?"−":""}${fmtN(o.montant)}</b></div>`).join("")}</div>${more(O.length,40)}`:"")
 +(T.length?`<h3 class="sh-s">Clients et fournisseurs (${T.length})</h3><div class="card list">${T.slice(0,15).map(({t})=>`<div class="li"><span class="grow"><b>${esc(t.nom)}</b><small class="mute">${esc(t.type||"")}${t.tel?" · "+esc(t.tel):""}</small></span></div>`).join("")}</div>${more(T.length,15)}`:"")}
async function openSearch(){openSheet("Rechercher",`<label class="fl" style="margin:0">Recherche<input id="sq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="none" placeholder="Article, client, n° moteur, montant…" value="${esc(BKQ)}"></label><p class="s" id="sinfo" style="margin:2px 0 0">Chargement de la sauvegarde en ligne…</p><div id="sres"></div>`);
 const q=$("#sq"),go=()=>{BKQ=q.value;if(BK)$("#sres").innerHTML=searchHtml(q.value)};q.oninput=go;setTimeout(()=>q.focus(),60);
 try{await loadBK();if(!$("#sinfo"))return;const old=Date.now()-BK.ts>30*60000;$("#sinfo").innerHTML=`Données de la caisse du ${new Date(BK.ts).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})} à ${new Date(BK.ts).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}${old?` · <span class="amb">pas tout à fait à jour</span>`:""} · <button class="lk" id="srl" style="padding:0;margin:0;font-size:12px">actualiser</button>`;
  $("#srl").onclick=async()=>{$("#srl").textContent="…";try{await loadBK(true)}catch(e){}closeSheet();openSearch()};go()}
 catch(e){if($("#sinfo"))$("#sinfo").innerHTML=`<span class="red">${navigator.onLine?"Aucune sauvegarde en ligne trouvée : la caisse du PC doit être connectée au moins une fois.":"Pas d'internet : la recherche a besoin d'une connexion."}</span>`}}
function bind(){$$("[data-go]").forEach(b=>b.onclick=()=>{TAB=b.dataset.go;render()});
 $$("[data-acc]").forEach(b=>b.onclick=()=>decide(b.dataset.acc,"accepte"));$$("[data-ref]").forEach(b=>b.onclick=()=>decide(b.dataset.ref,"refuse"));
 const s=$("#sendm");if(s)s.onclick=async()=>{const t=$("#msg").value.trim();if(t.length<2)return;await sendCmd({type:"message",texte:t});$("#msg").value="";toast(navigator.onLine?"Message envoyé":"Message enregistré : envoyé dès le retour du réseau")};
 $$("#app [data-sh]").forEach(b=>b.onclick=()=>showSheet(b.dataset.sh));$$("#app [data-tk]").forEach(b=>b.onclick=()=>showTicket(b.dataset.tk));
 $$("[data-mf]").forEach(b=>b.onclick=()=>{MF=b.dataset.mf;render()});
 $$("#app [data-objedit]").forEach(b=>b.onclick=editObj);
 $$("#app [data-edd]").forEach(b=>b.onclick=()=>editDette(E.dettes.liste[+b.dataset.edd]));
 const sb=$("#srch");if(sb)sb.onclick=openSearch;
 $$("[data-df]").forEach(b=>b.onclick=()=>{DF=b.dataset.df;render()});
 $$("[data-th]").forEach(b=>b.onclick=()=>setTheme(b.dataset.th));
 $$("[data-rel]").forEach(b=>b.onclick=async()=>{const x=E.dettes.liste[+b.dataset.rel];if(!x)return;const t=relance(x);
  if(navigator.share){try{await navigator.share({text:t});return}catch(e){if(e&&e.name==="AbortError")return}}
  toast(await copyText(t)?"Message copié : collez-le dans WhatsApp":"Copie impossible",3500)});
 const lo=$("#lo");if(lo)lo.onclick=()=>FBX.signOut()}
async function decide(cle,dec){const v=E.validations.find(x=>x.cle===cle);if(!v)return;
 const r=await ask(dec==="accepte"?"Accepter cette vente sous le minimum ?":"Refuser cette vente ? La caisse devra l'annuler ou la corriger.",dec==="accepte"?"Accepter":"Refuser",dec==="accepte"?"Commentaire (facultatif)":"Motif du refus (obligatoire)");if(!r)return;
 SENT[cle]=dec;localStorage.setItem("dg_sent",JSON.stringify(SENT));render();
 await sendCmd({type:"decision",cle,decision:dec,motif:r===true?"":r});toast(dec==="accepte"?"Accepté":"Refusé")}
function sendCmd(c){const id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 const p=FBX.set("commandes/"+id,{...c,ts:Date.now(),par:USER.email,statut:"nouvelle"});
 return Promise.race([p,new Promise(r=>setTimeout(r,4000))]).catch(e=>toast("Envoi impossible : "+(e.message||e),4000))}
/* nettoyage : oublie les décisions envoyées qui ne sont plus en attente */
setInterval(()=>{if(!E)return;const keep=new Set(E.validations.map(v=>v.cle));let ch=false;Object.keys(SENT).forEach(k=>{if(!keep.has(k)){delete SENT[k];ch=true}});if(ch)localStorage.setItem("dg_sent",JSON.stringify(SENT))},60000);
