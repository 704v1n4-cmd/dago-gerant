/* =====================================================================
   App Gérant — Dago Moto Shop (téléphone, Android et iPhone)
   Lit le résumé envoyé par la caisse (boutique/etat) en temps réel.
   Envoie les décisions (ventes sous le minimum) et des messages (commandes).
   Hors ligne : affiche les dernières données reçues.
   ===================================================================== */
"use strict";
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
function loginScreen(){$("#app").innerHTML=`<div class="login"><form class="lbox" id="lf"><div class="logo">DMS</div><h1>Dago Moto Shop</h1><p class="mute">App Gérant</p>
 <label>E-mail<input id="le" type="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(localStorage.getItem("dg_email")||"")}"></label>
 <label>Mot de passe<span class="pw"><input id="lp" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false"><button type="button" class="eye" id="lv" aria-label="Afficher le mot de passe">${ic(EYE)}</button></span></label>
 <button class="b2 yes" type="submit">Se connecter</button></form></div>`;
 $("#lv").onclick=()=>{const p=$("#lp");p.type=p.type==="password"?"text":"password"};$("#lf").onsubmit=async e=>{e.preventDefault();const em=$("#le").value.trim().toLowerCase();try{await FBX.signIn(em,$("#lp").value.trim());localStorage.setItem("dg_email",em)}catch(x){toast(/invalid|wrong|not-found/.test(String(x.code||x.message))?"E-mail ou mot de passe incorrect":"Connexion impossible : vérifiez internet",4000)}}}

/* ---------- affichage ---------- */
const TABS=[["jour","Jour",'<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>'],["valider","Valider",'<path d="m5 12 5 5 9-10"/>'],["dettes","Dettes",'<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6M17 11h5M19.5 8.5v5"/>'],["mois","Mois",'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],["plus","Plus",'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>']];
const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const WARN='<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.5"/>',CHEV='<path d="m9 6 6 6-6 6"/>',MSG='<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>';
let DF="tout";
function pending(){return E?E.validations.filter(v=>!SENT[v.cle]):[]}
function render(){if(!USER)return;const sy=$(".body")?$(".body").scrollTop:0;
 if(!E){$("#app").innerHTML=`<div class="login"><div class="lbox"><div class="logo">DMS</div><p>${navigator.onLine?"Chargement des données de la caisse…":"Pas de connexion internet. Les données apparaîtront dès que le téléphone sera connecté."}</p><p class="mute sm">Si rien n'arrive : vérifiez que la caisse est allumée et liée (Réglages › Téléphone et cloud).</p><button class="lnk" id="lo">Se déconnecter</button></div></div>`;$("#lo").onclick=()=>FBX.signOut();return}
 const off=!navigator.onLine||META.fromCache,old=Date.now()-E.maj>15*60000,nV=pending().length;
 const mois=(m=>m[0].toUpperCase()+m.slice(1))(MOIS[+E.mois.m.slice(5)-1]);
 const titles={jour:["",new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}).replace(/^./,c=>c.toUpperCase()),"Aujourd'hui"],valider:["","Ventes sous le prix minimum","À valider"+(E.validations.length?` <span class="mute">(${nV})</span>`:"")],dettes:["","Ce que les clients doivent","Dettes clients"],mois:["",E.mois.m.slice(0,4),mois],plus:["",esc(E.boutique),"Plus"]};
 const T=titles[TAB];
 $("#app").innerHTML=`<header class="mh"><div><small>${T[1]}</small><h1>${T[2]}</h1></div>
 <span class="sync ${off||old?"w":""}">${off?"Hors ligne · ":""}Caisse ${ago(E.maj)}</span></header>
 ${old&&!off?`<div class="warnbar" role="status">La caisse n'a rien envoyé depuis ${ago(E.maj).replace("il y a ","")} : PC éteint, logiciel fermé ou pas d'internet au magasin.</div>`:""}
 <main class="body">${({jour:vJour,valider:vValider,dettes:vDettes,mois:vMois,plus:vPlus})[TAB]()}</main>
 <nav class="tabs" aria-label="Menu">${TABS.map(([k,l,p])=>`<button class="${k===TAB?"on":""}" data-t="${k}" ${k===TAB?'aria-current="page"':""}><span class="pill">${ic(p)}${k==="valider"&&nV?`<em>${nV}</em>`:""}</span>${l}</button>`).join("")}</nav>`;
 $$("[data-t]").forEach(b=>b.onclick=()=>{TAB=b.dataset.t;render();$(".body").scrollTop=0});
 bind();const bd=$(".body");if(bd&&sy)bd.scrollTop=sy}
function bar(v,max,a){return`<span class="bt ${a?"a":""}"><i style="width:${max?Math.max(2,Math.round(v*100/max)):0}%"></i></span>`}
function hbars(L,a){const mx=Math.max(1,...L.map(x=>x[1]));return L.map(([c,v])=>`<div class="hb"><div class="t"><span>${esc(c)}</span><b>${fmtN(v)}</b></div>${bar(v,mx,a)}</div>`).join("")}
function vJour(){const j=E.jour,nV=pending().length,late=E.dettes.liste.filter(x=>x.retard);
 return`<section class="hero" aria-label="Ventes du jour"><div class="l">Ventes du jour</div><div class="v">${fmtN(j.ventes)} <small>Ar</small></div>
 <div class="leg"><span>${j.motos} moto${j.motos>1?"s":""}</span><span>${j.tickets.filter(t=>!t.annule).length} ticket(s)</span></div></section>
 <div class="k2"><div class="card"><div class="l">Encaissé</div><div class="v">${fmtN(j.encaisse)}</div></div>
 <div class="card"><div class="l">Dépenses</div><div class="v ${j.depenses?"red":""}">${j.depenses?"−":""}${fmtN(j.depenses)}</div></div>
 <div class="card"><div class="l">À crédit</div><div class="v">${fmtN(j.credit)}</div></div>
 <div class="card"><div class="l">Clôture</div>${j.cloture?`<div class="v" style="font-size:16px">${j.cloture.ecart?`<span class="red">Écart ${fmtN(j.cloture.ecart)}</span>`:`<span style="color:var(--good)">Caisse juste</span>`}</div><div class="s">par ${esc(j.cloture.par)}</div>`:`<div class="v amb" style="font-size:16px">Pas encore faite</div>`}</div>
 <div class="card"><div class="l">Espèces attendues</div><div class="v">${fmtN(j.especes)}</div></div>
 <div class="card"><div class="l">Marge estimée</div><div class="v">${j.marge==null?"—":fmtN(j.marge)}</div>${j.couv?`<div class="s">coût connu ${j.couv} %</div>`:""}</div></div>
 ${nV?`<button class="wlink" data-go="valider">${ic(WARN)}<span class="grow">${nV} vente${nV>1?"s":""} sous le minimum à valider</span>${ic(CHEV)}</button>`:""}
 ${E.refusees?`<div class="wlink r">${ic(WARN)}<span class="grow">${E.refusees} vente(s) refusée(s)<small>pas encore régularisée(s) au magasin</small></span></div>`:""}
 ${late.length?`<button class="wlink r" data-go="dettes">${ic(WARN)}<span class="grow">${late.length} dette${late.length>1?"s":""} en retard<small>${esc(late.slice(0,2).map(x=>x.tiers).join(", "))}</small></span>${ic(CHEV)}</button>`:""}
 ${E.stock.faible.length?`<button class="wlink" data-go="plus">${ic(WARN)}<span class="grow">Stock faible : ${E.stock.faible.length} article(s)<small>${esc(E.stock.faible.slice(0,2).map(i=>i.nom).join(", "))}</small></span>${ic(CHEV)}</button>`:""}
 <h2>Tickets du jour</h2><section class="card list">${j.tickets.map(t=>`<div class="li ${t.annule?"strike":""}"><span class="grow"><b>${esc(t.lib)}</b><small class="mute">${t.h}${t.n?" · n° "+t.n:""}${t.tiers?" · "+esc(t.tiers):""}</small></span><b>${fmtN(t.tot)}</b></div>`).join("")||`<p class="mute pad">Aucune vente pour l'instant.</p>`}</section>
 <h2>Dépenses du jour</h2><section class="card list">${j.depensesListe.map(o=>`<div class="li"><span class="grow"><b>${esc(o.lib)}</b><small class="mute">${o.h} · ${esc(o.cat)}${o.tiers?" · "+esc(o.tiers):""}</small></span><b class="red">−${fmtN(o.m)}</b></div>`).join("")||`<p class="mute pad">Aucune dépense.</p>`}</section>`}
function vValider(){const L=E.validations;if(!L.length)return`<div class="empty">Aucune vente à valider. Tout est en ordre.</div>`;
 return L.map(v=>{const prix=v.lignes.reduce((s,l)=>s+l.prix,0),mn=v.lignes.reduce((s,l)=>s+l.minimum,0),ct=v.lignes.reduce((s,l)=>s+l.cout,0),sent=SENT[v.cle];
  return`<article class="card vc"><div class="top"><div><h3>${esc(v.lignes.map(l=>l.lib).join(" + "))}</h3><div class="mute sm">${v.ticket?"Ticket n° "+v.ticket+" · ":""}${fd(v.date)} · ${esc(v.par)}</div></div>${tag(v.vente)}</div>
  <div class="cmp"><div><small>Vendu</small><b>${fmtN(prix)}</b></div><div><small>Minimum</small><b>${fmtN(mn)}</b></div><div class="bad"><small>Écart</small><b>${fmtN(prix-mn)}</b></div></div>
  <div class="motif"><b>Client :</b> ${esc(v.tiers||"client comptoir")}${ct?`<br><b>Marge restante :</b> <span class="${prix<ct?"red":""}">${fmtN(prix-ct)} Ar (${Math.round((prix-ct)*100/prix)} %)</span>`:""}${v.motif?`<br><b>Motif du caissier :</b> « ${esc(v.motif)} »`:""}</div>
  ${sent?`<div class="note">${sent==="accepte"?"Accepté":"Refusé"} — transmis à la caisse${navigator.onLine?"":" dès le retour du réseau"}.</div>`:`<div class="acts"><button class="b2 no" data-ref="${esc(v.cle)}">Refuser</button><button class="b2 yes" data-acc="${esc(v.cle)}">Accepter</button></div>
  <div class="s">La décision s'affiche sur la caisse tout de suite (ou dès que le PC retrouve internet).</div>`}</article>`}).join("")}
function dueSoon(x){if(!x.ech||x.retard)return false;const d=(new Date(x.ech)-new Date(new Date().toISOString().slice(0,10)))/864e5;return d>=0&&d<=7}
function relance(x){return`Bonjour ${x.tiers}, c'est Dago Moto Shop. Petit rappel : il reste ${fmtN(x.reste)} Ar à régler${x.lib?" pour « "+x.lib+" »":""}${x.ech?(x.retard?", l'échéance était le ":", échéance le ")+fd(x.ech):""}. Merci de passer à la boutique ou de payer par MVola.`}
function vDettes(){const all=E.dettes.liste,late=all.filter(x=>x.retard),L=DF==="retard"?late:DF==="semaine"?all.filter(dueSoon):all;
 return`<section class="card" aria-label="Total des dettes" style="display:flex;justify-content:space-between;align-items:flex-end;border-radius:20px;padding:16px">
 <div><div class="s" style="font-weight:600">Total à encaisser</div><div style="font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.2">${fmtN(E.dettes.total)} <span style="font-size:15px">Ar</span></div></div>
 <div style="text-align:right"><div class="s" style="font-weight:600">${E.dettes.n} client${E.dettes.n>1?"s":""}</div>${late.length?`<div class="red" style="font-weight:800;font-size:14px">${late.length} en retard</div>`:""}</div></section>
 <div class="chips" role="group" aria-label="Filtre">${[["tout","Toutes"],["retard","En retard"],["semaine","Cette semaine"]].map(([k,l])=>`<button class="chip ${DF===k?"on":""}" data-df="${k}" aria-pressed="${DF===k}">${l}</button>`).join("")}</div>
 ${L.map((x,i)=>`<article class="card dc"><div class="top"><div class="grow"><b>${esc(x.tiers)}</b><div class="mute sm">${esc(x.lib)}</div></div>
 <div class="amt"><b>${fmtN(x.reste)}</b><div class="sm ${x.retard?"red":dueSoon(x)?"amb":"mute"}" style="font-weight:700">${x.ech?(x.retard?"en retard depuis le ":"échéance le ")+fd(x.ech):"sans échéance"}</div></div></div>
 <button class="b2 ghost" data-rel="${all.indexOf(x)}">${ic(MSG)}Relancer (copier le message)</button></article>`).join("")||`<div class="empty">Aucune dette ici.</div>`}`}
function vMois(){const m=E.mois,maxJ=Math.max(1,...m.parJour.map(x=>x[1]));
 return`<section class="hero g4" aria-label="Résultat du mois"><div><div class="l">Chiffre d'affaires</div><div class="v">${fmtN(m.ca)}</div><div class="s">${m.motos} moto${m.motos>1?"s":""}${m.objMotos?" / objectif "+m.objMotos:""}</div></div>
 <div><div class="l">Marge</div><div class="v">${m.marge==null?"—":fmtN(m.marge)}</div>${m.couv?`<div class="s">coût connu pour ${m.couv} % des ventes</div>`:""}</div>
 <div><div class="l">Charges</div><div class="v">${fmtN(m.charges)}</div></div>
 <div><div class="l">Résultat</div><div class="v">${m.marge==null?"—":fmtN(m.marge-m.charges)}</div></div></section>
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
 <h2>Apparence</h2><section class="card"><div class="seg" role="group" aria-label="Thème"><button data-th="dark" class="${dark?"on":""}" aria-pressed="${dark}">Sombre</button><button data-th="light" class="${dark?"":"on"}" aria-pressed="${!dark}">Clair</button></div></section>
 <h2>Compte</h2><section class="card"><p class="sm" style="margin:0">Connecté : ${esc(USER.email)}</p><p class="sm mute" style="margin:4px 0 0">Caisse version ${esc(E.version)}. Dernier envoi de la caisse : ${new Date(E.maj).toLocaleString("fr-FR")}.</p><button class="b2 ghost full" id="lo">Se déconnecter</button></section>
 <p class="mute sm" style="margin:0 2px">Installer l'app : Android (Chrome) menu ⋮ › « Ajouter à l'écran d'accueil ». iPhone (Safari) bouton Partager › « Sur l'écran d'accueil ».</p>`}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy")}catch(x){}a.remove();return ok}}
function setTheme(t){if(t==="light")document.documentElement.dataset.theme="light";else delete document.documentElement.dataset.theme;
 try{localStorage.setItem("dg_theme",t)}catch(e){}const m=$('meta[name="theme-color"]');if(m)m.content=t==="light"?"#f4f4f5":"#09090b";render()}
function bind(){$$("[data-go]").forEach(b=>b.onclick=()=>{TAB=b.dataset.go;render()});
 $$("[data-acc]").forEach(b=>b.onclick=()=>decide(b.dataset.acc,"accepte"));$$("[data-ref]").forEach(b=>b.onclick=()=>decide(b.dataset.ref,"refuse"));
 const s=$("#sendm");if(s)s.onclick=async()=>{const t=$("#msg").value.trim();if(t.length<2)return;await sendCmd({type:"message",texte:t});$("#msg").value="";toast(navigator.onLine?"Message envoyé":"Message enregistré : envoyé dès le retour du réseau")};
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
