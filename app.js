/* =====================================================================
   App Gérant — Dago Moto Shop (téléphone, Android et iPhone)
   Lit le résumé envoyé par la caisse (boutique/etat) en temps réel.
   Envoie les décisions (ventes sous le minimum) et des messages (commandes).
   Hors ligne : affiche les dernières données reçues.
   ===================================================================== */
"use strict";
const APP_VERSION="2.3 · 14/11";
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
 await FBX.init(DG_CONFIG||{},{persistent:true});
 FBX.onAuth(u=>{USER=u;if(!u){if(UNSUB){UNSUB();UNSUB=null}return loginScreen()}
  if(!UNSUB)UNSUB=FBX.onDoc("boutique/etat",(d,m)=>{try{E=d&&typeof d.json==="string"?JSON.parse(d.json):d}catch(x){E=null};META=m||{};render()},e=>{$("#app").innerHTML=`<div class="login"><div class="lbox"><h1>Accès refusé</h1><p>${esc(e.message||e)}</p><button class="b2 yes" id="lo">Se déconnecter</button></div></div>`;$("#lo").onclick=()=>FBX.signOut()});
  render()})})();
if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
window.addEventListener("online",render);window.addEventListener("offline",render);
const EYE='<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
function loginScreen(){$("#app").innerHTML=`<div class="login"><form class="lbox" id="lf"><div class="logo">DMS</div><h1>Dago Moto Shop</h1><p class="mute">App Gérant · version ${APP_VERSION}</p>
 <label>E-mail<input id="le" type="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(localStorage.getItem("dg_email")||"")}"></label>
 <label>Mot de passe<span class="pw"><input id="lp" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false"><button type="button" class="eye" id="lv" aria-label="Afficher le mot de passe">${ic(EYE)}</button></span></label>
 <button class="b2 yes" type="submit">Se connecter</button></form></div>`;
 $("#lv").onclick=()=>{const p=$("#lp");p.type=p.type==="password"?"text":"password"};$("#lf").onsubmit=async e=>{e.preventDefault();const em=$("#le").value.trim().toLowerCase();try{await FBX.signIn(em,$("#lp").value.trim());localStorage.setItem("dg_email",em)}catch(x){toast(/invalid|wrong|not-found/.test(String(x.code||x.message))?"E-mail ou mot de passe incorrect":"Connexion impossible : vérifiez internet",4000)}}}

/* ---------- affichage ---------- */
const TABS=[["jour","Jour",'<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>'],["valider","Valider",'<path d="m5 12 5 5 9-10"/>'],["dettes","Dettes",'<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6M17 11h5M19.5 8.5v5"/>'],["mois","Mois",'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],["plus","Plus",'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>']];
const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const CLOCK='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',BOX='<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>';const WARN='<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/>',CHEV='<path d="m9 6 6 6-6 6"/>',MSG='<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>';
let DF="tout";
function pending(){return E?E.validations.filter(v=>!SENT[v.cle]):[]}
function render(){if(!USER)return;const sy=$(".body")?$(".body").scrollTop:0;
 if(!E){$("#app").innerHTML=`<div class="login"><div class="lbox"><div class="logo">DMS</div><p>${navigator.onLine?"Chargement des données de la caisse…":"Pas de connexion internet. Les données apparaîtront dès que le téléphone sera connecté."}</p><p class="mute sm">Si rien n'arrive : vérifiez que la caisse est allumée et liée (Réglages › Téléphone et cloud).</p><p class="s">App version ${APP_VERSION}</p><button class="lnk" id="lo">Se déconnecter</button></div></div>`;$("#lo").onclick=()=>FBX.signOut();return}
 const off=!navigator.onLine||META.fromCache,old=Date.now()-E.maj>15*60000,nV=pending().length;
 const mois=(m=>m[0].toUpperCase()+m.slice(1))(MOIS[+E.mois.m.slice(5)-1]);
 const titles={jour:["",new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}).replace(/^./,c=>c.toUpperCase()),"Aujourd'hui"],valider:["","Ventes sous le prix minimum","À valider"+(E.validations.length?` <span class="mute">(${nV})</span>`:"")],dettes:["","Ce que les clients doivent","Dettes clients"],mois:["",E.mois.m.slice(0,4),mois],plus:["",esc(E.boutique),"Plus"]};
 const T=titles[TAB];
 $("#app").innerHTML=`<header class="mh"><div class="hl"><div class="lg" aria-hidden="true">DMS</div><div><small>${T[1]}</small><h1>${T[2]}</h1></div></div>
 <span class="sync ${off||old?"w":""}">${off?"Hors ligne · ":""}Caisse ${ago(E.maj)}</span></header>
 ${old&&!off?`<div class="warnbar" role="status">La caisse n'a rien envoyé depuis ${ago(E.maj).replace("il y a ","")} : PC éteint, logiciel fermé ou pas d'internet au magasin.</div>`:""}
 <main class="body">${({jour:vJour,valider:vValider,dettes:vDettes,mois:vMois,plus:vPlus})[TAB]()}</main>
 <nav class="tabs" aria-label="Menu">${TABS.map(([k,l,p])=>`<button class="${k===TAB?"on":""}" data-t="${k}" ${k===TAB?'aria-current="page"':""}><span class="pill">${ic(p)}${k==="valider"&&nV?`<em>${nV}</em>`:""}</span>${l}</button>`).join("")}</nav>`;
 $$("[data-t]").forEach(b=>b.onclick=()=>{TAB=b.dataset.t;render();$(".body").scrollTop=0});
 bind();const bd=$(".body");if(bd&&sy)bd.scrollTop=sy}
function bar(v,max,a){return`<span class="bt ${a?"a":""}"><i style="width:${max?Math.max(2,Math.round(v*100/max)):0}%"></i></span>`}
function hbars(L,a){const mx=Math.max(1,...L.map(x=>x[1]));return L.map(([c,v])=>`<div class="hb"><div class="t"><span>${esc(c)}</span><b>${fmtN(v)}</b></div>${bar(v,mx,a)}</div>`).join("")}
function spark(){const P=E.mois.parJour.slice(-7);if(P.length<2)return"";const mx=Math.max(1,...P.map(x=>x[1]));
 return`<div class="spark" role="img" aria-label="Ventes des derniers jours">${P.map(([d,v],i)=>`<div><i class="${i===P.length-1?"on":""}" style="height:${Math.max(3,Math.round(v*44/mx))}px"></i><span>${d}</span></div>`).join("")}</div>`}
const lrow=(k,l,v,cls)=>`<button class="lr" data-sh="${k}"><span>${l}</span><b class="${cls||""}">${v}</b>${ic(CHEV)}</button>`;
function vJour(){const j=E.jour,nV=pending().length,late=E.dettes.liste.filter(x=>x.retard),nA=(nV?1:0)+(E.refusees?1:0)+(late.length?1:0)+(E.stock.faible.length?1:0);
 return`<button class="card hero tap" data-sh="ventes"><div class="ht"><div><div class="l">Ventes du jour</div><div class="v">${fmtN(j.ventes)} <small>Ar</small></div>
 <div class="leg"><span>${j.motos} moto${j.motos>1?"s":""} · ${j.tickets.filter(t=>!t.annule).length} ticket(s)</span></div></div>${j.cloture?tag("Clôturée","g"):tag("Journée ouverte","w")}</div>${spark()}</button>
 <section class="card list" aria-label="Résumé">${lrow("encaisse","Encaissé",fmtN(j.encaisse))}${lrow("depenses","Dépenses",(j.depenses?"−":"")+fmtN(j.depenses),j.depenses?"red":"")}${lrow("credit","À crédit",fmtN(j.credit))}${lrow("soldes","Espèces attendues",fmtN(j.especes))}${lrow("marge","Marge estimée",j.marge==null?"—":fmtN(j.marge))}${lrow("cloture","Clôture",j.cloture?(j.cloture.ecart?"Écart "+fmtN(j.cloture.ecart):"Caisse juste"):"Pas encore faite",j.cloture?(j.cloture.ecart?"red":""):"amb")}</section>
 ${nA?`<div class="sec"><h2>À traiter</h2>${tag(nA,"r")}</div><section class="card list" aria-label="À traiter">
 ${nV?`<button class="ar" data-go="valider"><i class="ic a">${ic(WARN)}</i><span class="grow"><b>${nV} vente${nV>1?"s":""} sous le minimum</b><small>à accepter ou refuser</small></span>${ic(CHEV)}</button>`:""}
 ${E.refusees?`<div class="ar"><i class="ic r">${ic(WARN)}</i><span class="grow"><b>${E.refusees} vente(s) refusée(s)</b><small>pas encore régularisée(s) au magasin</small></span></div>`:""}
 ${late.length?`<button class="ar" data-go="dettes"><i class="ic r">${ic(CLOCK)}</i><span class="grow"><b>${late.length} dette${late.length>1?"s":""} en retard</b><small>${esc(late.slice(0,2).map(x=>x.tiers).join(", "))} · ${fmtN(late.reduce((s,x)=>s+x.reste,0))}</small></span>${ic(CHEV)}</button>`:""}
 ${E.stock.faible.length?`<button class="ar" data-go="plus"><i class="ic a">${ic(BOX)}</i><span class="grow"><b>Stock faible : ${E.stock.faible.length} article(s)</b><small>${esc(E.stock.faible.slice(0,2).map(i=>i.nom).join(", "))}</small></span>${ic(CHEV)}</button>`:""}</section>`:""}
 <div class="sec"><h2>Tickets du jour</h2></div><section class="card list">${j.tickets.map((t,i)=>`<button class="li tap ${t.annule?"strike":""}" data-tk="${i}"><span class="grow"><b>${esc(t.lib)}</b><small class="mute">${t.h}${t.n?" · n° "+t.n:""}${t.tiers?" · "+esc(t.tiers):""}</small></span><b>${fmtN(t.tot)}</b></button>`).join("")||`<p class="mute pad">Aucune vente pour l'instant.</p>`}</section>
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
 ${L.length?`<section class="card list" aria-label="Liste des dettes">${L.map(x=>`<div class="dr"><span class="av" aria-hidden="true">${esc(ini(x.tiers))}</span><div class="grow"><div class="dt"><b>${esc(x.tiers)}</b><b>${fmtN(x.reste)}</b></div><small class="mute el">${esc(x.lib)}</small><div>${x.ech?(x.retard?tag(daysLate(x)+" j de retard","r"):tag("Échéance le "+fd(x.ech),dueSoon(x)?"w":"")):tag("Sans échéance")}</div></div>
 <button class="ib" data-rel="${all.indexOf(x)}" aria-label="Relancer ${esc(x.tiers)}">${ic(MSG)}</button></div>`).join("")}</section><p class="s" style="text-align:center;margin:0">Le bouton bulle prépare le message de relance (WhatsApp, SMS…).</p>`:`<div class="empty">Aucune dette ici.</div>`}`}
function vMois(){const m=E.mois,maxJ=Math.max(1,...m.parJour.map(x=>x[1]));
 return`<section class="card" aria-label="Résultat du mois"><div class="ht"><button class="tap in2" data-sh="mres"><div class="l2">Résultat estimé</div><div class="big">${m.marge==null?"—":fmtN(m.marge-m.charges)} <small>Ar</small></div></button>${tag(m.motos+" moto"+(m.motos>1?"s":""),"g")}</div>
 <div class="c3"><button data-sh="mca"><small>Chiffre d'affaires</small><b>${fmtN(m.ca)}</b></button><button data-sh="mmarge"><small>Marge</small><b>${m.marge==null?"—":fmtN(m.marge)}</b></button><button data-sh="mcharges"><small>Charges</small><b>${fmtN(m.charges)}</b></button></div>
 ${m.couv?`<div class="s" style="margin-top:8px">Coût d'achat connu pour ${m.couv} % des ventes.</div>`:""}</section>
 ${m.objCa?`<section class="card"><div class="ct"><b>Objectif du mois</b><span class="sm mute">${Math.round(m.ca*100/m.objCa)} %</span></div><div class="prog"><i style="width:${Math.min(100,m.ca*100/m.objCa)}%"></i></div><div class="s">${fmtN(m.ca)} sur ${fmtN(m.objCa)} Ar</div></section>`:""}
 <section class="card" aria-label="Ventes par jour"><div class="ct"><b>Ventes par jour</b><span class="sm mute">millions d'Ar</span></div>
 <div class="vbars">${m.parJour.map(([d,v])=>`<div class="vb"><b>${(v/1e6).toFixed(1).replace(".",",")}</b><i style="height:${Math.round(v*72/maxJ)}%"></i><span>${d}</span></div>`).join("")||`<p class="mute">Aucune vente ce mois-ci.</p>`}</div></section>
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
 if(light)document.documentElement.dataset.theme="light";else delete document.documentElement.dataset.theme;const m=$('meta[name="theme-color"]');if(m)m.content=light?"#f5f6f8":"#0b0d10"}
function setTheme(t){try{localStorage.setItem("dg_theme",t)}catch(e){}applyTheme();render()}
try{matchMedia("(prefers-color-scheme: light)").addEventListener("change",()=>{applyTheme();if(USER)render()})}catch(e){}applyTheme();
/* ---------- panneaux de détail (clic sur une carte) ---------- */
const X_ICON='<path d="M6 6l12 12M18 6 6 18"/>';
function closeSheet(fromPop){const bg=$("#dsheet");if(!bg)return;bg.remove();if(!fromPop&&history.state&&history.state.sheet)history.back()}
window.addEventListener("popstate",()=>closeSheet(true));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
function openSheet(title,html){closeSheet(true);const bg=document.createElement("div");bg.className="sheet-bg";bg.id="dsheet";
 bg.innerHTML=`<div class="sheet big" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sh-h"><h2 class="sh-t">${esc(title)}</h2><button class="x" id="shx" aria-label="Fermer">${ic(X_ICON)}</button></div><div class="sh-b">${html}</div></div>`;
 document.body.appendChild(bg);bg.onclick=e=>{if(e.target===bg)closeSheet()};$("#shx").onclick=()=>closeSheet();
 $$("[data-go]",bg).forEach(b=>b.onclick=()=>{closeSheet();TAB=b.dataset.go;render()});
 try{history.pushState({sheet:1},"")}catch(e){}setTimeout(()=>{const x=$("#shx");if(x)x.focus()},30)}
const row=(a,b,c,cls)=>`<div class="li"><span class="grow"><b>${a}</b>${c?`<small class="mute">${c}</small>`:""}</span><b class="${cls||""}">${b}</b></div>`;
const tot=(l,v,cls)=>`<div class="sh-tot"><span>${l}</span><b class="${cls||""}">${v}</b></div>`;
function tkTags(t){return[t.annule?tag("annulé","r"):"",t.credit?tag("crédit","w"):"",t.acompte?tag("acompte","w"):"",t.sousMin?tag("sous le minimum","r"):""].join(" ")}
function tkRow(t,i){return`<button class="li tap" data-tk="${i}"><span class="grow"><b class="${t.annule?"strike":""}">${esc(t.lib)}</b><small class="mute">${t.h}${t.n?" · n° "+t.n:""}${t.tiers?" · "+esc(t.tiers):""}${t.modes?" · "+esc(t.modes):""}</small>${tkTags(t)?`<span class="tgs">${tkTags(t)}</span>`:""}</span><b>${fmtN(t.tot)}</b></button>`}
function groupSum(A,k,v){const o={};A.forEach(x=>{const kk=k(x)||"—";o[kk]=(o[kk]||0)+v(x)});return Object.entries(o).sort((a,b)=>b[1]-a[1])}
const SHEETS={
 ventes(){const j=E.jour,T=j.tickets;return[`Ventes du jour`,tot("Total des ventes",fmtN(j.ventes)+" Ar")+`<p class="s" style="margin:4px 0 8px">${j.motos} moto${j.motos>1?"s":""} · ${T.filter(t=>!t.annule).length} ticket(s). Touchez un ticket pour le détail.</p><div class="card list">${T.map(tkRow).join("")||`<p class="mute pad">Aucune vente pour l'instant.</p>`}</div>`]},
 encaisse(){const j=E.jour,P=j.tickets.filter(t=>!t.annule&&!t.credit),G=groupSum(P,t=>t.modes,t=>t.tot);
  return["Encaissé aujourd'hui",tot("Total encaissé",fmtN(j.encaisse)+" Ar")+`<p class="s" style="margin:4px 0 8px">Comprend les ventes payées, les paiements de dettes et les autres entrées (hors transferts).</p>
  <h3 class="sh-s">Ventes payées, par mode</h3><div class="card list">${G.map(([m,v])=>row(esc(m),fmtN(v))).join("")||`<p class="mute pad">Aucune vente payée.</p>`}</div>
  <h3 class="sh-s">Détail</h3><div class="card list">${P.map(t=>tkRow(t,j.tickets.indexOf(t))).join("")||`<p class="mute pad">—</p>`}</div>`]},
 depenses(){const j=E.jour,L=j.depensesListe,G=groupSum(L,o=>o.cat,o=>o.m);
  return["Dépenses du jour",tot("Total",(j.depenses?"−":"")+fmtN(j.depenses)+" Ar","red")+`<h3 class="sh-s">Par catégorie</h3><div class="card list">${G.map(([c,v])=>row(esc(c),"−"+fmtN(v),"","red")).join("")||`<p class="mute pad">Aucune dépense.</p>`}</div>
  <h3 class="sh-s">Détail</h3><div class="card list">${L.map(o=>row(esc(o.lib),"−"+fmtN(o.m),o.h+" · "+esc(o.cat)+(o.tiers?" · "+esc(o.tiers):""),"red")).join("")||`<p class="mute pad">—</p>`}</div>`]},
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
function showSheet(k){const f=SHEETS[k];if(!f||!E)return;const[t,h]=f();openSheet(t,h);bindSheetTickets()}
function showTicket(i){const t=E.jour.tickets[+i];if(!t)return;
 openSheet(t.n?"Ticket n° "+t.n:"Ticket",`${tot("Total",fmtN(t.tot)+" Ar")}<div class="card list" style="margin-top:8px">${row("Articles",`<span style="font-weight:600;text-align:right;display:block;max-width:220px">${esc(t.lib)}</span>`)}${row("Heure",t.h)}${row("Client",esc(t.tiers||"client comptoir"))}${row("Paiement",esc(t.modes||"—"))}${t.par?row("Caissier",esc(t.par)):""}</div>${tkTags(t)?`<p style="margin:10px 0 0">${tkTags(t)}</p>`:""}${t.sousMin?`<button class="b2 ghost full" data-go="valider">Voir les ventes à valider</button>`:""}`)}
function bindSheetTickets(){$$("#dsheet [data-tk]").forEach(b=>b.onclick=()=>showTicket(b.dataset.tk))}
function bind(){$$("[data-go]").forEach(b=>b.onclick=()=>{TAB=b.dataset.go;render()});
 $$("[data-acc]").forEach(b=>b.onclick=()=>decide(b.dataset.acc,"accepte"));$$("[data-ref]").forEach(b=>b.onclick=()=>decide(b.dataset.ref,"refuse"));
 const s=$("#sendm");if(s)s.onclick=async()=>{const t=$("#msg").value.trim();if(t.length<2)return;await sendCmd({type:"message",texte:t});$("#msg").value="";toast(navigator.onLine?"Message envoyé":"Message enregistré : envoyé dès le retour du réseau")};
 $$("#app [data-sh]").forEach(b=>b.onclick=()=>showSheet(b.dataset.sh));$$("#app [data-tk]").forEach(b=>b.onclick=()=>showTicket(b.dataset.tk));
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
