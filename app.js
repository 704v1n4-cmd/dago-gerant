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
  if(!UNSUB)UNSUB=FBX.onDoc("boutique/etat",(d,m)=>{E=d;META=m||{};render()},e=>{$("#app").innerHTML=`<div class="login"><div class="lbox"><h1>Accès refusé</h1><p>${esc(e.message||e)}</p><button class="b2 yes" id="lo">Se déconnecter</button></div></div>`;$("#lo").onclick=()=>FBX.signOut()});
  render()})})();
if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
window.addEventListener("online",render);window.addEventListener("offline",render);
function loginScreen(){$("#app").innerHTML=`<div class="login"><form class="lbox" id="lf"><div class="logo">DMS</div><h1>Dago Moto Shop</h1><p class="mute">App Gérant</p>
 <label>E-mail<input id="le" type="email" autocomplete="username" value="${esc(localStorage.getItem("dg_email")||"")}"></label><label>Mot de passe<input id="lp" type="password" autocomplete="current-password"></label>
 <button class="b2 yes" type="submit">Se connecter</button></form></div>`;
 $("#lf").onsubmit=async e=>{e.preventDefault();const em=$("#le").value.trim();try{await FBX.signIn(em,$("#lp").value);localStorage.setItem("dg_email",em)}catch(x){toast(/invalid|wrong|not-found/.test(String(x.code||x.message))?"E-mail ou mot de passe incorrect":"Connexion impossible : vérifiez internet",4000)}}}

/* ---------- affichage ---------- */
const TABS=[["jour","Aujourd'hui",'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'],["valider","Valider",'<path d="M20 6 9 17l-5-5"/>'],["dettes","Dettes",'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'],["mois","Mois",'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'],["plus","Plus",'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>']];
const ic=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
function pending(){return E?E.validations.filter(v=>!SENT[v.cle]):[]}
function render(){if(!USER)return;const sy=$(".body")?$(".body").scrollTop:0;
 if(!E){$("#app").innerHTML=`<div class="login"><div class="lbox"><div class="logo">DMS</div><p>${navigator.onLine?"Chargement des données de la caisse…":"Pas de connexion internet. Les données apparaîtront dès que le téléphone sera connecté."}</p><p class="mute sm">Si rien n'arrive : vérifiez que la caisse est allumée et liée (Réglages › Téléphone et cloud).</p><button class="lnk" id="lo">Se déconnecter</button></div></div>`;$("#lo").onclick=()=>FBX.signOut();return}
 const off=!navigator.onLine||META.fromCache,old=Date.now()-E.maj>15*60000,nV=pending().length;
 const titles={jour:"Aujourd'hui",valider:"À valider",dettes:"Dettes clients",mois:(m=>m[0].toUpperCase()+m.slice(1))(MOIS[+E.mois.m.slice(5)-1])+" "+E.mois.m.slice(0,4),plus:"Plus"};
 $("#app").innerHTML=`<header class="mh"><div><small>${esc(E.boutique)} · ${new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</small><h1>${titles[TAB]}</h1></div>
 <span class="sync ${off||old?"w":""}">${off?"Hors ligne · ":""}caisse ${ago(E.maj)}</span></header>
 ${old&&!off?`<div class="warnbar">La caisse n'a rien envoyé depuis ${ago(E.maj).replace("il y a ","")} : PC éteint, logiciel fermé ou pas d'internet au magasin.</div>`:""}
 <main class="body">${({jour:vJour,valider:vValider,dettes:vDettes,mois:vMois,plus:vPlus})[TAB]()}</main>
 <nav class="tabs">${TABS.map(([k,l,p])=>`<button class="${k===TAB?"on":""}" data-t="${k}">${k==="valider"&&nV?`<em>${nV}</em>`:""}${ic(p)}<span>${l}</span></button>`).join("")}</nav>`;
 $$("[data-t]").forEach(b=>b.onclick=()=>{TAB=b.dataset.t;render();$(".body").scrollTop=0});
 bind();const bd=$(".body");if(bd&&sy)bd.scrollTop=sy}
function bar(v,max){return`<span class="bt"><i style="width:${max?Math.round(v*100/max):0}%"></i></span>`}
function vJour(){const j=E.jour,nV=pending().length,late=E.dettes.liste.filter(x=>x.retard);
 return`<div class="card hero"><div class="l">Ventes du jour</div><div class="v">${fmtN(j.ventes)} <small>Ar</small></div>
 <div class="leg"><span>${j.motos} moto(s)</span><span>dont crédit ${fmtN(j.credit)}</span></div></div>
 <div class="k2"><div class="card"><div class="l">Encaissé</div><div class="v">${fmtN(j.encaisse)}</div><div class="s">dépenses ${fmtN(j.depenses)}</div></div>
 <div class="card"><div class="l">Espèces attendues</div><div class="v">${fmtN(j.especes)}</div><div class="s">${j.cloture?"clôturé par "+esc(j.cloture.par):"journée non clôturée"}</div></div>
 <div class="card"><div class="l">Marge estimée</div><div class="v">${j.marge==null?"—":fmtN(j.marge)}</div><div class="s">${j.couv?"coût connu "+j.couv+" %":""}</div></div>
 <div class="card"><div class="l">Dettes clients</div><div class="v ${late.length?"red":""}">${fmtN(E.dettes.total)}</div><div class="s">${late.length} en retard</div></div></div>
 ${j.cloture?`<div class="card"><div class="ct"><b>Clôture du jour</b>${j.cloture.ecart?tag("écart "+fmtN(j.cloture.ecart),"r"):tag("caisse juste","g")}</div><div class="s">Attendu ${fmtN(j.cloture.attendu)} · compté ${j.cloture.compte==null?"—":fmtN(j.cloture.compte)}${j.cloture.comment?" · « "+esc(j.cloture.comment)+" »":""}</div></div>`:""}
 <div class="card"><div class="ct"><b>À traiter</b></div>
  ${nV?`<button class="al" data-go="valider"><i class="ic a">!</i><span><b>${nV} vente(s) sous le minimum</b><small>à accepter ou refuser</small></span>${tag("Valider","w")}</button>`:""}
  ${E.refusees?`<div class="al"><i class="ic r">×</i><span><b>${E.refusees} vente(s) refusée(s)</b><small>pas encore régularisée(s) au magasin</small></span></div>`:""}
  ${late.slice(0,3).map(x=>`<div class="al"><i class="ic r">!</i><span><b>${esc(x.tiers)} — ${fmtN(x.reste)} Ar</b><small>échéance dépassée (${fd(x.ech)})</small></span></div>`).join("")}
  ${E.stock.faible.length?`<div class="al"><i class="ic">▤</i><span><b>Stock faible : ${E.stock.faible.length} article(s)</b><small>${esc(E.stock.faible.slice(0,3).map(i=>i.nom).join(", "))}</small></span></div>`:""}
  ${!nV&&!E.refusees&&!late.length&&!E.stock.faible.length?`<p class="mute sm">Rien à traiter.</p>`:""}</div>
 <h2>Tickets du jour</h2><div class="card list">${j.tickets.map(t=>`<div class="li ${t.annule?"strike":""}"><span class="mute">${t.h}</span><span class="grow">${t.n?"<b>n° "+t.n+"</b> · ":""}${esc(t.lib)}${t.tiers?` <span class="mute">· ${esc(t.tiers)}</span>`:""}</span><b>${fmtN(t.tot)}</b></div>`).join("")||`<p class="mute pad">Aucune vente.</p>`}</div>
 <h2>Dépenses du jour</h2><div class="card list">${j.depensesListe.map(o=>`<div class="li"><span class="mute">${o.h}</span><span class="grow">${esc(o.lib)}<small class="mute"> · ${esc(o.cat)}${o.tiers?" · "+esc(o.tiers):""}</small></span><b class="red">−${fmtN(o.m)}</b></div>`).join("")||`<p class="mute pad">Aucune dépense.</p>`}</div>`}
function vValider(){const L=E.validations;if(!L.length)return`<div class="empty">Aucune vente à valider.</div>`;
 return L.map(v=>{const prix=v.lignes.reduce((s,l)=>s+l.prix,0),mn=v.lignes.reduce((s,l)=>s+l.minimum,0),ct=v.lignes.reduce((s,l)=>s+l.cout,0),sent=SENT[v.cle];
  return`<div class="card vc"><div class="top">${tag("Sous le minimum · "+fmtN(prix-mn),"w")}<span class="mute sm">${fd(v.date)} · ${esc(v.par)}</span></div>
  <h3>${esc(v.lignes.map(l=>l.lib).join(" + "))}</h3><div class="mute sm">${v.ticket?"Ticket n° "+v.ticket+" · ":""}${esc(v.tiers||"Client comptoir")} · ${esc(v.vente)}</div>
  <div class="cmp"><div><small>Prix fait</small><b>${fmtN(prix)}</b></div><div><small>Minimum</small><b>${fmtN(mn)}</b></div><div><small>Coût</small><b>${ct?fmtN(ct):"—"}</b></div></div>
  ${ct?`<div class="mute sm">Marge restante : <b class="${prix<ct?"red":""}">${fmtN(prix-ct)} Ar (${Math.round((prix-ct)*100/prix)} %)</b></div>`:""}
  ${v.motif?`<div class="sm">Motif du caissier : « ${esc(v.motif)} »</div>`:""}
  ${sent?`<div class="note">${sent==="accepte"?"Accepté":"Refusé"} — transmis à la caisse${navigator.onLine?"":" dès le retour du réseau"}.</div>`:`<div class="acts"><button class="b2 no" data-ref="${esc(v.cle)}">Refuser</button><button class="b2 yes" data-acc="${esc(v.cle)}">Accepter</button></div>`}</div>`}).join("")}
function vDettes(){const L=E.dettes.liste;return`<div class="card hero"><div class="l">Les clients doivent</div><div class="v">${fmtN(E.dettes.total)} <small>Ar</small></div><div class="leg"><span>${E.dettes.n} dette(s)</span><span>${L.filter(x=>x.retard).length} en retard</span></div></div>
 <div class="card list">${L.map(x=>`<div class="li"><span class="grow"><b>${esc(x.tiers)}</b><small class="mute">${esc(x.lib)}</small></span><span class="r"><b>${fmtN(x.reste)}</b><small class="${x.retard?"red":"mute"}">${x.ech?(x.retard?"en retard · ":"échéance ")+fd(x.ech):"sans échéance"}</small></span></div>`).join("")||`<p class="mute pad">Aucune dette.</p>`}</div>`}
function vMois(){const m=E.mois,maxJ=Math.max(1,...m.parJour.map(x=>x[1])),maxC=Math.max(1,...m.parCat.map(x=>x[1])),maxD=Math.max(1,...m.depCat.map(x=>x[1]));
 return`<div class="k2"><div class="card"><div class="l">Chiffre d'affaires</div><div class="v">${fmtN(m.ca)}</div>${m.objCa?`<div class="prog"><i style="width:${Math.min(100,m.ca*100/m.objCa)}%"></i></div><div class="s">objectif ${fmtN(m.objCa)}</div>`:""}</div>
 <div class="card"><div class="l">Motos vendues</div><div class="v">${m.motos}</div>${m.objMotos?`<div class="prog"><i style="width:${Math.min(100,m.motos*100/m.objMotos)}%"></i></div><div class="s">objectif ${m.objMotos}</div>`:""}</div>
 <div class="card"><div class="l">Marge estimée</div><div class="v">${m.marge==null?"—":fmtN(m.marge)}</div><div class="s">${m.couv?"coût connu "+m.couv+" %":""}</div></div>
 <div class="card"><div class="l">Résultat estimé</div><div class="v">${m.marge==null?"—":fmtN(m.marge-m.charges)}</div><div class="s">charges ${fmtN(m.charges)}</div></div></div>
 <div class="k2"><div class="card"><div class="l">Retraits des associés</div><div class="v">${fmtN(m.retraits)}</div></div><div class="card"><div class="l">Camion (à refacturer)</div><div class="v">${fmtN(m.camion)}</div></div></div>
 <h2>Ventes par jour</h2><div class="card"><div class="vbars">${m.parJour.map(([d,v])=>`<div class="vb"><i style="height:${Math.round(v*100/maxJ)}%"></i><span>${d}</span></div>`).join("")}</div></div>
 <h2>Ventes par catégorie</h2><div class="card">${m.parCat.map(([c,v])=>`<div class="br"><span>${esc(c)}</span>${bar(v,maxC)}<b>${fmtN(v)}</b></div>`).join("")}</div>
 <h2>Dépenses par catégorie</h2><div class="card">${m.depCat.map(([c,v])=>`<div class="br"><span>${esc(c)}</span>${bar(v,maxD)}<b>${fmtN(v)}</b></div>`).join("")}</div>
 <h2>Soldes</h2><div class="card list">${Object.entries(E.soldes).map(([k,v])=>`<div class="li"><span class="grow">${esc(k)}</span><b>${fmtN(v)}</b></div>`).join("")}</div>`}
const STL={recue:"Reçue",encours:"En réparation",prete:"Prête",livree:"Livrée"};
function vPlus(){return`<h2>Envoyer un message à la caisse</h2><div class="card"><textarea id="msg" rows="3" placeholder="Ex. : Ne pas vendre la Kymco Many sous 2 500 000."></textarea><button class="b2 yes full" id="sendm">Envoyer</button><p class="mute sm">Le message s'affiche en haut de l'écran de la caisse jusqu'à ce qu'un caissier clique « Lu ».</p></div>
 <h2>Atelier</h2><div class="card list">${E.atelier.map(r=>`<div class="li"><span class="grow"><b>${esc(r.num)} · ${esc(r.moto)}</b><small class="mute">${esc(r.client||"comptoir")}${r.meca?" · "+esc(r.meca):""}</small></span><span class="r">${tag(STL[r.statut]||r.statut,r.statut==="prete"?"g":r.attente?"w":"")}${r.total?`<small>${fmtN(r.total)}</small>`:""}</span></div>`).join("")||`<p class="mute pad">Aucune réparation en cours.</p>`}</div>
 <h2>Stock faible</h2><div class="card list">${E.stock.faible.map(i=>`<div class="li"><span class="grow">${esc(i.nom)}</span><b class="red">${i.qte}</b><small class="mute"> / ${i.seuil}</small></div>`).join("")||`<p class="mute pad">Rien à signaler.</p>`}${E.stock.negatif?`<p class="pad sm red">${E.stock.negatif} article(s) à inventorier (stock négatif).</p>`:""}</div>
 <h2>Arrivages</h2><div class="card list">${E.arrivages.map(a=>`<div class="li"><span class="grow"><b>${esc(a.ref)}</b><small class="mute">${fd(a.date)} · ${a.lignes} ligne(s)</small></span><span class="r">${a.statut==="valide"?tag("Validé","g"):tag("Brouillon","w")}<small>${fmtN(a.total)}</small></span></div>`).join("")||`<p class="mute pad">Aucun arrivage.</p>`}</div>
 <h2>Compte</h2><div class="card"><p class="sm">Connecté : ${esc(USER.email)}</p><p class="sm mute">Caisse version ${esc(E.version)}. Dernier envoi de la caisse : ${new Date(E.maj).toLocaleString("fr-FR")}.</p><button class="b2 no full" id="lo">Se déconnecter</button></div>
 <p class="mute sm pad">Installer l'app : Android (Chrome) menu ⋮ › « Ajouter à l'écran d'accueil ». iPhone (Safari) bouton Partager › « Sur l'écran d'accueil ».</p>`}
function bind(){$$("[data-go]").forEach(b=>b.onclick=()=>{TAB=b.dataset.go;render()});
 $$("[data-acc]").forEach(b=>b.onclick=()=>decide(b.dataset.acc,"accepte"));$$("[data-ref]").forEach(b=>b.onclick=()=>decide(b.dataset.ref,"refuse"));
 const s=$("#sendm");if(s)s.onclick=async()=>{const t=$("#msg").value.trim();if(t.length<2)return;await sendCmd({type:"message",texte:t});$("#msg").value="";toast(navigator.onLine?"Message envoyé":"Message enregistré : envoyé dès le retour du réseau")};
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
