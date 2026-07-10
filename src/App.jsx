import { useState, useEffect, useRef } from "react";

// ─── BIBLIOTECA DE EXERCÍCIOS ─────────────────────────────────────────────────

const EXERCISE_LIBRARY = {
  peito:       { label:"Peito", icon:"🫁", exercises:[
    { id:"sup_ret_bar",  name:"Supino reto (barra)",         sets:4, reps:"6-8",   rest:90,  pose:"press_chest" },
    { id:"sup_ret_halt", name:"Supino reto (halteres)",      sets:4, reps:"8-10",  rest:90,  pose:"press_chest" },
    { id:"sup_inc_bar",  name:"Supino inclinado (barra)",    sets:3, reps:"8-10",  rest:75,  pose:"press_chest" },
    { id:"sup_inc_halt", name:"Supino inclinado (halteres)", sets:3, reps:"8-10",  rest:75,  pose:"press_chest" },
    { id:"cru_halt",     name:"Crucifixo (halteres)",        sets:3, reps:"12-15", rest:60,  pose:"fly"         },
    { id:"cru_cabo",     name:"Crucifixo no cabo",           sets:3, reps:"12-15", rest:60,  pose:"fly"         },
    { id:"peck_deck",    name:"Peck deck (máquina)",         sets:3, reps:"12-15", rest:60,  pose:"fly"         },
    { id:"cross_over",   name:"Cross-over no cabo",          sets:3, reps:"12-15", rest:60,  pose:"fly"         },
    { id:"flexao",       name:"Flexão de braço",             sets:3, reps:"10-15", rest:60,  pose:"press_chest" },
  ]},
  ombro:       { label:"Ombro", icon:"🔺", exercises:[
    { id:"dev_bar",      name:"Desenvolvimento (barra)",     sets:4, reps:"6-8",   rest:90,  pose:"press_overhead" },
    { id:"dev_halt",     name:"Desenvolvimento (halteres)",  sets:3, reps:"8-10",  rest:75,  pose:"press_overhead" },
    { id:"dev_smith",    name:"Desenvolvimento no Smith",    sets:3, reps:"8-10",  rest:75,  pose:"press_overhead" },
    { id:"elev_lat",     name:"Elevação lateral",            sets:3, reps:"12-15", rest:60,  pose:"lateral_raise"  },
    { id:"elev_lat_cab", name:"Elevação lateral (cabo)",     sets:3, reps:"12-15", rest:60,  pose:"lateral_raise"  },
    { id:"elev_front",   name:"Elevação frontal",            sets:3, reps:"12-15", rest:60,  pose:"lateral_raise"  },
    { id:"face_pull",    name:"Face pull",                   sets:3, reps:"12-15", rest:60,  pose:"face_pull"      },
    { id:"maq_ombro",    name:"Máquina de ombro",            sets:3, reps:"10-12", rest:75,  pose:"press_overhead" },
  ]},
  triceps:     { label:"Tríceps", icon:"💪", exercises:[
    { id:"tri_corda",    name:"Tríceps corda",               sets:3, reps:"10-12", rest:60,  pose:"triceps" },
    { id:"tri_polia",    name:"Tríceps polia alta (barra)",  sets:3, reps:"10-12", rest:60,  pose:"triceps" },
    { id:"tri_frances",  name:"Tríceps francês",             sets:3, reps:"10-12", rest:60,  pose:"triceps" },
    { id:"tri_testa",    name:"Tríceps testa (barra)",       sets:3, reps:"10-12", rest:60,  pose:"triceps" },
    { id:"mergulho",     name:"Mergulho em banco",           sets:3, reps:"10-15", rest:60,  pose:"triceps" },
    { id:"tri_maq",      name:"Máquina de tríceps",          sets:3, reps:"12-15", rest:60,  pose:"triceps" },
  ]},
  costas:      { label:"Costas", icon:"🪨", exercises:[
    { id:"barra_fixa",   name:"Barra fixa",                  sets:4, reps:"6-8",   rest:90,  pose:"pulldown" },
    { id:"pux_alta",     name:"Puxada alta (frente)",        sets:4, reps:"8-10",  rest:90,  pose:"pulldown" },
    { id:"pux_supi",     name:"Puxada supinada",             sets:3, reps:"8-10",  rest:75,  pose:"pulldown" },
    { id:"pux_fech",     name:"Puxada fechada (triângulo)",  sets:3, reps:"10-12", rest:60,  pose:"pulldown" },
    { id:"rem_curv",     name:"Remada curvada (barra)",      sets:4, reps:"6-8",   rest:90,  pose:"row"     },
    { id:"rem_uni",      name:"Remada unilateral (halter)",  sets:3, reps:"10-12", rest:75,  pose:"row"     },
    { id:"rem_sent",     name:"Remada sentada (triângulo)",  sets:3, reps:"10-12", rest:75,  pose:"row"     },
    { id:"rem_maq",      name:"Remada na máquina",           sets:3, reps:"10-12", rest:75,  pose:"row"     },
    { id:"rem_cav",      name:"Remada cavalinho",            sets:3, reps:"10-12", rest:75,  pose:"row"     },
  ]},
  biceps:      { label:"Bíceps", icon:"💪", exercises:[
    { id:"rosca_dir_bar",name:"Rosca direta (barra)",        sets:3, reps:"10-12", rest:60,  pose:"curl" },
    { id:"rosca_dir_halt",name:"Rosca direta (halteres)",   sets:3, reps:"10-12", rest:60,  pose:"curl" },
    { id:"rosca_alt",    name:"Rosca alternada",             sets:3, reps:"10-12", rest:60,  pose:"curl" },
    { id:"rosca_mart",   name:"Rosca martelo",               sets:3, reps:"10-12", rest:60,  pose:"curl" },
    { id:"rosca_conc",   name:"Rosca concentrada",           sets:3, reps:"10-12", rest:60,  pose:"curl" },
    { id:"rosca_cabo",   name:"Rosca no cabo baixo",         sets:3, reps:"12-15", rest:60,  pose:"curl" },
  ]},
  quadriceps:  { label:"Quadríceps", icon:"🦵", exercises:[
    { id:"agach_livre",  name:"Agachamento livre",           sets:4, reps:"6-8",   rest:120, pose:"squat"        },
    { id:"agach_smith",  name:"Agachamento no Smith",        sets:4, reps:"8-10",  rest:90,  pose:"squat"        },
    { id:"hack_squat",   name:"Hack squat (máquina)",        sets:3, reps:"8-10",  rest:90,  pose:"squat"        },
    { id:"leg_press",    name:"Leg press",                   sets:3, reps:"10-12", rest:90,  pose:"leg_press"    },
    { id:"leg_press_45", name:"Leg press 45°",               sets:3, reps:"10-12", rest:90,  pose:"leg_press"    },
    { id:"cad_ext",      name:"Cadeira extensora",           sets:3, reps:"12-15", rest:60,  pose:"leg_extension"},
    { id:"afundo",       name:"Afundo (passada)",            sets:3, reps:"10/perna",rest:75, pose:"lunge"       },
    { id:"afundo_halt",  name:"Afundo (halteres)",           sets:3, reps:"10/perna",rest:75, pose:"lunge"       },
    { id:"av_bulg",      name:"Avanço búlgaro",              sets:3, reps:"10/perna",rest:90, pose:"lunge"       },
    { id:"agach_sumo",   name:"Agachamento sumô",            sets:3, reps:"10-12", rest:75,  pose:"squat"        },
    { id:"wall_sit",     name:"Wall sit (isométrico)",       sets:3, reps:"40-60s", rest:60, pose:"squat", iso:true, isoSec:60 },
  ]},
  posterior:   { label:"Posterior/Glúteo", icon:"🍑", exercises:[
    { id:"terra_rom",    name:"Terra romeno (barra)",        sets:4, reps:"8-10",  rest:120, pose:"hinge"     },
    { id:"terra_halt",   name:"Terra romeno (halteres)",     sets:3, reps:"10-12", rest:90,  pose:"hinge"     },
    { id:"terra_conv",   name:"Terra convencional",          sets:4, reps:"6-8",   rest:120, pose:"hinge"     },
    { id:"hip_thrust",   name:"Hip thrust",                  sets:3, reps:"10-12", rest:90,  pose:"hip_thrust"},
    { id:"hip_halt",     name:"Hip thrust (halteres)",       sets:3, reps:"12-15", rest:90,  pose:"hip_thrust"},
    { id:"ponte_glut",   name:"Ponte de glúteo",             sets:3, reps:"12-15", rest:75,  pose:"hip_thrust"},
    { id:"stiff_halt",   name:"Stiff (halteres)",            sets:3, reps:"10-12", rest:75,  pose:"hinge"     },
    { id:"cad_flex",     name:"Cadeira flexora",             sets:3, reps:"12-15", rest:60,  pose:"leg_curl"  },
    { id:"nordic",       name:"Nordic curl",                 sets:3, reps:"6-8",   rest:90,  pose:"leg_curl"  },
  ]},
  panturrilha: { label:"Panturrilha", icon:"🦶", exercises:[
    { id:"pant_pe",      name:"Panturrilha em pé",           sets:4, reps:"15-20", rest:45,  pose:"calf" },
    { id:"pant_sent",    name:"Panturrilha sentado",         sets:4, reps:"15-20", rest:45,  pose:"calf" },
    { id:"pant_maq",     name:"Panturrilha na máquina",      sets:4, reps:"15-20", rest:45,  pose:"calf" },
    { id:"pant_degrau",  name:"Panturrilha no degrau",       sets:4, reps:"15-20", rest:45,  pose:"calf" },
  ]},
  abdomen:     { label:"Abdômen/Core", icon:"⚡", exercises:[
    { id:"prancha",      name:"Prancha abdominal",           sets:3, reps:"40-60s", rest:45, pose:"plank", iso:true, isoSec:60 },
    { id:"elev_pernas",  name:"Elevação de pernas",          sets:3, reps:"12-15", rest:45,  pose:"leg_raise"},
    { id:"abd_roda",     name:"Abdominal com roda",          sets:3, reps:"8-12",  rest:45,  pose:"plank"    },
    { id:"abd_cabo",     name:"Abdominal no cabo",           sets:3, reps:"12-15", rest:45,  pose:"plank"    },
    { id:"prancha_lat",  name:"Prancha lateral",             sets:3, reps:"30-45s", rest:45, pose:"plank", iso:true, isoSec:45 },
  ]},
};

const MOBILITY_BY_GROUP = {
  peito:       [{ name:"Abertura peitoral na porta/batente", dur:"30s cada lado" },{ name:"Rotação de ombros com bastão", dur:"10 reps cada direção" }],
  ombro:       [{ name:"Rotação externa de ombro c/ elástico", dur:"10 reps cada lado" },{ name:"Mobilidade de punho e antebraço", dur:"30s" }],
  triceps:     [{ name:"Alongamento de tríceps (mão nas costas)", dur:"20s cada lado" }],
  costas:      [{ name:"Retração e protração de escápula", dur:"10 reps" },{ name:"Alongamento de dorsal pendurado na barra", dur:"20-30s" }],
  biceps:      [{ name:"Mobilidade de cotovelo e punho", dur:"30s" }],
  quadriceps:  [{ name:"Agachamento corporal lento (mobilidade)", dur:"10 reps" },{ name:"Mobilidade de tornozelo (joelho na parede)", dur:"10 reps cada lado" }],
  posterior:   [{ name:"Mobilidade de quadril (90/90)", dur:"8 reps cada lado" },{ name:"Alongamento dinâmico de posterior de coxa", dur:"30s cada lado" }],
  panturrilha: [{ name:"Mobilidade de tornozelo (círculos)", dur:"10 reps cada lado" }],
  abdomen:     [{ name:"Cat-camel (mobilidade lombar)", dur:"10 reps" }],
};

// ─── SPLITS ──────────────────────────────────────────────────────────────────

const SPLITS = {
  upperlower: { label:"Upper / Lower", icon:"⬆", description:"4 dias · Empurrar+Puxar / Pernas", days:[
    { id:"ul_upper_a", label:"Upper A", sub:"Peito · Ombro · Tríceps", suggestedGroups:["peito","ombro","triceps"] },
    { id:"ul_lower_a", label:"Lower A", sub:"Quadríceps",               suggestedGroups:["quadriceps","abdomen"]   },
    { id:"ul_upper_b", label:"Upper B", sub:"Costas · Bíceps",          suggestedGroups:["costas","biceps"]        },
    { id:"ul_lower_b", label:"Lower B", sub:"Posterior · Glúteo",       suggestedGroups:["posterior","panturrilha"]},
  ]},
  ppl: { label:"Push / Pull / Legs", icon:"🔄", description:"3 ou 6 dias · Clássico e eficiente", days:[
    { id:"ppl_push",  label:"Push",  sub:"Peito · Ombro · Tríceps",   suggestedGroups:["peito","ombro","triceps"]        },
    { id:"ppl_pull",  label:"Pull",  sub:"Costas · Bíceps",            suggestedGroups:["costas","biceps"]                },
    { id:"ppl_legs",  label:"Legs",  sub:"Pernas · Glúteo · Panturrilha", suggestedGroups:["quadriceps","posterior","panturrilha"] },
  ]},
  fullbody: { label:"Full Body", icon:"🏋", description:"3 dias · Corpo inteiro por sessão", days:[
    { id:"fb_a", label:"Full Body A", sub:"Corpo inteiro", suggestedGroups:["peito","costas","quadriceps","abdomen"]  },
    { id:"fb_b", label:"Full Body B", sub:"Corpo inteiro", suggestedGroups:["ombro","biceps","triceps","posterior"]   },
    { id:"fb_c", label:"Full Body C", sub:"Corpo inteiro", suggestedGroups:["peito","costas","posterior","abdomen"]   },
  ]},
  bro: { label:"Bro Split", icon:"💪", description:"5 dias · Um grupo muscular por dia", days:[
    { id:"bro_peito",  label:"Peito",   sub:"Foco em peitoral",         suggestedGroups:["peito","triceps"]             },
    { id:"bro_costas", label:"Costas",  sub:"Foco em dorsal",           suggestedGroups:["costas","biceps"]             },
    { id:"bro_ombro",  label:"Ombros",  sub:"Foco em deltóides",        suggestedGroups:["ombro","triceps"]             },
    { id:"bro_braco",  label:"Braços",  sub:"Bíceps e tríceps",         suggestedGroups:["biceps","triceps"]            },
    { id:"bro_pernas", label:"Pernas",  sub:"Pernas e glúteo",          suggestedGroups:["quadriceps","posterior","panturrilha"] },
  ]},
};

// ─── CARDIO / GOALS / LEVELS ─────────────────────────────────────────────────

const CARDIO_OPTIONS = [
  { id:"esteira",  name:"Esteira",  icon:"🏃" },
  { id:"bike",     name:"Bike",     icon:"🚴" },
  { id:"eliptico", name:"Elíptico", icon:"⚡" },
  { id:"remo",     name:"Remo",     icon:"🚣" },
];
const GOALS = [
  { id:"massa",          label:"Ganho de massa",    icon:"💪" },
  { id:"gordura",        label:"Perda de gordura",  icon:"🔥" },
  { id:"condicionamento",label:"Condicionamento",   icon:"⚡" },
  { id:"saude",          label:"Saúde geral",       icon:"❤️" },
];
const LEVELS = [
  { id:"iniciante",      label:"Iniciante",     sub:"< 6 meses"     },
  { id:"intermediario",  label:"Intermediário", sub:"6 meses–2 anos"},
  { id:"avancado",       label:"Avançado",      sub:"> 2 anos"      },
];
const EQUIPMENT_OPTIONS = [
  { id:"completa", label:"Academia completa" },
  { id:"basica",   label:"Academia básica"   },
  { id:"casa",     label:"Treino em casa"    },
];
const DURATION_OPTIONS = ["45 min","1 hora","1h30","2 horas"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const todayISO = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2,9);
async function loadStorage(key) {
  // Nuvem primeiro (se logado), fallback local
  if (typeof AUTH_ENABLED !== "undefined" && AUTH_ENABLED && localStorage.getItem("abody:session")) {
    const cloud = await cloudLoad(key);
    if (cloud !== null) { localStorage.setItem(key, JSON.stringify(cloud)); return cloud; }
  }
  try { const v=localStorage.getItem(key); return v?JSON.parse(v):null; } catch{return null;}
}

const repairJSON = (str) => {
  // Remove markdown
  let s = str.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
  // Pegar só entre { e }
  const si = s.indexOf("{"), ei = s.lastIndexOf("}");
  if (si !== -1 && ei > si) s = s.slice(si, ei+1);
  // Remover trailing commas
  s = s.replace(/,\s*([}\]])/g,"$1");
  // Aspas simples → duplas (valores)
  s = s.replace(/:\s*'([^']*)'/g,':"$1"');
  // Chaves sem aspas
  s = s.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g,'$1"$2":');
  // Remover comentários // e /* */
  s = s.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"");
  return s;
};

const extractJSON = (text) => {
  if (!text) throw new Error("Empty response");
  // 1. Direto
  try { return JSON.parse(text); } catch {}
  // 2. Remove markdown, tenta
  const c = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
  try { return JSON.parse(c); } catch {}
  // 3. Extrai {…}
  const si = text.indexOf("{"), ei = text.lastIndexOf("}");
  if (si !== -1 && ei > si) {
    const slice = text.slice(si, ei+1);
    try { return JSON.parse(slice); } catch {}
    // 4. Repara e tenta
    try { return JSON.parse(repairJSON(slice)); } catch {}
    // 5. JSON truncado — fecha colchetes/chaves abertos
    try {
      let s = repairJSON(slice);
      // fechar strings abertas
      const qCount = (s.match(/(?<!\\)"/g)||[]).length;
      if(qCount%2!==0) s+='"';
      // fechar arrays abertos
      const ao=(s.match(/\[/g)||[]).length-(s.match(/\]/g)||[]).length;
      for(let i=0;i<ao;i++) s+="null]";
      // fechar objetos abertos
      const oo=(s.match(/\{/g)||[]).length-(s.match(/\}/g)||[]).length;
      for(let i=0;i<oo;i++) s+="}";
      return JSON.parse(s);
    } catch {}
  }
  throw new Error("Could not parse JSON from response");
};
async function saveStorage(key,v) {
  try { localStorage.setItem(key,JSON.stringify(v)); } catch{}
  if (typeof AUTH_ENABLED !== "undefined" && AUTH_ENABLED && localStorage.getItem("abody:session")) cloudSave(key, v);
}

// ─── SUPABASE AUTH (REST puro, sem SDK) ──────────────────────────────────────
const SUPA_URL  = import.meta.env.VITE_SUPABASE_URL || "";
const SUPA_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const AUTH_ENABLED = !!(SUPA_URL && SUPA_KEY);

const getSession  = () => { try { return JSON.parse(localStorage.getItem("abody:session")) || null; } catch { return null; } };
const saveSession = (s) => localStorage.setItem("abody:session", JSON.stringify(s));
const clearSession= () => localStorage.removeItem("abody:session");

async function supaFetch(path, opts={}) {
  const res = await fetch(`${SUPA_URL}${path}`, {
    ...opts,
    headers: { "apikey": SUPA_KEY, "Content-Type": "application/json", ...(opts.headers||{}) },
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Erro de autenticação");
  return data;
}

async function authSignUp(email, password) {
  const d = await supaFetch("/auth/v1/signup", { method:"POST", body: JSON.stringify({ email, password }) });
  if (d.access_token) saveSession(d);
  return d;
}

async function authSignIn(email, password) {
  const d = await supaFetch("/auth/v1/token?grant_type=password", { method:"POST", body: JSON.stringify({ email, password }) });
  saveSession(d);
  return d;
}

function authSignInGoogle() {
  const redirect = encodeURIComponent(window.location.origin);
  window.location.href = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
}

// Captura tokens do hash após redirect OAuth (#access_token=...)
function handleOAuthCallback() {
  if (!window.location.hash.includes("access_token")) return false;
  const p = new URLSearchParams(window.location.hash.slice(1));
  const session = {
    access_token:  p.get("access_token"),
    refresh_token: p.get("refresh_token"),
    expires_at: Math.floor(Date.now()/1000) + Number(p.get("expires_in")||3600),
  };
  saveSession(session);
  history.replaceState(null, "", window.location.pathname);
  return true;
}

async function refreshIfNeeded() {
  const s = getSession();
  if (!s) return null;
  const expiresAt = s.expires_at || 0;
  if (Date.now()/1000 < expiresAt - 60) return s;
  try {
    const d = await supaFetch("/auth/v1/token?grant_type=refresh_token", {
      method:"POST", body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    d.expires_at = Math.floor(Date.now()/1000) + (d.expires_in||3600);
    saveSession(d);
    return d;
  } catch { clearSession(); return null; }
}

async function authGetUser() {
  const s = await refreshIfNeeded();
  if (!s) return null;
  try {
    return await supaFetch("/auth/v1/user", { headers:{ Authorization:`Bearer ${s.access_token}` } });
  } catch { return null; }
}

function authSignOut() { clearSession(); }

// ─── SYNC DE DADOS (tabela user_data: user_id, key, value) ──────────────────
async function cloudSave(key, value) {
  const s = await refreshIfNeeded();
  if (!s) return;
  try {
    await supaFetch("/rest/v1/user_data", {
      method:"POST",
      headers:{ Authorization:`Bearer ${s.access_token}`, "Prefer":"resolution=merge-duplicates" },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
  } catch(e) { console.warn("cloudSave:", e.message); }
}

async function cloudLoad(key) {
  const s = await refreshIfNeeded();
  if (!s) return null;
  try {
    const rows = await supaFetch(`/rest/v1/user_data?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers:{ Authorization:`Bearer ${s.access_token}` },
    });
    return rows?.[0]?.value ?? null;
  } catch { return null; }
}


const getApiKey = () => localStorage.getItem("abody:apikey") || "";
const setApiKey = (k) => localStorage.setItem("abody:apikey", k);

async function callClaude(body) {
  const s = await refreshIfNeeded();
  if (!s?.access_token) throw new Error("Faça login para usar a geração por IA.");
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// ─── TELEMETRIA (fire-and-forget, tabela eventos) ────────────────────────────
const anonId = (() => {
  let id = localStorage.getItem("abody:anonid");
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("abody:anonid", id); }
  return id;
})();
function track(evento, props) {
  try {
    const s = getSession();
    fetch(`${SUPA_URL}/rest/v1/eventos`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ anon_id: anonId, user_id: s?.user?.id || null, evento, props: props || null }),
    }).catch(()=>{});
  } catch {}
}
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => track("js_error", { msg: String(e.message).slice(0,200) }));
  window.addEventListener("unhandledrejection", (e) => track("js_error", { msg: String(e.reason?.message || e.reason).slice(0,200) }));
}


const getPose = (name="") => {
  const n=name.toLowerCase();
  if(n.includes("supino")||n.includes("flexão de braço")) return "press_chest";
  if(n.includes("desenvolvimento")||n.includes("overhead")) return "press_overhead";
  if(n.includes("elevação lateral")) return "lateral_raise";
  if(n.includes("crucifixo")||n.includes("peck deck")||n.includes("cross")) return "fly";
  if(n.includes("tríceps")||n.includes("mergulho")) return "triceps";
  if(n.includes("agachamento")||n.includes("squat")||n.includes("hack")) return "squat";
  if(n.includes("leg press")) return "leg_press";
  if(n.includes("extensora")) return "leg_extension";
  if(n.includes("afundo")||n.includes("búlgaro")||n.includes("avanço")||n.includes("passada")) return "lunge";
  if(n.includes("flexora")||n.includes("nordic")) return "leg_curl";
  if(n.includes("panturrilha")) return "calf";
  if(n.includes("prancha")||n.includes("abdom")||n.includes("roda")||n.includes("elevação de pern")) return "plank";
  if(n.includes("puxada")||n.includes("barra fixa")) return "pulldown";
  if(n.includes("remada")||n.includes("cavalinho")) return "row";
  if(n.includes("face pull")) return "face_pull";
  if(n.includes("rosca")||n.includes("bíceps")) return "curl";
  if(n.includes("terra")||n.includes("stiff")||n.includes("romeno")) return "hinge";
  if(n.includes("hip thrust")||n.includes("ponte")) return "hip_thrust";
  if(n.includes("leg raise")||n.includes("elevação de perna")) return "leg_raise";
  if(n.includes("wall sit")) return "squat";
  return "press_chest";
};

const convertAIPlan = (aiPlan, userName) => ({
  userName: userName||"Atleta", planName: aiPlan.planName||"Meu Plano", planDescription: aiPlan.planDescription||"",
  mode:"ai",
  weekDays:(aiPlan.weekDays||[]).map((d,di)=>({
    id:d.id||`day${di+1}`, label:d.label||`Dia ${di+1}`, sub:d.sub||"",
    exercises:(d.exercises||[]).map((ex,ei)=>({
      id:ex.id||`ex_${di}_${ei}`, name:ex.name,
      sets:Number(ex.sets)||3, reps:String(ex.reps||"10-12"), rest:Number(ex.rest)||60,
      pose:getPose(ex.name), iso:!!ex.isometric, isoSec:ex.isometric?(Number(ex.isoSeconds)||45):null,
    })),
    mobility:(d.mobility||[]).map(m=>({name:m.name,dur:m.duration||"10 reps"})),
    postCardio:{text:d.postCardio?.text||"Cardio leve pós-treino",min:d.postCardio?.minMinutes||10,max:d.postCardio?.maxMinutes||15,intensity:d.postCardio?.intensity||"Leve"},
  })),
});

const buildManualPlan = (name, splitDays, dayExercises) => ({
  userName: name||"Atleta", planName:"Meu Plano Personalizado", planDescription:"Plano montado por você.",
  mode:"manual",
  weekDays: splitDays.map(d=>{
    const exs = (dayExercises[d.id]||[]).map(ex=>({...ex}));
    const groups = [...new Set(d.suggestedGroups)];
    const mobility = groups.flatMap(g=>MOBILITY_BY_GROUP[g]||[]).slice(0,4);
    return {
      id:d.id, label:d.label, sub:d.sub, exercises:exs,
      mobility: mobility.length ? mobility : [{name:"Mobilidade geral de aquecimento",dur:"5 min"}],
      postCardio:{text:"Cardio leve pós-treino",min:10,max:15,intensity:"Leve"},
    };
  }),
});

// ─── POSES ────────────────────────────────────────────────────────────────────

const POSES = {
  press_chest:    { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[44,30],hL:[36,22],eR:[76,30],hR:[84,22],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110],bar:[36,20,84,20]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[46,26],hL:[42,14],eR:[74,26],hR:[78,14],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110],bar:[42,12,78,12]} },
  press_overhead: { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[44,28],hL:[40,18],eR:[76,28],hR:[80,18],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110],bar:[40,16,80,16]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[52,12],hL:[50,2],eR:[68,12],hR:[70,2],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110],bar:[50,0,70,0]} },
  lateral_raise:  { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[48,36],hL:[44,46],eR:[72,36],hR:[76,46],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[36,24],hL:[24,22],eR:[84,24],hR:[96,22],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]} },
  fly:            { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[36,22],hL:[26,20],eR:[84,22],hR:[94,20],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[50,32],hL:[56,36],eR:[70,32],hR:[64,36],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]} },
  triceps:        { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[52,34],hL:[48,22],eR:[68,34],hR:[72,22],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[52,36],hL:[44,52],eR:[68,36],hR:[76,52],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]} },
  squat:          { start:{head:[60,12],sho:[60,22],hip:[60,56],eL:[50,32],hL:[46,44],eR:[70,32],hR:[74,44],kL:[52,80],fL:[48,106],kR:[68,80],fR:[72,106]}, end:{head:[60,24],sho:[60,34],hip:[60,68],eL:[48,44],hL:[44,56],eR:[72,44],hR:[76,56],kL:[40,82],fL:[36,108],kR:[80,82],fR:[84,108]} },
  leg_press:      { start:{head:[28,60],sho:[36,64],hip:[52,68],eL:[36,72],hL:[32,80],eR:[36,56],hR:[32,48],kL:[74,58],fL:[96,62],kR:[74,76],fR:[96,80]}, end:{head:[28,60],sho:[36,64],hip:[52,68],eL:[36,72],hL:[32,80],eR:[36,56],hR:[32,48],kL:[62,68],fL:[76,72],kR:[62,68],fR:[76,72]} },
  leg_extension:  { start:{head:[48,14],sho:[48,24],hip:[48,58],eL:[38,32],hL:[34,42],eR:[58,32],hR:[62,42],kL:[48,82],fL:[48,82],kR:[48,82],fR:[78,106]}, end:{head:[48,14],sho:[48,24],hip:[48,58],eL:[38,32],hL:[34,42],eR:[58,32],hR:[62,42],kL:[48,82],fL:[48,82],kR:[48,82],fR:[94,80]} },
  lunge:          { start:{head:[60,12],sho:[60,22],hip:[60,56],eL:[50,32],hL:[46,44],eR:[70,32],hR:[74,44],kL:[52,80],fL:[48,106],kR:[68,80],fR:[72,106]}, end:{head:[56,18],sho:[56,28],hip:[58,62],eL:[46,38],hL:[42,50],eR:[66,38],hR:[70,50],kL:[36,76],fL:[28,104],kR:[76,66],fR:[90,76]} },
  leg_curl:       { start:{head:[28,50],sho:[36,54],hip:[54,58],eL:[36,62],hL:[32,70],eR:[36,46],hR:[32,38],kL:[80,56],fL:[104,56],kR:[80,56],fR:[104,56]}, end:{head:[28,50],sho:[36,54],hip:[54,58],eL:[36,62],hL:[32,70],eR:[36,46],hR:[32,38],kL:[80,56],fL:[92,80],kR:[80,56],fR:[92,80]} },
  calf:           { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[50,32],hL:[46,44],eR:[70,32],hR:[74,44],kL:[54,82],fL:[50,108],kR:[66,82],fR:[70,108]}, end:{head:[60,10],sho:[60,20],hip:[60,56],eL:[50,28],hL:[46,40],eR:[70,28],hR:[74,40],kL:[54,78],fL:[52,100],kR:[66,78],fR:[68,100]} },
  plank:          { start:{head:[22,66],sho:[34,68],hip:[68,68],eL:[34,80],hL:[34,90],eR:[34,56],hR:[34,46],kL:[90,74],fL:[108,78],kR:[90,62],fR:[108,58]}, end:{head:[22,66],sho:[34,68],hip:[68,68],eL:[34,80],hL:[34,90],eR:[34,56],hR:[34,46],kL:[90,74],fL:[108,78],kR:[90,62],fR:[108,58]} },
  pulldown:       { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[38,14],hL:[28,6],eR:[82,14],hR:[92,6],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110],bar:[28,4,92,4]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[44,30],hL:[40,42],eR:[76,30],hR:[80,42],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110],bar:[40,40,80,40]} },
  row:            { start:{head:[26,46],sho:[36,50],hip:[58,54],eL:[38,56],hL:[58,62],eR:[38,44],hR:[58,38],kL:[80,66],fL:[100,74],kR:[80,44],fR:[100,36]}, end:{head:[26,46],sho:[36,50],hip:[58,54],eL:[28,52],hL:[18,56],eR:[28,44],hR:[18,40],kL:[80,66],fL:[100,74],kR:[80,44],fR:[100,36]} },
  face_pull:      { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[38,28],hL:[60,24],eR:[82,28],hR:[60,24],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[36,28],hL:[26,20],eR:[84,28],hR:[94,20],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]} },
  curl:           { start:{head:[60,14],sho:[60,24],hip:[60,60],eL:[50,40],hL:[46,56],eR:[70,40],hR:[74,56],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]}, end:{head:[60,14],sho:[60,24],hip:[60,60],eL:[50,40],hL:[52,24],eR:[70,40],hR:[68,24],kL:[52,85],fL:[48,110],kR:[68,85],fR:[72,110]} },
  hinge:          { start:{head:[60,12],sho:[60,22],hip:[60,56],eL:[50,32],hL:[46,44],eR:[70,32],hR:[74,44],kL:[52,80],fL:[48,106],kR:[68,80],fR:[72,106]}, end:{head:[38,38],sho:[46,42],hip:[62,54],eL:[42,52],hL:[44,64],eR:[42,38],hR:[44,64],kL:[56,78],fL:[48,106],kR:[68,78],fR:[72,106]} },
  hip_thrust:     { start:{head:[22,76],sho:[34,74],hip:[58,84],eL:[34,84],hL:[28,96],eR:[34,64],hR:[28,52],kL:[82,76],fL:[82,102],kR:[82,76],fR:[82,102]}, end:{head:[22,76],sho:[34,74],hip:[58,64],eL:[34,84],hL:[28,96],eR:[34,64],hR:[28,52],kL:[82,76],fL:[82,102],kR:[82,76],fR:[82,102]} },
  leg_raise:      { start:{head:[22,58],sho:[34,60],hip:[58,64],eL:[34,72],hL:[34,84],eR:[34,48],hR:[34,36],kL:[84,74],fL:[106,80],kR:[84,56],fR:[106,50]}, end:{head:[22,58],sho:[34,60],hip:[58,64],eL:[34,72],hL:[34,84],eR:[34,48],hR:[34,36],kL:[76,42],fL:[92,26],kR:[76,42],fR:[92,26]} },
};

function Figure({ pose, phase }) {
  const P=POSES[pose]||POSES.press_chest; const f=P[phase];
  return (
    <svg viewBox="0 0 120 115" width="100%" height="100%">
      <circle cx={f.head[0]} cy={f.head[1]} r="8" fill="none" stroke={C.fig} strokeWidth="2.5"/>
      <line x1={f.head[0]} y1={f.head[1]+8} x2={f.sho[0]} y2={f.sho[1]} stroke={C.fig} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.sho[0]} y1={f.sho[1]} x2={f.hip[0]} y2={f.hip[1]} stroke={C.fig} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.sho[0]} y1={f.sho[1]} x2={f.eL[0]} y2={f.eL[1]} stroke={C.acc} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.eL[0]} y1={f.eL[1]} x2={f.hL[0]} y2={f.hL[1]} stroke={C.acc} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.sho[0]} y1={f.sho[1]} x2={f.eR[0]} y2={f.eR[1]} stroke={C.acc} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.eR[0]} y1={f.eR[1]} x2={f.hR[0]} y2={f.hR[1]} stroke={C.acc} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.hip[0]} y1={f.hip[1]} x2={f.kL[0]} y2={f.kL[1]} stroke={C.fig} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.kL[0]} y1={f.kL[1]} x2={f.fL[0]} y2={f.fL[1]} stroke={C.fig} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.hip[0]} y1={f.hip[1]} x2={f.kR[0]} y2={f.kR[1]} stroke={C.fig} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={f.kR[0]} y1={f.kR[1]} x2={f.fR[0]} y2={f.fR[1]} stroke={C.fig} strokeWidth="2.5" strokeLinecap="round"/>
      {f.bar&&<line x1={f.bar[0]} y1={f.bar[1]} x2={f.bar[2]} y2={f.bar[3]} stroke="#0a7a44" strokeWidth="4" strokeLinecap="round"/>}
    </svg>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

const ANAMNESIS_INIT = { name:"",age:"",height:"",weight:"",goals:[],level:"",daysPerWeek:"",duration:"",equipment:"",injuries:"",conditions:"" };
const PHOTOS_INIT = { front:null, back:null, side:null };

export default function App() {
  const [screen, setScreen]   = useState("boot");
  const [showSettings, setShowSettings] = useState(false);
  const [plan,   setPlan]     = useState(null);
  const [history, setHistory] = useState([]);

  // anamnese / IA
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState(ANAMNESIS_INIT);
  const [generating, setGen]      = useState(false);
  const [genError, setGenError]   = useState(null);
  const [photos, setPhotos]       = useState(PHOTOS_INIT);
  const [bodyAnalysis, setBodyAnalysis] = useState(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [bodyHistory, setBodyHistory] = useState([]);
  const [rePhotos, setRePhotos] = useState(PHOTOS_INIT);
  const [reBusy, setReBusy] = useState(false);
  const [reErr, setReErr] = useState(null);

  // construtor manual
  const [selectedSplit, setSelectedSplit]   = useState(null);  // chave de SPLITS
  const [dayExercises, setDayExercises]     = useState({});    // {dayId: [exercise...]}
  const [editingDayId, setEditingDayId]     = useState(null);
  const [manualUserName, setManualUserName] = useState("");

  // treino
  const [cardioChoice, setCardioChoice] = useState(null);
  const [queue, setQueue]               = useState([]);
  const [completed, setCompleted]       = useState([]);
  const [setIdx, setSetIdx]             = useState(0);
  const [currentWeights, setCurrentWeights] = useState({});
  const [weightInput, setWeightInput]   = useState("");
  const [currentDay, setCurrentDay]     = useState(null);
  const [showSubs, setShowSubs]         = useState(false);

  // timers
  const [seriesElapsed, setSeriesElapsed] = useState(0);
  const [seriesRunning, setSeriesRunning] = useState(false);
  const [isoSec, setIsoSec]       = useState(0);
  const [isoTotal, setIsoTotal]   = useState(0);
  const [isoRunning, setIsoRunning] = useState(false);
  const [isoDone, setIsoDone]     = useState(false);
  const [restSec, setRestSec]     = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [report, setReport]       = useState(null);

  const seriesRef=useRef(null), isoRef=useRef(null), restRef=useRef(null);

  const [user, setUser] = useState(null);

  useEffect(()=>{
    (async () => {
      if (AUTH_ENABLED) {
        handleOAuthCallback(); // captura tokens do Google se vier de redirect
        const u = await authGetUser();
        if (u) setUser(u);
        else if (!localStorage.getItem("abody:skipauth")) { setScreen("auth"); return; }
      }
      track("app_aberto"); const [p, h, bh] = await Promise.all([loadStorage("abody:plan"), loadStorage("abody:history"), loadStorage("abody:bodyhistory")]);
      if (h) setHistory(h);
      if (bh) setBodyHistory(bh);
      if (p) { setPlan(p); setScreen("home"); } else setScreen("onboarding");
    })();
  },[]);

  const afterAuth = async () => {
    const u = await authGetUser();
    setUser(u);
    const [p, h] = await Promise.all([loadStorage("abody:plan"), loadStorage("abody:history")]);
    if (h) setHistory(h);
    if (p) { setPlan(p); setScreen("home"); } else setScreen("onboarding");
  };

  const skipAuth = async () => {
    localStorage.setItem("abody:skipauth", "1");
    const [p, h] = await Promise.all([loadStorage("abody:plan"), loadStorage("abody:history")]);
    if (h) setHistory(h);
    if (p) { setPlan(p); setScreen("home"); } else setScreen("onboarding");
  };

  const doLogout = () => {
    authSignOut();
    localStorage.removeItem("abody:skipauth");
    setUser(null);
    setScreen("auth");
  };

  useEffect(()=>{ if(seriesRunning){seriesRef.current=setInterval(()=>setSeriesElapsed(s=>s+1),1000);}else clearInterval(seriesRef.current); return()=>clearInterval(seriesRef.current); },[seriesRunning]);
  useEffect(()=>{ if(isoRunning&&isoSec>0){isoRef.current=setInterval(()=>{setIsoSec(s=>{if(s<=1){clearInterval(isoRef.current);setIsoRunning(false);setIsoDone(true);return 0;}return s-1;});},1000);}else clearInterval(isoRef.current); return()=>clearInterval(isoRef.current); },[isoRunning]);
  useEffect(()=>{
    if(screen==="rest"&&restSec>0){restRef.current=setInterval(()=>{setRestSec(s=>{if(s<=1){clearInterval(restRef.current);advanceAfterRest();return 0;}return s-1;});},1000);}
    return()=>clearInterval(restRef.current);
  },[screen,restSec===restTotal]);

  // ── PLANO VIA IA ──────────────────────────────────────────────────────────

  const analyzeBodyPhotos = async (photosData) => {
    const imageBlocks = [];
    if(photosData.front) {
      imageBlocks.push({type:"image",source:{type:"base64",media_type:photosData.front.type,data:photosData.front.data}});
      imageBlocks.push({type:"text",text:"Imagem 1: FRENTE"});
    }
    if(photosData.back) {
      imageBlocks.push({type:"image",source:{type:"base64",media_type:photosData.back.type,data:photosData.back.data}});
      imageBlocks.push({type:"text",text:"Imagem 2: COSTAS"});
    }
    if(photosData.side) {
      imageBlocks.push({type:"image",source:{type:"base64",media_type:photosData.side.type,data:photosData.side.data}});
      imageBlocks.push({type:"text",text:"Imagem 3: LATERAL"});
    }
    const analysisPrompt =
      "Você é uma API JSON. Analise a composição corporal nas fotos (frente/costas/lateral em roupa de banho). " +
      "Perfil: " + form.age + " anos, " + form.height + "cm, " + form.weight + "kg. " +
      "IMPORTANTE: Responda SOMENTE com um objeto JSON válido usando aspas duplas. " +
      "Sem markdown, sem explicação, sem texto fora do JSON. " +
      'Exemplo exato do formato: {"strongPoints":["peitoral desenvolvido"],"weakPoints":["posterior fraco"],"postureNotes":["ombros anteriorizados"],"muscleImbalances":["assimetria lateral"],"overallAnalysis":"Análise em uma frase."}';
    imageBlocks.push({type:"text", text: analysisPrompt});
    const data = await callClaude({
      model:"claude-sonnet-4-6",
      max_tokens:2000,
      messages:[{role:"user", content:imageBlocks}]
    });
    const raw = data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
    return extractJSON(raw);
  };

  const generatePlan = async () => {
    setGen(true); setGenError(null); setScreen("generating");
    const goalsText = form.goals.map(g=>GOALS.find(x=>x.id===g)?.label||g).join(", ");

    // Restringe o plano aos exercícios com card visual na biblioteca
    let libraryText = "";
    try {
      const lib = await fetchBiblioteca();
      const porGrupo = {};
      lib.forEach(e=>{ (porGrupo[e.grupo_muscular] = porGrupo[e.grupo_muscular]||[]).push(e.nome); });
      libraryText = "\n\nEXERCÍCIOS DISPONÍVEIS (use APENAS estes, com o nome EXATAMENTE como escrito):\n"
        + Object.entries(porGrupo).map(([g,ns])=>`${g}: ${ns.join("; ")}`).join("\n");
    } catch(e) { console.warn("Biblioteca indisponível, plano sem restrição:", e.message); }

    let bodyAnalysisText = "";
    if((photos.front || photos.back || photos.side) && !form.photoConsent) {
      setGen(false); setScreen("anamnesis");
      setGenError("Para usar as fotos, marque a autorização de análise. Ou remova as fotos para gerar sem análise corporal.");
      return;
    }
    if(photos.front || photos.back || photos.side) {
      try {
        setPhotoAnalyzing(true);
        const analysis = await analyzeBodyPhotos(photos);
        setBodyAnalysis(analysis);
        // Persistir no histórico de avaliações
        const prevBody = (await loadStorage("abody:bodyhistory")) || [];
        const newBodyHist = [...prevBody, { date: todayISO(), analysis }];
        await saveStorage("abody:bodyhistory", newBodyHist);
        setBodyHistory(newBodyHist);
        bodyAnalysisText = `\n\nANÁLISE CORPORAL POR FOTOS:\n- Pontos fortes: ${analysis.strongPoints?.join(", ")||"N/A"}\n- Pontos fracos: ${analysis.weakPoints?.join(", ")||"N/A"}\n- Postura: ${analysis.postureNotes?.join(", ")||"N/A"}\n- Desequilíbrios: ${analysis.muscleImbalances?.join(", ")||"N/A"}\n- Análise geral: ${analysis.overallAnalysis||""}\n\nCONSIDERE ESTA ANÁLISE NA PRIORIZAÇÃO DOS GRUPOS MUSCULARES DO PLANO.`;
        setPhotoAnalyzing(false);
      } catch(e) { setPhotoAnalyzing(false); bodyAnalysisText = ""; console.warn("Body analysis failed:", e.message); }
    }

    const prompt = `Você é uma API JSON de personal trainer. Retorne APENAS um objeto JSON válido com aspas duplas. Sem markdown, sem texto fora do JSON, sem explicação.

Crie plano de treino com os dados abaixo:

PERFIL:
- Nome: ${form.name} | Idade: ${form.age}a | Altura: ${form.height}cm | Peso: ${form.weight}kg
- Objetivos: ${goalsText}
- Nível: ${form.level}
- Dias/semana: ${form.daysPerWeek} | Duração: ${form.duration}
- Equipamentos: ${form.equipment}
- Lesões/Limitações: ${form.injuries||"Nenhuma"}
- Condições médicas: ${form.conditions||"Nenhuma"}${bodyAnalysisText}${libraryText}

Retorne SOMENTE JSON válido sem markdown:
{"planName":"X","planDescription":"Y","weekDays":[{"id":"d1","label":"A","sub":"B","exercises":[{"id":"e1","name":"N","sets":3,"reps":"8-12","rest":60,"isometric":false,"isoSeconds":null}],"mobility":[{"name":"M","duration":"D"}],"postCardio":{"text":"T","minMinutes":10,"maxMinutes":15,"intensity":"Leve"}}]}

REGRAS: exatamente ${form.daysPerWeek} dias. Max 5 exercícios/dia. Se houver lista de EXERCÍCIOS DISPONÍVEIS, todo exercise.name DEVE ser copiado literalmente dela (proibido inventar variações). Max 2 mobilidades/dia. IDs curtos (d1,d2/e1,e2). Nomes curtos em pt-BR. postCardio.text máximo 5 palavras. planDescription máximo 10 palavras. SEJA MINIMALISTA.`;

    try {
      const data = await callClaude({
        model:"claude-sonnet-4-6",
        max_tokens:8192,
        messages:[{role:"user",content:prompt}]
      });
      const rawPlan=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      const aiPlan=extractJSON(rawPlan);
      const converted=convertAIPlan(aiPlan,form.name);
      track("plano_ia_gerado",{dias:converted?.weekDays?.length}); setPlan(converted); await saveStorage("abody:plan",converted); setScreen("planPreview");
    } catch(err){ setGenError(err.message||"Erro ao gerar plano."); setScreen("anamnesis"); }
    setGen(false);
  };

  // ── PLANO MANUAL ──────────────────────────────────────────────────────────

  const saveManualPlan = async () => { track("plano_manual_salvo");
    const split = SPLITS[selectedSplit];
    const p = buildManualPlan(manualUserName, split.days, dayExercises);
    setPlan(p); await saveStorage("abody:plan",p); setScreen("planPreview");
  };

  const addExerciseToDay = (dayId, ex) => {
    setDayExercises(prev=>{
      const list=prev[dayId]||[];
      if(list.find(e=>e.id===ex.id)) return prev;
      return {...prev,[dayId]:[...list,{...ex,_key:uid()}]};
    });
  };

  const removeExerciseFromDay = (dayId, exId) => {
    setDayExercises(prev=>({...prev,[dayId]:(prev[dayId]||[]).filter(e=>e.id!==exId)}));
  };

  const updateExerciseInDay = (dayId, exId, field, value) => {
    setDayExercises(prev=>({...prev,[dayId]:(prev[dayId]||[]).map(e=>e.id===exId?{...e,[field]:value}:e)}));
  };

  const resetPlan = async () => { await saveStorage("abody:plan",null); setPlan(null); setForm(ANAMNESIS_INIT); setPhotos(PHOTOS_INIT); setBodyAnalysis(null); setStep(1); setSelectedSplit(null); setDayExercises({}); setScreen("onboarding"); };

  // ── TREINO ────────────────────────────────────────────────────────────────

  const initTimer=(ex)=>{ setSeriesElapsed(0); if(ex.iso){setIsoTotal(ex.isoSec||45);setIsoSec(ex.isoSec||45);setIsoRunning(false);setIsoDone(false);setSeriesRunning(false);}else{setSeriesRunning(true);setIsoRunning(false);setIsoDone(false);}};
  const startDay=(dayObj)=>{ const exercises=dayObj.exercises.map(ex=>({...ex,_key:uid(),_skipped:false})); setCurrentDay(dayObj);setQueue(exercises);setCompleted([]);setSetIdx(0);setCurrentWeights({});setWeightInput("");setCardioChoice(null);setScreen("warmup"); };
  const beginWorkout=()=>{ track("treino_iniciado"); initTimer(queue[0]); setScreen("workout"); };
  const skipExercise=()=>{ if(queue.length<=1)return; const[cur,next,...rest]=queue; setQueue([next,{...cur,_skipped:true},...rest]); setSetIdx(0);setWeightInput("");initTimer(next); };
  const substituteExercise=(newEx)=>{ const[cur,...rest]=queue; setQueue([{...newEx,_key:uid(),_skipped:cur._skipped,_substitutedFor:cur.name},...rest]); setSetIdx(0);setWeightInput("");initTimer(newEx);setShowSubs(false); };

  const completeSet=()=>{
    const cur=queue[0]; if(!cur)return;
    let value=cur.iso?(isoTotal-isoSec||isoTotal):parseFloat(weightInput.replace(",","."));
    if(!cur.iso&&(isNaN(value)||value<=0))return;
    setSeriesRunning(false);setIsoRunning(false);
    const updW={...currentWeights}; const arr=[...(updW[cur._key]||[])]; arr[setIdx]=value; updW[cur._key]=arr; setCurrentWeights(updW);
    if(setIdx+1>=cur.sets){ const[done,...rest]=queue; const nc=[...completed,{id:done.id,name:done.name,sets:done.sets,iso:done.iso,weights:[...arr],skipped:done._skipped,substitutedFor:done._substitutedFor}]; setCompleted(nc); if(rest.length===0){finishWorkout(updW,nc);return;} setQueue(rest);setSetIdx(0);setWeightInput("");setRestTotal(done.rest);setRestSec(done.rest);setScreen("rest"); }
    else { setRestTotal(cur.rest);setRestSec(cur.rest);setSetIdx(setIdx+1);setScreen("rest"); }
  };

  const advanceAfterRest=()=>{ setWeightInput("");initTimer(queue[0]);setScreen("workout"); };
  const skipRest=()=>{ clearInterval(restRef.current);advanceAfterRest(); };

  const finishWorkout=async(wData,compData)=>{ const session={dayId:currentDay.id,dayLabel:currentDay.label,date:todayISO(),completed:compData||completed}; const newH=[...history,session]; setHistory(newH);await saveStorage("abody:history",newH);buildReport(newH);track("treino_concluido"),setScreen("postcardio"); };

  const buildReport=(fullH)=>{ const dId=currentDay.id; const sessions=fullH.filter(s=>s.dayId===dId); const cur=sessions[sessions.length-1],prev=sessions[sessions.length-2]||null; const rows=(cur.completed||[]).map(ex=>{ const cv=ex.weights.reduce((a,b)=>a+b,0),cm=ex.weights.length?Math.max(...ex.weights):0; let diffPct=null; if(prev){const pEx=prev.completed?.find(e=>e.id===ex.id||e.name===ex.name);if(pEx){const pv=pEx.weights.reduce((a,b)=>a+b,0);if(pv>0)diffPct=((cv-pv)/pv)*100;}} return{name:ex.name,curVolume:cv,curMax:cm,diffPct,iso:ex.iso}; }); const wd=rows.filter(r=>r.diffPct!=null); setReport({dayLabel:currentDay.label,rows,hasPrev:!!prev,strongest:wd.length?wd.reduce((a,b)=>b.diffPct>a.diffPct?b:a):null,weakest:wd.length?wd.reduce((a,b)=>b.diffPct<a.diffPct?b:a):null}); };


  // Reavaliação corporal comparativa (habilitada 30 dias após a última)
  const runReassessment = async () => {
    setReBusy(true); setReErr(null);
    try {
      const last = bodyHistory[bodyHistory.length - 1];
      const imageBlocks = [];
      if (rePhotos.front) { imageBlocks.push({type:"image",source:{type:"base64",media_type:rePhotos.front.type,data:rePhotos.front.data}}); imageBlocks.push({type:"text",text:"Imagem 1: FRENTE"}); }
      if (rePhotos.back)  { imageBlocks.push({type:"image",source:{type:"base64",media_type:rePhotos.back.type,data:rePhotos.back.data}});  imageBlocks.push({type:"text",text:"Imagem 2: COSTAS"}); }
      if (rePhotos.side)  { imageBlocks.push({type:"image",source:{type:"base64",media_type:rePhotos.side.type,data:rePhotos.side.data}});  imageBlocks.push({type:"text",text:"Imagem 3: LATERAL"}); }
      const prevSummary = last ? JSON.stringify(last.analysis) : "nenhuma";
      imageBlocks.push({type:"text", text:
        "Você é uma API JSON. Analise a composição corporal nas fotos e COMPARE com a avaliação anterior de " +
        (last ? new Date(last.date).toLocaleDateString("pt-BR") : "") + ": " + prevSummary + ". " +
        "Responda SOMENTE com JSON de aspas duplas, sem markdown: " +
        '{"strongPoints":["..."],"weakPoints":["..."],"postureNotes":["..."],"muscleImbalances":["..."],"overallAnalysis":"...",' +
        '"comparison":{"improvements":["melhora observada"],"attentionPoints":["ponto que regrediu ou estagnou"],"summary":"resumo da evolução em 2 frases"}}'
      });
      const data = await callClaude({ model:"claude-sonnet-4-6", max_tokens:2000, messages:[{role:"user",content:imageBlocks}] });
      const raw = data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      const analysis = extractJSON(raw);
      const newHist = [...bodyHistory, { date: todayISO(), analysis }];
      setBodyHistory(newHist);
      await saveStorage("abody:bodyhistory", newHist);
      setRePhotos(PHOTOS_INIT);
      setScreen("bodyReport");
    } catch(e) { setReErr(e.message); }
    setReBusy(false);
  };

  const goHome=()=>{ setScreen("home");setCurrentDay(null);setReport(null);setSeriesRunning(false);setIsoRunning(false); };
  const current=queue[0]||null;

  if(screen==="boot") return <div style={S.page}><p style={{color:C.acc,marginTop:80,fontFamily:"sans-serif"}}>Carregando…</p></div>;

  return (
    <div style={S.page}><style>{CSS}</style>
      {screen==="auth"         && <AuthScreen onDone={afterAuth} onSkip={skipAuth}/>}
      {screen==="onboarding"   && <OnboardingScreen onStart={()=>setScreen("modeSelect")}/>}
      {screen==="modeSelect"   && <ModeSelectScreen onAI={()=>{ if(AUTH_ENABLED && !getSession()){ localStorage.removeItem("abody:skipauth"); setScreen("auth"); return; } track("ia_flow_iniciado"); setForm({...ANAMNESIS_INIT,name:""});setStep(1);setScreen("anamnesis");}} onManual={()=>setScreen("splitSelect")}/>}
      {screen==="anamnesis"    && <AnamnesisScreen step={step} form={form} setForm={setForm} setStep={setStep} photos={photos} setPhotos={setPhotos} onSubmit={generatePlan} error={genError} setError={setGenError}/>}
      {screen==="generating"   && <GeneratingScreen name={form.name} photoAnalyzing={photoAnalyzing}/>}
      {screen==="splitSelect"  && <SplitSelectScreen onSelect={(k)=>{setSelectedSplit(k);setDayExercises({});setScreen("dayBuilder");}} onBack={()=>setScreen("modeSelect")}/>}
      {screen==="dayBuilder"   && selectedSplit && (
        <DayBuilderScreen
          split={SPLITS[selectedSplit]} dayExercises={dayExercises}
          userName={manualUserName} setUserName={setManualUserName}
          onAdd={addExerciseToDay} onRemove={removeExerciseFromDay} onUpdate={updateExerciseInDay}
          editingDayId={editingDayId} setEditingDayId={setEditingDayId}
          onSave={saveManualPlan} onBack={()=>setScreen("splitSelect")}
        />
      )}
      {screen==="planPreview"  && plan && <PlanPreviewScreen plan={plan} bodyAnalysis={bodyAnalysis} onStart={()=>setScreen("home")}/>}
      {screen==="home"         && plan && <HomeScreen plan={plan} history={history} onStart={startDay} onReset={resetPlan} onSettings={()=>setShowSettings(true)} onBodyReport={()=>setScreen("bodyReport")} onCalendar={()=>setScreen("calendar")} onLibrary={()=>{track("biblioteca_aberta");setScreen("library");}} hasBody={bodyHistory.length>0}/>}
      {showSettings && <SettingsModal onClose={()=>setShowSettings(false)} user={user} onLogout={()=>{setShowSettings(false); doLogout();}}/>}
      {screen==="warmup"       && currentDay && <WarmupScreen day={currentDay} cardioChoice={cardioChoice} setCardioChoice={setCardioChoice} onContinue={beginWorkout} onBack={goHome}/>}
      {screen==="workout"      && currentDay && current && (<>
        <WorkoutScreen day={currentDay} exercise={current} setIdx={setIdx} queue={queue} completed={completed} weightInput={weightInput} setWeightInput={setWeightInput} elapsed={seriesElapsed} running={seriesRunning} isoSec={isoSec} isoTotal={isoTotal} isoRunning={isoRunning} isoDone={isoDone} onStartIso={()=>{setIsoRunning(true);setIsoDone(false);}} onPauseIso={()=>setIsoRunning(false)} onComplete={completeSet} onSkip={skipExercise} onShowSubs={()=>setShowSubs(true)} canSkip={queue.length>1} onBack={goHome}/>
        {showSubs&&<SubModal exercise={current} onSelect={substituteExercise} onClose={()=>setShowSubs(false)}/>}
      </>)}
      {screen==="rest"         && <RestScreen seconds={restSec} total={restTotal} onSkip={skipRest} queue={queue} completed={completed}/>}
      {screen==="bodyReport"   && <BodyReportScreen bodyHistory={bodyHistory} onBack={goHome} onReassess={()=>{setRePhotos(PHOTOS_INIT);setReErr(null);setScreen("reassess");}}/>}
      {screen==="reassess"     && <ReassessScreen photos={rePhotos} setPhotos={setRePhotos} busy={reBusy} err={reErr} onRun={runReassessment} onBack={()=>setScreen("bodyReport")}/>}
      {screen==="calendar"     && <CalendarScreen history={history} onBack={goHome}/>}
      {screen==="library"      && <LibraryScreen onBack={goHome}/>}
      {screen==="postcardio"   && currentDay && <PostCardioScreen day={currentDay} onContinue={()=>setScreen("report")}/>}
      {screen==="report"       && report && <ReportScreen report={report} onHome={goHome}/>}
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────


// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────

function AuthScreen({ onDone, onSkip }) {
  const [mode, setMode]   = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState(null);
  const [info,  setInfo]  = useState(null);

  const submit = async () => {
    setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === "signup") {
        const d = await authSignUp(email.trim(), pass);
        if (d.access_token) { onDone(); }
        else setInfo("Conta criada! Verifique seu e-mail para confirmar e depois faça login.");
      } else {
        await authSignIn(email.trim(), pass);
        onDone();
      }
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{...S.box, paddingTop: 40}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:32}}>
        <div style={{...S.logo,width:56,height:56,fontSize:26,borderRadius:16,marginBottom:14}}>A</div>
        <div style={S.brand}>A-BODY</div>
      </div>

      <h1 style={{...S.h1,fontSize:24}}>{mode==="login" ? "Entrar" : "Criar conta"}</h1>
      <p style={S.sub}>Seus treinos ficam salvos na nuvem e acessíveis de qualquer aparelho.</p>

      <button style={{...S.card, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16, fontWeight:600, fontSize:14, color:C.text}} onClick={authSignInGoogle}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8H6.1l-6.5 5C6.9 39.6 14.8 44 24 44z" transform="translate(6.5,0) scale(0.87)"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.3 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
        Continuar com Google
      </button>

      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{flex:1,height:1,background:C.border}}/>
        <span style={{fontSize:11,color:C.muted}}>ou com e-mail</span>
        <div style={{flex:1,height:1,background:C.border}}/>
      </div>

      <label style={S.fieldLabel}>E-MAIL</label>
      <input style={S.field} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email"/>
      <label style={S.fieldLabel}>SENHA</label>
      <input style={S.field} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="mínimo 6 caracteres" autoComplete={mode==="login"?"current-password":"new-password"}/>

      {err  && <div style={{background:"#2a0a0a",border:"1px solid #8b2a2a",borderRadius:12,padding:"11px 14px",fontSize:13,color:"#ff8080",marginTop:12}}>{err}</div>}
      {info && <div style={{background:"#0d2a18",border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.acc,marginTop:12}}>{info}</div>}

      <button style={{...S.btn,marginTop:18,opacity:(email&&pass.length>=6&&!busy)?1:0.4}} disabled={!email||pass.length<6||busy} onClick={submit}>
        {busy ? "Aguarde…" : (mode==="login" ? "Entrar" : "Criar conta")}
      </button>

      <button style={{background:"none",border:"none",color:C.acc,fontSize:13,fontWeight:600,marginTop:16,width:"100%",textAlign:"center"}}
        onClick={()=>{setMode(mode==="login"?"signup":"login");setErr(null);setInfo(null);}}>
        {mode==="login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>

      <button style={{...S.btnOutline,marginTop:20,fontSize:13}} onClick={onSkip}>
        Continuar sem conta (dados só neste aparelho)
      </button>
    </div>
  );
}

function OnboardingScreen({ onStart }) {
  return (
    <div style={{...S.box,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:60,textAlign:"center"}}>
      <div style={{...S.logo,width:64,height:64,fontSize:32,borderRadius:18,marginBottom:24}}>A</div>
      <div style={S.brand}>A-BODY</div>
      <div style={{fontSize:12,color:C.muted,letterSpacing:"0.12em",marginBottom:48}}>PERSONAL AI TRAINER</div>
      <h1 style={{...S.h1,fontSize:28,marginBottom:12}}>Seu treino começa aqui</h1>
      <p style={{...S.sub,maxWidth:300,marginBottom:48}}>Crie um plano 100% personalizado — com a ajuda da IA ou montando você mesmo.</p>
      <button style={S.btn} onClick={onStart}>Começar →</button>
    </div>
  );
}

// ─── SELEÇÃO DE MODO ─────────────────────────────────────────────────────────

function ModeSelectScreen({ onAI, onManual }) {
  return (
    <div style={S.box}>
      <div style={S.brandRow}><div style={S.logo}>A</div><span style={S.brand}>A-BODY</span></div>
      <div style={S.eyebrow}>CRIAR PLANO DE TREINO</div>
      <h1 style={S.h1}>Como prefere montar seu treino?</h1>
      <p style={S.sub}>Escolha a opção que faz mais sentido para você.</p>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <button style={{...S.card,border:`1px solid ${C.acc}`,gap:10,textAlign:"left"}} onClick={onAI}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:32}}>🤖</div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>Montar com Inteligência Artificial</div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.4}}>Responda uma anamnese e a IA cria um plano 100% adaptado ao seu perfil, objetivos e limitações.</div>
            </div>
          </div>
          <div style={{textAlign:"right",color:C.acc,fontSize:13,fontWeight:600,marginTop:4}}>Recomendado →</div>
        </button>
        <button style={{...S.card,gap:10,textAlign:"left"}} onClick={onManual}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:32}}>🏋️</div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>Montar meu próprio treino</div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.4}}>Escolha o tipo de divisão (Upper/Lower, PPL, Full Body…) e selecione seus próprios exercícios.</div>
            </div>
          </div>
          <div style={{textAlign:"right",color:C.muted,fontSize:13,marginTop:4}}>Personalizado →</div>
        </button>
      </div>
    </div>
  );
}

// ─── ANAMNESE ─────────────────────────────────────────────────────────────────

function AnamnesisScreen({ step, form, setForm, setStep, photos, setPhotos, onSubmit, error, setError }) {
  const set=(k,v)=>{ setForm(f=>({...f,[k]:v})); if(error)setError(null); };
  const toggleGoal=(gid)=>{ const cur=form.goals||[]; set("goals",cur.includes(gid)?cur.filter(x=>x!==gid):[...cur,gid]); };
  const s1ok=form.name&&form.age&&form.height&&form.weight;
  const s2ok=(form.goals||[]).length>0&&form.level;
  const s3ok=form.daysPerWeek&&form.duration&&form.equipment;
  const s5ok = true; // fotos são opcionais
  const canNext=[null,s1ok,s2ok,s3ok,true,s5ok][step];
  return (
    <div style={S.box}>
      <div style={S.brandRow}><div style={S.logo}>A</div><span style={S.brand}>A-BODY</span></div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?C.acc:C.border,transition:"background .3s"}}/>)}
      </div>
      <div style={S.eyebrow}>ANAMNESE · ETAPA {step} DE 5</div>

      {step===1&&(<>
        <h1 style={S.h1}>Dados pessoais</h1>
        <label style={S.fieldLabel}>Nome</label>
        <input style={S.field} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Seu nome"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={S.fieldLabel}>Idade</label><input style={S.field} type="number" inputMode="numeric" value={form.age} onChange={e=>set("age",e.target.value)} placeholder="40"/></div>
          <div><label style={S.fieldLabel}>Peso (kg)</label><input style={S.field} type="number" inputMode="decimal" value={form.weight} onChange={e=>set("weight",e.target.value)} placeholder="80"/></div>
        </div>
        <label style={S.fieldLabel}>Altura (cm)</label>
        <input style={S.field} type="number" inputMode="numeric" value={form.height} onChange={e=>set("height",e.target.value)} placeholder="170"/>
      </>)}

      {step===2&&(<>
        <h1 style={S.h1}>Objetivos e nível</h1>
        <p style={S.sub}>Você pode selecionar mais de um objetivo.</p>
        <label style={S.fieldLabel}>OBJETIVOS (múltipla escolha)</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
          {GOALS.map(g=>{ const sel=(form.goals||[]).includes(g.id); return(
            <button key={g.id} style={{...S.card,alignItems:"center",...(sel?{border:`1.5px solid ${C.acc}`,background:"#102d20"}:{})}} onClick={()=>toggleGoal(g.id)}>
              <div style={{fontSize:24}}>{g.icon}</div>
              <div style={{fontSize:12,fontWeight:600,marginTop:6,color:C.text}}>{g.label}</div>
              {sel&&<div style={{fontSize:10,color:C.acc,marginTop:4}}>✓ selecionado</div>}
            </button>
          );})}
        </div>
        <label style={S.fieldLabel}>NÍVEL DE EXPERIÊNCIA</label>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {LEVELS.map(l=><button key={l.id} style={{...S.card,flexDirection:"row",alignItems:"center",justifyContent:"space-between",...(form.level===l.id?{border:`1.5px solid ${C.acc}`,background:"#102d20"}:{})}} onClick={()=>set("level",l.id)}><span style={{fontWeight:700,fontSize:14}}>{l.label}</span><span style={{fontSize:12,color:C.muted}}>{l.sub}</span></button>)}
        </div>
      </>)}

      {step===3&&(<>
        <h1 style={S.h1}>Disponibilidade</h1>
        <label style={S.fieldLabel}>DIAS POR SEMANA</label>
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          {["3","4","5","6"].map(d=><button key={d} style={{flex:1,...S.card,alignItems:"center",...(form.daysPerWeek===d?{border:`1.5px solid ${C.acc}`,background:"#102d20"}:{})}} onClick={()=>set("daysPerWeek",d)}><span style={{fontSize:20,fontWeight:800}}>{d}</span><span style={{fontSize:10,color:C.muted}}>dias</span></button>)}
        </div>
        <label style={S.fieldLabel}>DURAÇÃO DA SESSÃO</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
          {DURATION_OPTIONS.map(d=><button key={d} style={{...S.card,alignItems:"center",...(form.duration===d?{border:`1.5px solid ${C.acc}`,background:"#102d20"}:{})}} onClick={()=>set("duration",d)}><span style={{fontSize:14,fontWeight:700}}>{d}</span></button>)}
        </div>
        <label style={S.fieldLabel}>EQUIPAMENTOS</label>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {EQUIPMENT_OPTIONS.map(e=><button key={e.id} style={{...S.card,flexDirection:"row",alignItems:"center",...(form.equipment===e.id?{border:`1.5px solid ${C.acc}`,background:"#102d20"}:{})}} onClick={()=>set("equipment",e.id)}><span style={{fontSize:14,fontWeight:600}}>{e.label}</span></button>)}
        </div>
      </>)}

      {step===4&&(<>
        <h1 style={S.h1}>Saúde</h1>
        <p style={S.sub}>Informe limitações para personalizar seu plano com segurança. Campos opcionais.</p>
        <label style={S.fieldLabel}>LESÕES OU LIMITAÇÕES FÍSICAS</label>
        <textarea style={{...S.field,height:90,resize:"none"}} value={form.injuries} onChange={e=>set("injuries",e.target.value)} placeholder="Ex: dor no joelho, hérnia lombar… (ou deixe em branco)"/>
        <label style={S.fieldLabel}>CONDIÇÕES MÉDICAS RELEVANTES</label>
        <textarea style={{...S.field,height:80,resize:"none"}} value={form.conditions} onChange={e=>set("conditions",e.target.value)} placeholder="Ex: hipertensão, diabetes… (ou deixe em branco)"/>
        {error&&<div style={{background:"#2a0a0a",border:"1px solid #8b2a2a",borderRadius:12,padding:"12px 14px",fontSize:13,color:"#ff8080",marginTop:8}}>{error}</div>}
      </>)}

      {step===5&&(<>
        <h1 style={S.h1}>Análise corporal</h1>
        <p style={S.sub}>Envie fotos de roupa de banho para que a IA identifique seus pontos fortes e fracos e personalize seu plano. <b style={{color:C.acc}}>As fotos são processadas apenas pela IA e não são armazenadas.</b></p>
        <PhotoUploadStep photos={photos} setPhotos={setPhotos}/>
        <div style={{background:"#0d2218",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",fontSize:12,color:C.muted,marginTop:8}}>
          ℹ️ As fotos são opcionais. Sem elas, o plano será gerado apenas com base na anamnese.
        </div>
        {(photos.front||photos.back||photos.side)&&(
          <label style={{display:"flex",gap:10,alignItems:"flex-start",background:"#0d2218",border:`1px solid ${form.photoConsent?C.acc:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:12,color:C.text,marginTop:8,cursor:"pointer"}}>
            <input type="checkbox" checked={!!form.photoConsent} onChange={e=>setForm({...form,photoConsent:e.target.checked})} style={{marginTop:2}}/>
            <span>Autorizo o envio das minhas fotos para análise pela IA. Entendo que são <b>dados sensíveis de saúde</b> (LGPD), que serão usadas apenas para gerar minha análise corporal e <b>não serão armazenadas</b>.</span>
          </label>
        )}
        {error&&<div style={{background:"#2a0a0a",border:"1px solid #8b2a2a",borderRadius:12,padding:"12px 14px",fontSize:13,color:"#ff8080",marginTop:8}}>{error}</div>}
      </>)}

      <div style={{display:"flex",gap:10,marginTop:24}}>
        {step>1&&<button style={{...S.btnOutline,flex:1}} onClick={()=>setStep(s=>s-1)}>← Voltar</button>}
        {step<5?<button style={{...S.btn,flex:1,opacity:canNext?1:0.35}} disabled={!canNext} onClick={()=>setStep(s=>s+1)}>Continuar →</button>
               :<button style={{...S.btn,flex:1}} onClick={onSubmit}>Gerar meu plano ✨</button>}
      </div>
    </div>
  );
}

// ─── GENERATING ───────────────────────────────────────────────────────────────

function GeneratingScreen({ name, photoAnalyzing }) {
  const [dot,setDot]=useState(0); useEffect(()=>{const t=setInterval(()=>setDot(d=>(d+1)%4),500);return()=>clearInterval(t);},[]);
  const msgs=["Analisando seu perfil","Definindo grupos musculares","Calculando volume ideal","Montando periodização","Ajustando intensidade","Finalizando plano"];
  const [mi,setMi]=useState(0); useEffect(()=>{const t=setInterval(()=>setMi(i=>(i+1)%msgs.length),1800);return()=>clearInterval(t);},[]);
  return (
    <div style={{...S.box,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:80,textAlign:"center"}}>
      <div style={{...S.logo,width:60,height:60,fontSize:28,borderRadius:16,marginBottom:32}}>A</div>
      <h2 style={{...S.h1,marginBottom:8}}>Criando seu plano{".".repeat(dot+1)}</h2>
      <p style={{...S.sub}}>{name?"Aguarde, "+name:"Aguarde"} um momento</p>
      {photoAnalyzing&&<div style={{background:"#1a2f20",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 16px",fontSize:12,color:"#e8a23a",marginBottom:8}}>📸 Analisando suas fotos com IA…</div>}
      <div style={{marginTop:16,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 20px",fontSize:13,color:C.acc}}>{msgs[mi]}</div>
    </div>
  );
}

// ─── PHOTO UPLOAD STEP ───────────────────────────────────────────────────────

function PhotoUploadStep({ photos, setPhotos }) {
  const frontRef = useRef(null);
  const backRef  = useRef(null);
  const sideRef  = useRef(null);
  const refMap   = { front: frontRef, back: backRef, side: sideRef };

  const slots = [
    { key:"front", label:"Frente",  icon:"🧍" },
    { key:"back",  label:"Costas",  icon:"🔄" },
    { key:"side",  label:"Lateral", icon:"↔️" },
  ];

  const handleFile = (key, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Comprimir imagem via canvas: max 1024px, JPEG 80%
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        const data = dataUrl.split(",")[1];
        setPhotos(prev => ({...prev, [key]: {data, type: "image/jpeg", preview: dataUrl}}));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (key, e) => {
    e.stopPropagation();
    setPhotos(prev => ({...prev, [key]: null}));
  };

  return (
    <div style={{display:"flex", gap:10, marginBottom:8}}>
      {slots.map(s => {
        const photo = photos[s.key];
        const ref   = refMap[s.key];
        return (
          <div key={s.key} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6}}>
            {/* Input escondido corretamente — trigger via ref */}
            <input
              ref={ref}
              type="file"
              accept="image/*"
              style={{display:"none"}}
              onChange={e => handleFile(s.key, e)}
            />
            <div
              onClick={() => { if (!photo) ref.current && ref.current.click(); }}
              style={{
                width:"100%", aspectRatio:"3/4", borderRadius:14, overflow:"hidden",
                border:`2px dashed ${photo ? C.acc : C.border}`, background:C.card,
                display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", position:"relative",
                cursor: photo ? "default" : "pointer",
              }}
            >
              {photo ? (
                <>
                  <img src={photo.preview} alt={s.label}
                    style={{width:"100%", height:"100%", objectFit:"cover"}}/>
                  <button
                    onClick={e => removePhoto(s.key, e)}
                    style={{position:"absolute", top:4, right:4,
                      background:"rgba(0,0,0,0.75)", border:"none", color:"#fff",
                      borderRadius:"50%", width:24, height:24, fontSize:12,
                      cursor:"pointer", fontWeight:700,
                      display:"flex", alignItems:"center", justifyContent:"center"}}
                  >✕</button>
                </>
              ) : (
                <>
                  <div style={{fontSize:26, marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:10, color:C.muted, textAlign:"center", lineHeight:1.5}}>
                    Toque para<br/>enviar foto
                  </div>
                </>
              )}
            </div>
            <div style={{fontSize:11, fontWeight:600, color: photo ? C.acc : C.muted}}>
              {s.label}{photo ? " ✓" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SELEÇÃO DE SPLIT (treino manual) ────────────────────────────────────────

function SplitSelectScreen({ onSelect, onBack }) {
  return (
    <div style={S.box}>
      <div style={S.topRow}><button style={S.back} onClick={onBack}>← Voltar</button><div style={S.eyebrow}>TREINO MANUAL</div></div>
      <h1 style={S.h1}>Escolha a divisão</h1>
      <p style={S.sub}>Cada divisão organiza os grupos musculares de forma diferente.</p>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {Object.entries(SPLITS).map(([key,s])=>(
          <button key={key} style={{...S.card,flexDirection:"row",alignItems:"center",gap:14,textAlign:"left"}} onClick={()=>onSelect(key)}>
            <div style={{fontSize:28,flexShrink:0}}>{s.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:800,marginBottom:4}}>{s.label}</div>
              <div style={{fontSize:12,color:C.muted}}>{s.description}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{s.days.map(d=><span key={d.id} style={{fontSize:10,background:"#0d2218",borderRadius:6,padding:"2px 8px",color:C.muted}}>{d.label}</span>)}</div>
            </div>
            <span style={{color:C.acc,fontSize:18}}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CONSTRUTOR DE DIAS ───────────────────────────────────────────────────────

function DayBuilderScreen({ split, dayExercises, userName, setUserName, onAdd, onRemove, onUpdate, editingDayId, setEditingDayId, onSave, onBack }) {
  const [pickerDayId, setPickerDayId] = useState(null);
  const allDaysHaveExercises = split.days.every(d=>(dayExercises[d.id]||[]).length>=3);

  return (
    <div style={S.box}>
      <div style={S.topRow}><button style={S.back} onClick={onBack}>← Voltar</button><div style={S.eyebrow}>{split.label} · MONTAGEM</div></div>
      <h1 style={S.h1}>Monte seus treinos</h1>

      <label style={S.fieldLabel}>SEU NOME</label>
      <input style={{...S.field,marginBottom:20}} value={userName} onChange={e=>setUserName(e.target.value)} placeholder="Como quer ser chamado?"/>

      <p style={S.sub}>Adicione pelo menos 3 exercícios por dia.</p>

      {split.days.map(d=>{
        const exs=dayExercises[d.id]||[];
        const isEditing=editingDayId===d.id;
        return (
          <div key={d.id} style={{...S.card,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{d.label} <span style={{fontSize:11,color:exs.length>=3?C.acc:"#e8a23a",fontWeight:700}}>({exs.length} ex.)</span></div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{d.sub}</div>
              </div>
              <button style={{...S.btnOutline,width:"auto",padding:"6px 14px",fontSize:12}} onClick={()=>setEditingDayId(isEditing?null:d.id)}>
                {isEditing?"Fechar":"Editar"}
              </button>
            </div>

            {isEditing&&(<>
              {exs.map((ex,i)=>(
                <div key={ex._key||i} style={{background:"#0d2218",borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:600,flex:1}}>{ex.name}</div>
                    <button style={{background:"none",border:"none",color:"#e87a3a",fontSize:16,padding:"0 4px"}} onClick={()=>onRemove(d.id,ex.id)}>✕</button>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <div style={{flex:1}}>
                      <label style={{...S.fieldLabel,marginTop:0}}>Séries</label>
                      <input type="number" style={{...S.field,padding:"8px 10px",fontSize:13}} value={ex.sets} onChange={e=>onUpdate(d.id,ex.id,"sets",Number(e.target.value))}/>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{...S.fieldLabel,marginTop:0}}>Reps</label>
                      <input style={{...S.field,padding:"8px 10px",fontSize:13}} value={ex.reps} onChange={e=>onUpdate(d.id,ex.id,"reps",e.target.value)}/>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{...S.fieldLabel,marginTop:0}}>Descanso</label>
                      <select style={{...S.field,padding:"8px 10px",fontSize:13}} value={ex.rest} onChange={e=>onUpdate(d.id,ex.id,"rest",Number(e.target.value))}>
                        {[30,45,60,75,90,120].map(r=><option key={r} value={r}>{r}s</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button style={{...S.btnOutline,fontSize:13,padding:"11px"}} onClick={()=>setPickerDayId(d.id)}>+ Adicionar exercício</button>
            </>)}

            {!isEditing&&exs.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {exs.map((ex,i)=><span key={i} style={{fontSize:11,background:"#0d2218",borderRadius:6,padding:"3px 8px",color:C.muted}}>{ex.name}</span>)}
              </div>
            )}
            {!isEditing&&exs.length===0&&<div style={{fontSize:12,color:"#8fb8a2",fontStyle:"italic"}}>Nenhum exercício adicionado ainda</div>}
          </div>
        );
      })}

      <button style={{...S.btn,opacity:allDaysHaveExercises&&userName?1:0.35,marginTop:8}} disabled={!allDaysHaveExercises||!userName} onClick={onSave}>
        Salvar meu plano →
      </button>
      {(!allDaysHaveExercises||!userName)&&<p style={{fontSize:12,color:C.muted,textAlign:"center",marginTop:8}}>{!userName?"Informe seu nome para continuar.":"Adicione pelo menos 3 exercícios em cada dia."}</p>}

      {pickerDayId&&(
        <ExercisePickerModal
          dayId={pickerDayId} selectedIds={(dayExercises[pickerDayId]||[]).map(e=>e.id)}
          onAdd={(ex)=>{ onAdd(pickerDayId,ex); }}
          onClose={()=>setPickerDayId(null)}
        />
      )}
    </div>
  );
}

// ─── EXERCISE PICKER MODAL ────────────────────────────────────────────────────

function ExercisePickerModal({ dayId, selectedIds, onAdd, onClose }) {
  const [lib, setLib] = useState(null);           // biblioteca do banco (ou null = fallback estático)
  const [activeGroup, setActiveGroup] = useState(null);
  const [sugerindo, setSugerindo] = useState(false);
  const [sugestao, setSugestao] = useState("");
  const [sugestaoOk, setSugestaoOk] = useState(false);

  useEffect(()=>{
    let vivo = true;
    fetchBiblioteca().then(l=>{
      if(!vivo) return;
      const grupos = {};
      const ICONES = { "Peito":"🫁","Costas":"🔙","Ombros":"🙆","Bíceps":"💪","Tríceps":"🦾","Antebraço":"🤜",
        "Quadríceps":"🦵","Posteriores de Coxa":"🦵","Glúteos":"🍑","Adutores":"🦵","Panturrilhas":"🐐","Abdômen":"🎯" };
      l.forEach(e=>{
        if(!grupos[e.grupo_muscular]) grupos[e.grupo_muscular] = { label:e.grupo_muscular, icon:ICONES[e.grupo_muscular]||"🏋️", exercises:[] };
        grupos[e.grupo_muscular].exercises.push({ id:`lib_${e.id}`, name:e.nome, sets:3, reps:"8-12", rest:60, imagem_url:e.imagem_url });
      });
      setLib(grupos);
      setActiveGroup(Object.keys(grupos)[0]);
    }).catch(()=>{ if(vivo){ setLib(null); setActiveGroup(Object.keys(EXERCISE_LIBRARY)[0]); } });
    return ()=>{ vivo=false; };
  },[]);

  const fonte = lib || EXERCISE_LIBRARY;
  if (!activeGroup) return (
    <div style={S.modalOverlay}><div style={S.modal}><p style={{color:C.muted,fontSize:13}}>Carregando exercícios…</p></div></div>
  );
  const group = fonte[activeGroup];

  const enviarSugestao = async () => {
    const nome = sugestao.trim();
    if (nome.length < 2) return;
    // registra a sugestão (fire-and-forget) e adiciona ao treino como exercício personalizado
    fetch(`${SUPA_URL}/rest/v1/sugestoes_exercicios`, {
      method:"POST",
      headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}`, "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify({ nome })
    }).catch(()=>{});
    track("sugestao_enviada",{nome}); onAdd({ id:`custom_${Date.now()}`, name:nome, sets:3, reps:"8-12", rest:60 });
    setSugestao(""); setSugestaoOk(true);
    setTimeout(()=>setSugestaoOk(false), 2500);
  };

  return (
    <div style={S.modalOverlay}>
      <div style={{...S.modal,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={S.eyebrow}>ADICIONAR EXERCÍCIO</div>
          <button style={{background:"none",border:"none",color:C.muted,fontSize:18}} onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12,flexShrink:0}}>
          {Object.entries(fonte).map(([key,g])=>(
            <button key={key} style={{flexShrink:0,background:activeGroup===key?C.acc:"#0d2218",border:"none",borderRadius:20,padding:"6px 14px",fontSize:12,fontWeight:600,color:activeGroup===key?"#06140e":C.muted}} onClick={()=>setActiveGroup(key)}>
              {g.icon} {g.label}
            </button>
          ))}
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {group.exercises.map(ex=>{
            const already=selectedIds.includes(ex.id);
            return (
              <button key={ex.id} style={{...S.card,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:8,opacity:already?0.5:1}} disabled={already} onClick={()=>{onAdd(ex);}}>
                <div style={{display:"flex",alignItems:"center",gap:10,textAlign:"left",flex:1}}>
                  {ex.imagem_url && <div style={{background:"#F4F4F6",borderRadius:8,padding:3,flexShrink:0}}>
                    <img src={ex.imagem_url} alt="" loading="lazy" onError={e=>{e.currentTarget.parentElement.style.display="none";}} style={{width:52,height:38,objectFit:"contain",display:"block",mixBlendMode:"multiply"}}/>
                  </div>}
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{ex.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{ex.sets}x {ex.reps} · {ex.rest}s</div>
                  </div>
                </div>
                <span style={{color:already?C.muted:C.acc,fontSize:18,flexShrink:0}}>{already?"✓":"+"}</span>
              </button>
            );
          })}

          {/* Caixa de sugestões */}
          <div style={{border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"12px 14px",marginTop:4,marginBottom:10}}>
            {!sugerindo ? (
              <button style={{background:"none",border:"none",color:C.acc,fontSize:13,fontWeight:700,width:"100%",textAlign:"center",cursor:"pointer"}} onClick={()=>setSugerindo(true)}>
                Não encontrou? Sugerir e adicionar exercício +
              </button>
            ) : (
              <>
                <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Ele entra no seu treino agora e a sugestão vai para nossa equipe adicionar o card visual.</div>
                <input style={{...S.field,marginBottom:8}} value={sugestao} onChange={e=>setSugestao(e.target.value)} placeholder="Nome do exercício" maxLength={120}/>
                <button style={{...S.btn,padding:"10px",fontSize:13,opacity:sugestao.trim().length>=2?1:0.4}} disabled={sugestao.trim().length<2} onClick={enviarSugestao}>
                  Adicionar ao treino e sugerir
                </button>
              </>
            )}
            {sugestaoOk && <div style={{fontSize:12,color:C.acc,marginTop:8,textAlign:"center"}}>✓ Adicionado ao treino e sugestão enviada!</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
function PlanPreviewScreen({ plan, bodyAnalysis, onStart }) {
  return (
    <div style={S.box}>
      <div style={S.eyebrow}>{plan.mode==="ai"?"PLANO GERADO PELA IA 🤖":"SEU PLANO PERSONALIZADO 🏋️"} — PRONTO!</div>
      <h1 style={S.h1}>{plan.planName}</h1>
      {plan.planDescription&&<p style={{...S.sub,marginBottom:24}}>{plan.planDescription}</p>}

      {bodyAnalysis&&(
        <div style={{...S.card,marginBottom:24,gap:12}}>
          <div style={S.eyebrow}>ANÁLISE CORPORAL IA 📸</div>
          {bodyAnalysis.overallAnalysis&&<p style={{fontSize:13,color:C.muted,margin:0,lineHeight:1.5}}>{bodyAnalysis.overallAnalysis}</p>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:"#0d2218",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:"0.08em",marginBottom:6}}>PONTOS FORTES</div>
              {(bodyAnalysis.strongPoints||[]).map((p,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:3}}>✓ {p}</div>)}
            </div>
            <div style={{background:"#0d2218",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:"#e8a23a",fontWeight:700,letterSpacing:"0.08em",marginBottom:6}}>FOCO DE MELHORA</div>
              {(bodyAnalysis.weakPoints||[]).map((p,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:3}}>→ {p}</div>)}
            </div>
          </div>
          {(bodyAnalysis.postureNotes||[]).length>0&&(
            <div style={{background:"#0d2218",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.08em",marginBottom:6}}>POSTURA</div>
              {bodyAnalysis.postureNotes.map((p,i)=><div key={i} style={{fontSize:12,color:C.muted,marginBottom:3}}>• {p}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={S.sectionLabel}>ESTRUTURA SEMANAL</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
        {plan.weekDays.map((d,i)=>(
          <div key={i} style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div><div style={{fontWeight:700,fontSize:15}}>{d.label}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{d.sub}</div></div>
              <div style={{fontSize:12,color:C.acc,fontWeight:700}}>{d.exercises.length} exercícios</div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {d.exercises.map((ex,j)=><span key={j} style={{fontSize:11,background:"#0d2218",borderRadius:6,padding:"3px 8px",color:C.muted}}>{ex.name}</span>)}
            </div>
          </div>
        ))}
      </div>
      <button style={S.btn} onClick={onStart}>Iniciar treinamento →</button>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function SettingsModal({ onClose, user, onLogout }) {
  return (
    <div style={S.modalOverlay}>
      <div style={S.modal}>
        <div style={S.eyebrow}>CONFIGURAÇÕES</div>
        {AUTH_ENABLED && (
          <div style={{...S.card,flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            {user
              ? (<><div><div style={{fontSize:11,color:C.muted}}>CONTA</div><div style={{fontSize:13,fontWeight:600}}>{user.email}</div></div>
                 <button style={{...S.btnOutline,width:"auto",padding:"8px 14px",fontSize:12}} onClick={onLogout}>Sair</button></>)
              : (<><div style={{fontSize:13,color:C.muted}}>Sem conta — dados apenas neste aparelho</div>
                 <button style={{...S.btnOutline,width:"auto",padding:"8px 14px",fontSize:12}} onClick={onLogout}>Entrar</button></>)}
          </div>
        )}
        <div style={{...S.card,marginBottom:18}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>SOBRE</div>
          <div style={{fontSize:13,color:C.text}}>A-BODY v1.1 — Personal AI Trainer</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Geração de treinos por IA incluída, sem custo para você.</div>
        </div>
        <button style={S.btnOutline} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

function HomeScreen({ plan, history, onStart, onReset, onSettings, onBodyReport, onCalendar, onLibrary, hasBody }) {
  const lastByDay={}; history.forEach(s=>lastByDay[s.dayId]=s.date);
  const now = new Date();
  const ws = new Date(now); ws.setHours(0,0,0,0); ws.setDate(ws.getDate()-ws.getDay());
  const weekCount = history.filter(s=>new Date(s.date)>=ws).length;
  return (
    <div style={S.box}>
      <div style={{...S.brandRow,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={S.logo}>A</div><span style={S.brand}>A-BODY</span></div>
        <button onClick={onSettings} style={{background:"none",border:"none",fontSize:20,cursor:"pointer"}}>⚙️</button>
      </div>
      <div style={S.eyebrow}>{plan.planName}</div>
      <h1 style={S.h1}>Olá, {plan.userName}!</h1>
      <p style={S.sub}>Escolha o treino do dia.</p>

      <div style={{display:"flex",gap:10,marginBottom:18}}>
        <button style={{...S.card,flex:1,alignItems:"center",padding:"14px 8px"}} onClick={onCalendar}>
          <div style={{fontSize:22,marginBottom:4}}>📅</div>
          <div style={{fontSize:12,fontWeight:700,color:C.text}}>Frequência</div>
          <div style={{fontSize:11,color:C.acc,marginTop:2}}>{weekCount} treino{weekCount!==1?"s":""} esta semana</div>
        </button>
        <button style={{...S.card,flex:1,alignItems:"center",padding:"14px 8px",opacity:hasBody?1:0.5}} onClick={onBodyReport} disabled={!hasBody}>
          <div style={{fontSize:22,marginBottom:4}}>📊</div>
          <div style={{fontSize:12,fontWeight:700,color:C.text}}>Avaliação corporal</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{hasBody?"ver relatório":"sem avaliação"}</div>
        </button>
        <button style={{...S.card,flex:1,alignItems:"center",padding:"14px 8px"}} onClick={onLibrary}>
          <div style={{fontSize:22,marginBottom:4}}>📚</div>
          <div style={{fontSize:12,fontWeight:700,color:C.text}}>Biblioteca</div>
          <div style={{fontSize:11,color:C.muted,marginTop:2}}>146 exercícios</div>
        </button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        {plan.weekDays.map((d,i)=>{ const last=lastByDay[d.id]; return(
          <button key={i} style={S.dayCard} onClick={()=>onStart(d)}>
            <div><div style={{fontSize:17,fontWeight:700}}>{d.label}</div><div style={{fontSize:13,color:C.muted,marginTop:2}}>{d.sub}</div>{last&&<div style={{fontSize:11,color:"#8fb8a2",marginTop:5}}>Último: {new Date(last).toLocaleDateString("pt-BR")}</div>}</div>
            <span style={{color:C.acc,fontSize:20}}>→</span>
          </button>
        );})}
      </div>
      <button style={{...S.btnOutline,fontSize:13,padding:"12px"}} onClick={onReset}>↺ Refazer anamnese / novo plano</button>
    </div>
  );
}

// ─── WARMUP ──────────────────────────────────────────────────────────────────

function WarmupScreen({ day, cardioChoice, setCardioChoice, onContinue, onBack }) {
  return (
    <div style={S.box}>
      <div style={S.topRow}><button style={S.back} onClick={onBack}>← Sair</button><div style={S.eyebrow}>{day.label} · AQUECIMENTO</div></div>
      <h1 style={S.h1}>Antes de começar</h1>
      <p style={S.sub}>Escolha o cardio (5 min) e faça a mobilidade indicada.</p>
      <div style={S.sectionLabel}>CARDIO DE AQUECIMENTO</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {CARDIO_OPTIONS.map(c=><button key={c.id} style={{...S.card,...(cardioChoice===c.id?{border:`1.5px solid ${C.acc}`,background:"#102d20"}:{})}} onClick={()=>setCardioChoice(c.id)}><div style={{fontSize:22}}>{c.icon}</div><div style={{fontSize:13,fontWeight:600,marginTop:4}}>{c.name}</div></button>)}
      </div>
      <div style={S.sectionLabel}>MOBILIDADE</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {(day.mobility||[]).map((m,i)=><div key={i} style={{...S.card,flexDirection:"row",alignItems:"center",gap:12}}><div style={{width:8,height:8,borderRadius:"50%",background:C.acc,flexShrink:0}}/><div><div style={{fontSize:13,fontWeight:600}}>{m.name}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{m.dur}</div></div></div>)}
      </div>
      <button style={{...S.btn,opacity:cardioChoice?1:0.35}} disabled={!cardioChoice} onClick={onContinue}>Iniciar treino</button>
    </div>
  );
}

// ─── WORKOUT ─────────────────────────────────────────────────────────────────

function WorkoutScreen({ day, exercise, setIdx, queue, completed, weightInput, setWeightInput, elapsed, running, isoSec, isoTotal, isoRunning, isoDone, onStartIso, onPauseIso, onComplete, onSkip, onShowSubs, canSkip, onBack }) {
  const totalSets=[...completed,...queue].reduce((a,e)=>a+e.sets,0);
  const doneSets=completed.reduce((a,e)=>a+e.sets,0)+setIdx;
  const pct=totalSets?Math.round((doneSets/totalSets)*100):0;
  const isIso=exercise.iso;
  const isoCirc=2*Math.PI*52, isoOff=isoTotal>0?isoCirc*(isoSec/isoTotal):0;
  const canComplete=isIso?(isoRunning||isoDone):weightInput.length>0;
  return (
    <div style={S.box}>
      <div style={S.topRow}><button style={S.back} onClick={onBack}>← Sair</button><div style={S.eyebrow}>{day.label}</div></div>
      <div style={{height:4,background:C.border,borderRadius:2,marginBottom:4}}><div style={{height:4,background:C.acc,borderRadius:2,width:`${pct}%`,transition:"width .3s"}}/></div>
      <div style={{fontSize:11,color:C.muted,marginBottom:14}}>{doneSets} série{doneSets!==1?"s":""} concluída{doneSets!==1?"s":""} · {totalSets-doneSets} restante{(totalSets-doneSets)!==1?"s":""}</div>
      <FigureBlock exercise={exercise}/>
      {exercise._substitutedFor&&<div style={{fontSize:11,color:"#e8a23a",marginBottom:4}}>↔ Substituiu: {exercise._substitutedFor}</div>}
      {exercise._skipped&&<div style={{fontSize:11,color:"#e8a23a",marginBottom:4}}>⏩ Reagendado</div>}
      <div style={{fontSize:11,color:"#8fb8a2",marginBottom:4}}>{completed.length+1}º de {completed.length+queue.length} exercícios</div>
      <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 4px 0"}}>{exercise.name}</h2>
      <p style={{...S.sub,marginBottom:10}}>{exercise.reps} {isIso?"· isométrico":"reps"} · descanso {exercise.rest}s</p>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {Array.from({length:exercise.sets}).map((_,i)=><div key={i} style={{width:24,height:6,borderRadius:3,background:i<setIdx?C.acc:i===setIdx?"#e8a23a":C.border}}/>)}
      </div>
      {isIso?(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{position:"relative",width:130,height:130,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="52" stroke={C.border} strokeWidth="7" fill="none"/>
              <circle cx="65" cy="65" r="52" stroke={isoDone?"#3ddc84":"#e8a23a"} strokeWidth="7" fill="none" strokeDasharray={isoCirc} strokeDashoffset={isoOff} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:"stroke-dashoffset 1s linear"}}/>
            </svg>
            <div style={{position:"absolute",textAlign:"center"}}><div style={{fontSize:28,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{fmt(isoSec)}</div><div style={{fontSize:10,color:C.muted}}>/{fmt(isoTotal)}</div></div>
          </div>
          {!isoDone&&<button style={{...S.btn,width:"auto",padding:"12px 32px",fontSize:14}} onClick={isoRunning?onPauseIso:onStartIso}>{isoRunning?"⏸ Pausar":(isoSec===isoTotal?"▶ Iniciar":"▶ Continuar")}</button>}
          {isoDone&&<div style={{fontSize:13,color:C.acc,fontWeight:700}}>✓ Tempo concluído!</div>}
        </div>
      ):(
        <>
          <div style={S.seriesTimer}><span style={{fontSize:11,color:C.muted,letterSpacing:"0.08em"}}>SÉRIE {setIdx+1}/{exercise.sets}</span><span style={{fontSize:30,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{fmt(elapsed)}</span><span style={{fontSize:11,color:C.muted}}>{running?"em execução":"pausado"}</span></div>
          <label style={{...S.sectionLabel,marginTop:12}}>Peso nesta série (kg)</label>
          <input type="number" inputMode="decimal" style={S.input} value={weightInput} onChange={e=>setWeightInput(e.target.value)} placeholder="Ex: 40" autoFocus/>
        </>
      )}
      <button style={{...S.btn,opacity:canComplete?1:0.35,marginBottom:10}} disabled={!canComplete} onClick={onComplete}>Concluir série</button>
      <div style={{display:"flex",gap:8}}>
        <button style={{...S.btnOutline,flex:1,fontSize:13,padding:"12px 6px",opacity:canSkip?1:0.35}} disabled={!canSkip} onClick={onSkip}>⏩ Equipamento ocupado</button>
        <button style={{...S.btnOutline,flex:1,fontSize:13,padding:"12px 6px"}} onClick={onShowSubs}>↔ Substituir</button>
      </div>
    </div>
  );
}

// ─── SUB MODAL ───────────────────────────────────────────────────────────────

function SubModal({ exercise, onSelect, onClose }) {
  const genSubs=(pose)=>({
    press_chest:    [{name:"Supino com halteres",pose},{name:"Peck deck",pose:"fly"}],
    press_overhead: [{name:"Desenvolvimento no Smith",pose},{name:"Máquina de ombro",pose}],
    lateral_raise:  [{name:"Elevação lateral no cabo",pose}],
    fly:            [{name:"Crucifixo com halteres",pose}],
    triceps:        [{name:"Tríceps polia alta",pose},{name:"Mergulho em banco",pose}],
    squat:          [{name:"Agachamento no Smith",pose},{name:"Hack squat",pose}],
    leg_press:      [{name:"Agachamento livre",pose:"squat"}],
    lunge:          [{name:"Afundo com halteres",pose}],
    leg_curl:       [{name:"Stiff com halteres",pose:"hinge"}],
    calf:           [{name:"Panturrilha na máquina",pose}],
    plank:          [{name:"Abdominal com roda",pose}],
    pulldown:       [{name:"Puxada frontal na polia",pose},{name:"Máquina de puxada",pose}],
    row:            [{name:"Remada sentada no cabo",pose},{name:"Remada na máquina",pose}],
    face_pull:      [{name:"Face pull com elástico",pose}],
    curl:           [{name:"Rosca martelo",pose},{name:"Rosca concentrada",pose}],
    hinge:          [{name:"Terra romeno com halteres",pose}],
    hip_thrust:     [{name:"Ponte de glúteo no chão",pose}],
    leg_raise:      [{name:"Abdominal no cabo",pose:"plank"}],
  }[pose]||[]);
  const subs=genSubs(exercise.pose||"press_chest").map(s=>({...s,id:`sub_${uid()}`,sets:exercise.sets,reps:exercise.reps,rest:exercise.rest,iso:false,isoSec:null}));
  return (
    <div style={S.modalOverlay}>
      <div style={S.modal}>
        <div style={S.eyebrow}>SUBSTITUIR EXERCÍCIO</div>
        <p style={{...S.sub,marginBottom:16}}>Alternativas para <b style={{color:C.text}}>{exercise.name}</b>:</p>
        {subs.length===0&&<p style={{...S.sub,color:C.muted}}>Nenhuma alternativa disponível.</p>}
        {subs.map((s,i)=><button key={i} style={{...S.card,marginBottom:10,textAlign:"left"}} onClick={()=>onSelect(s)}><div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{s.name}</div><div style={{fontSize:12,color:C.muted}}>{s.sets} séries · {s.reps} reps</div></button>)}
        <button style={{...S.btnOutline,marginTop:6}} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── REST ─────────────────────────────────────────────────────────────────────

function RestScreen({ seconds, total, onSkip, queue, completed }) {
  const circ=2*Math.PI*52, off=circ*(1-seconds/(total||1));
  const allItems=[...completed.map(e=>({...e,status:"done"})),...queue.map((e,i)=>({...e,status:i===0?"current":e._skipped?"skipped":"pending"}))];
  return (
    <div style={S.box}>
      <div style={S.eyebrow}>DESCANSO</div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
        <div style={{position:"relative",width:130,height:130,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="52" stroke={C.border} strokeWidth="7" fill="none"/>
            <circle cx="65" cy="65" r="52" stroke={C.acc} strokeWidth="7" fill="none" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:"stroke-dashoffset 1s linear"}}/>
          </svg>
          <div style={{position:"absolute",textAlign:"center"}}><div style={{fontSize:30,fontWeight:800,fontVariantNumeric:"tabular-nums"}}>{fmt(seconds)}</div><div style={{fontSize:10,color:C.muted}}>descanso</div></div>
        </div>
      </div>
      <div style={S.sectionLabel}>EXERCÍCIOS DO TREINO</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
        {allItems.map((ex,i)=>{ const isDone=ex.status==="done",isCurrent=ex.status==="current",isSkipped=ex.status==="skipped"; return(
          <div key={i} style={{...S.card,flexDirection:"row",alignItems:"center",gap:12,padding:"10px 14px",border:isCurrent?`1.5px solid #e8a23a`:isSkipped?`1px dashed #8fb8a2`:`1px solid ${C.border}`,opacity:ex.status==="pending"?0.45:1}}>
            <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:isDone?C.acc:isCurrent?"#e8a23a":isSkipped?"#2a4a34":C.border,color:(isDone||isCurrent)?"#06140e":C.muted}}>
              {isDone?"✓":isCurrent?"▶":isSkipped?"⏩":"○"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:isDone?C.muted:C.text}}>{ex.name}{isSkipped&&<span style={{fontSize:10,color:"#e8a23a",marginLeft:6}}>· reagendado</span>}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{isDone?`${ex.sets}/${ex.sets} séries ✓`:isCurrent?"em andamento":`${ex.sets} séries · ${ex.reps}`}</div>
            </div>
          </div>
        );})}
      </div>
      <button style={S.btnOutline} onClick={onSkip}>Pular descanso</button>
    </div>
  );
}


// ─── BODY REPORT ─────────────────────────────────────────────────────────────

function BodyReportScreen({ bodyHistory, onBack, onReassess }) {
  const last = bodyHistory[bodyHistory.length - 1];
  if (!last) return null;
  const a = last.analysis || {};
  const daysSince = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
  const canReassess = daysSince >= 30;
  const comp = a.comparison;

  return (
    <div style={S.box}>
      <div style={S.topRow}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={S.eyebrow}>AVALIAÇÃO CORPORAL</div>
      </div>
      <h1 style={S.h1}>Seu relatório</h1>
      <p style={S.sub}>Avaliação de {new Date(last.date).toLocaleDateString("pt-BR")} · há {daysSince} dia{daysSince!==1?"s":""}{bodyHistory.length>1?` · ${bodyHistory.length}ª avaliação`:""}</p>

      {comp && (
        <div style={{...S.card,marginBottom:14,border:`1.5px solid ${C.acc}`}}>
          <div style={{fontSize:11,color:C.acc,fontWeight:700,letterSpacing:"0.08em",marginBottom:8}}>EVOLUÇÃO vs AVALIAÇÃO ANTERIOR</div>
          {comp.summary && <p style={{fontSize:13,color:C.text,margin:"0 0 10px 0",lineHeight:1.5}}>{comp.summary}</p>}
          {(comp.improvements||[]).map((p,i)=><div key={i} style={{fontSize:13,color:C.acc,marginBottom:4}}>▲ {p}</div>)}
          {(comp.attentionPoints||[]).map((p,i)=><div key={i} style={{fontSize:13,color:"#e8a23a",marginBottom:4}}>⚠ {p}</div>)}
        </div>
      )}

      {a.overallAnalysis && (
        <div style={{...S.card,marginBottom:14}}>
          <div style={{fontSize:11,color:C.muted,letterSpacing:"0.08em",marginBottom:6}}>ANÁLISE GERAL</div>
          <p style={{fontSize:13,color:C.text,margin:0,lineHeight:1.5}}>{a.overallAnalysis}</p>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{...S.card,flex:1}}>
          <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:"0.08em",marginBottom:6}}>PONTOS FORTES</div>
          {(a.strongPoints||[]).map((p,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:4}}>✓ {p}</div>)}
        </div>
        <div style={{...S.card,flex:1}}>
          <div style={{fontSize:10,color:"#e8a23a",fontWeight:700,letterSpacing:"0.08em",marginBottom:6}}>FOCO DE MELHORA</div>
          {(a.weakPoints||[]).map((p,i)=><div key={i} style={{fontSize:12,color:C.text,marginBottom:4}}>→ {p}</div>)}
        </div>
      </div>

      {(a.postureNotes||[]).length>0 && (
        <div style={{...S.card,marginBottom:14}}>
          <div style={{fontSize:11,color:C.muted,letterSpacing:"0.08em",marginBottom:6}}>POSTURA</div>
          {a.postureNotes.map((p,i)=><div key={i} style={{fontSize:12,color:C.muted,marginBottom:4}}>• {p}</div>)}
        </div>
      )}

      <button style={{...S.btn,opacity:canReassess?1:0.45,marginBottom:8}} disabled={!canReassess} onClick={onReassess}>
        📸 Nova avaliação comparativa
      </button>
      {!canReassess && (
        <p style={{fontSize:12,color:C.muted,textAlign:"center"}}>
          Disponível em {30-daysSince} dia{(30-daysSince)!==1?"s":""} — o comparativo faz sentido após ~1 mês de treinos.
        </p>
      )}
    </div>
  );
}

// ─── REASSESS ────────────────────────────────────────────────────────────────

function ReassessScreen({ photos, setPhotos, busy, err, onRun, onBack }) {
  const [consent, setConsent] = useState(false);
  const hasAny = photos.front || photos.back || photos.side;
  return (
    <div style={S.box}>
      <div style={S.topRow}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={S.eyebrow}>NOVA AVALIAÇÃO</div>
      </div>
      <h1 style={S.h1}>Avaliação comparativa</h1>
      <p style={S.sub}>Envie fotos atuais nas mesmas posições. A IA compara com sua avaliação anterior e mostra sua evolução.</p>
      <PhotoUploadStep photos={photos} setPhotos={setPhotos}/>
      {(photos.front||photos.back||photos.side)&&(
        <label style={{display:"flex",gap:10,alignItems:"flex-start",background:"#0d2218",border:`1px solid ${consent?C.acc:C.border}`,borderRadius:12,padding:"12px 14px",fontSize:12,color:C.text,marginTop:8,cursor:"pointer"}}>
          <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{marginTop:2}}/>
          <span>Autorizo o envio das minhas fotos para análise pela IA (dados sensíveis — LGPD). Não serão armazenadas.</span>
        </label>
      )}
      {err && <div style={{background:"#2a0a0a",border:"1px solid #8b2a2a",borderRadius:12,padding:"11px 14px",fontSize:13,color:"#ff8080",marginTop:10}}>{err}</div>}
      <button style={{...S.btn,marginTop:16,opacity:(hasAny&&!busy)?1:0.4}} disabled={!hasAny||busy} onClick={()=>{ if(!consent){alert("Marque a autorização de análise das fotos.");return;} onRun(); }}>
        {busy ? "Analisando…" : "Gerar comparativo ✨"}
      </button>
    </div>
  );
}

// ─── CALENDAR / CHECK-IN ─────────────────────────────────────────────────────

function CalendarScreen({ history, onBack }) {
  // Semana começando no domingo
  const startOfWeek = (d) => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; };
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));

  const days = Array.from({length:7}, (_,i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d; });
  const weekEnd = days[6];
  const today = new Date(); today.setHours(0,0,0,0);

  const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

  // treinos por dia desta semana
  const workoutsOn = (d) => history.filter(s => sameDay(new Date(s.date), d));

  const weekCount = days.filter(d => workoutsOn(d).length > 0).length;
  const totalCount = history.length;

  const fmtDay = (d) => d.toLocaleDateString("pt-BR",{day:"2-digit"});
  const fmtRange = `${days[0].toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})} – ${weekEnd.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}`;
  const DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const isCurrentWeek = sameDay(startOfWeek(new Date()), weekStart);

  const shiftWeek = (n) => { const d = new Date(weekStart); d.setDate(d.getDate() + n*7); setWeekStart(d); };

  return (
    <div style={S.box}>
      <div style={S.topRow}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={S.eyebrow}>FREQUÊNCIA</div>
      </div>
      <h1 style={S.h1}>Check-in semanal</h1>

      <div style={{display:"flex",gap:10,marginBottom:18}}>
        <div style={{...S.card,flex:1,alignItems:"center"}}>
          <div style={{fontSize:24,fontWeight:800,color:C.acc}}>{weekCount}</div>
          <div style={{fontSize:11,color:C.muted}}>treinos na semana</div>
        </div>
        <div style={{...S.card,flex:1,alignItems:"center"}}>
          <div style={{fontSize:24,fontWeight:800,color:C.text}}>{totalCount}</div>
          <div style={{fontSize:11,color:C.muted}}>treinos totais</div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <button style={{...S.back,fontSize:20,padding:"0 8px"}} onClick={()=>shiftWeek(-1)}>‹</button>
        <div style={{fontSize:14,fontWeight:700}}>{isCurrentWeek ? "Esta semana" : fmtRange}</div>
        <button style={{...S.back,fontSize:20,padding:"0 8px"}} onClick={()=>shiftWeek(1)}>›</button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {days.map((d,i)=>{
          const done = workoutsOn(d);
          const trained = done.length > 0;
          const isToday = sameDay(d, today);
          const isFuture = d > today;
          return (
            <div key={i} style={{
              ...S.card, flexDirection:"row", alignItems:"center", gap:14, padding:"12px 16px",
              border: isToday ? `1.5px solid ${C.acc}` : `1px solid ${C.border}`,
              opacity: isFuture ? 0.4 : 1,
            }}>
              <div style={{width:44,textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"0.05em"}}>{DOW[i].toUpperCase()}</div>
                <div style={{fontSize:17,fontWeight:800,color:isToday?C.acc:C.text}}>{fmtDay(d)}</div>
              </div>
              <div style={{flex:1}}>
                {trained ? (
                  done.map((s,j)=>(
                    <div key={j} style={{display:"flex",alignItems:"center",gap:8,marginBottom:j<done.length-1?4:0}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:C.acc,color:"#06140e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>✓</div>
                      <span style={{fontSize:14,fontWeight:700,color:C.text}}>{s.dayLabel || "Treino"}</span>
                    </div>
                  ))
                ) : (
                  <span style={{fontSize:13,color:C.muted}}>{isFuture ? "—" : "Sem treino"}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{...S.card,flexDirection:"row",gap:12,alignItems:"center"}}>
        <div style={{width:18,height:18,borderRadius:"50%",background:C.acc,color:"#06140e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800}}>✓</div>
        <span style={{fontSize:12,color:C.muted}}>Check-in automático ao finalizar o treino, com o nome do treino executado</span>
      </div>
    </div>
  );
}

// ─── POST CARDIO / REPORT ─────────────────────────────────────────────────────

function PostCardioScreen({ day, onContinue }) {
  const pc=day.postCardio;
  return (
    <div style={S.box}>
      <div style={S.eyebrow}>TREINO FINALIZADO 🎉</div>
      <h1 style={S.h1}>Cardio pós-treino</h1>
      <p style={S.sub}>{pc.text}</p>
      <div style={{...S.card,flexDirection:"row",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:C.muted}}>Duração</span><span style={{fontWeight:700,color:C.acc}}>{pc.min}–{pc.max} min</span></div>
      <div style={{...S.card,flexDirection:"row",justifyContent:"space-between",marginBottom:20}}><span style={{fontSize:13,color:C.muted}}>Intensidade</span><span style={{fontWeight:700,color:C.acc}}>{pc.intensity}</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
        {CARDIO_OPTIONS.map(c=><div key={c.id} style={{...S.card,alignItems:"center"}}><div style={{fontSize:22}}>{c.icon}</div><div style={{fontSize:12,fontWeight:600,marginTop:4}}>{c.name}</div></div>)}
      </div>
      <button style={S.btn} onClick={onContinue}>Ver relatório</button>
    </div>
  );
}

function ReportScreen({ report, onHome }) {
  return (
    <div style={S.box}>
      <div style={S.eyebrow}>RELATÓRIO</div>
      <h1 style={S.h1}>{report.dayLabel}</h1>
      {!report.hasPrev&&<p style={S.sub}>Primeira sessão registrada. Comparação disponível no próximo treino.</p>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {report.rows.map((r,i)=>(
          <div key={i} style={S.card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{r.name}</div>
            <div style={{display:"flex",gap:12,fontSize:12,color:C.muted,flexWrap:"wrap"}}>
              {r.iso?<><span>Melhor: <b style={{color:C.text}}>{r.curMax}s</b></span><span>Total: <b style={{color:C.text}}>{r.curVolume}s</b></span></>:<><span>Volume: <b style={{color:C.text}}>{r.curVolume}kg</b></span><span>Máx: <b style={{color:C.text}}>{r.curMax}kg</b></span></>}
              {r.diffPct!=null&&<span style={{color:r.diffPct>=0?C.acc:"#e8a23a",fontWeight:700}}>{r.diffPct>=0?"▲":"▼"} {Math.abs(r.diffPct).toFixed(0)}%</span>}
            </div>
          </div>
        ))}
      </div>
      {report.strongest&&report.weakest&&(
        <div style={{display:"flex",gap:10,marginBottom:24}}>
          <div style={{...S.card,flex:1}}><div style={{fontSize:10,color:"#8fb8a2",letterSpacing:"0.08em",marginBottom:6}}>PONTO FORTE</div><div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{report.strongest.name}</div><div style={{color:C.acc,fontSize:13,fontWeight:700}}>+{report.strongest.diffPct.toFixed(0)}%</div></div>
          <div style={{...S.card,flex:1}}><div style={{fontSize:10,color:"#8fb8a2",letterSpacing:"0.08em",marginBottom:6}}>A MELHORAR</div><div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{report.weakest.name}</div><div style={{color:"#e8a23a",fontSize:13,fontWeight:700}}>{report.weakest.diffPct.toFixed(0)}%</div></div>
        </div>
      )}
      <button style={S.btn} onClick={onHome}>Voltar ao início</button>
    </div>
  );
}

// ─── DESIGN ──────────────────────────────────────────────────────────────────



// ─── BIBLIOTECA DE EXERCÍCIOS (cards padrão A.Body) ──────────────────────────
const AB = { verde:"#1B7A3C", verdeEsc:"#14602F", preto:"#0B0B0B", fundo:"#F4F4F6", texto:"#4A4A4A",
  fonte:"'Roboto Condensed','Archivo Narrow','Arial Narrow',Arial,sans-serif" };

let _bibliotecaCache = null;
async function fetchBiblioteca() {
  if (_bibliotecaCache) return _bibliotecaCache;
  const r = await fetch(`${SUPA_URL}/rest/v1/exercicios?select=*&order=numero`,
    { headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  _bibliotecaCache = await r.json();
  return _bibliotecaCache;
}

const _SIN = { pulley:"polia", cabo:"polia", halteres:"halter", haltere:"halter",
  barras:"barra", maquinas:"maquina", livre:"livre" };
const _norm = (s, semParenteses) => {
  let t = s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  t = semParenteses ? t.replace(/\(.*?\)/g," ") : t.replace(/[()]/g," ");
  return t.replace(/[^a-z0-9 ]/g," ").split(/\s+/)
    .filter(x=>x && !["de","com","no","na","em","o","a","os","as","do","da"].includes(x))
    .map(x=>_SIN[x]||x);
};

function _melhorMatch(alvo, lista) {
  const alvoStr = alvo.join(" ");
  let melhor = null, melhorScore = 0;
  for (const ex of lista) {
    const t = _norm(ex.nome, false);
    if (t.join(" ") === alvoStr) return { ex, score: 99 };
    const comum = t.filter(x=>alvo.includes(x)).length;
    const menor = Math.min(t.length, alvo.length);
    const score = comum / Math.max(menor, 1) + (comum === menor ? 0.5 : 0);
    if ((comum >= 2 || (menor === 1 && comum === 1 && t.length === alvo.length)) && score > melhorScore) {
      melhorScore = score; melhor = ex;
    }
  }
  return melhorScore >= 1 ? { ex: melhor, score: melhorScore } : null;
}

function matchExercicio(nome, lista) {
  if (!nome || !lista) return null;
  const r1 = _melhorMatch(_norm(nome, false), lista);
  if (r1) return r1.ex;
  const r2 = _melhorMatch(_norm(nome, true), lista);
  return r2 ? r2.ex : null;
}

function FigureBlock({ exercise }) {
  const [match, setMatch] = useState(undefined);
  useEffect(()=>{
    let vivo = true;
    fetchBiblioteca()
      .then(l => { if (vivo){ const m = matchExercicio(exercise.name, l); setMatch(m); if(!m) track("exercicio_sem_match",{nome:exercise.name}); } })
      .catch(() => { if (vivo) setMatch(null); });
    return ()=>{ vivo = false; };
  },[exercise.name]);
  if (match && match.imagem_url) {
    return (
      <div style={{background:"#F4F4F6",border:`1px solid ${C.border}`,borderRadius:14,padding:"10px 10px 4px",marginBottom:12}}>
        <img src={match.imagem_url} alt={exercise.name} loading="lazy"
          onError={()=>setMatch(null)}
          style={{width:"100%",maxWidth:380,margin:"0 auto",display:"block",mixBlendMode:"multiply"}}/>
        <div style={{fontSize:10,color:"#7a7a80",textAlign:"center",padding:"2px 0 4px",fontWeight:700}}>
          {match.grupo_muscular} · {match.equipamento}{match.acessorio!=="—"?` · ${match.acessorio}`:""}
        </div>
      </div>
    );
  }
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={S.figCard}><Figure pose={exercise.pose} phase="start"/><div style={S.figLbl}>Início</div></div>
      <div style={{color:C.acc,fontSize:18,fontWeight:700}}>→</div>
      <div style={S.figCard}><Figure pose={exercise.pose} phase="end"/><div style={S.figLbl}>Final</div></div>
    </div>
  );
}

const AB_REGIOES = {
  triceps:[{cx:26,cy:64,rx:6,ry:14},{cx:74,cy:64,rx:6,ry:14}],
  biceps:[{cx:27,cy:60,rx:6,ry:12},{cx:73,cy:60,rx:6,ry:12}],
  peito:[{cx:50,cy:52,rx:16,ry:10}], costas:[{cx:50,cy:58,rx:17,ry:16}],
  ombros:[{cx:31,cy:44,rx:8,ry:7},{cx:69,cy:44,rx:8,ry:7}],
  abdomen:[{cx:50,cy:76,rx:11,ry:13}],
  quadriceps:[{cx:41,cy:116,rx:8,ry:18},{cx:59,cy:116,rx:8,ry:18}],
  posteriores:[{cx:41,cy:120,rx:8,ry:18},{cx:59,cy:120,rx:8,ry:18}],
  gluteos:[{cx:50,cy:96,rx:14,ry:9}],
  panturrilhas:[{cx:42,cy:152,rx:6,ry:13},{cx:58,cy:152,rx:6,ry:13}],
};

function ABSilhueta({ regiao }) {
  const marcas = AB_REGIOES[regiao] || [];
  const corpo = "M50 30 C36 30 30 38 29 48 L26 78 C25.5 84 30 85 31.5 80 L36 56 L36 92 L38 178 C38.2 183 46 183 46.4 178 L49 112 L51 112 L53.6 178 C54 183 61.8 183 62 178 L64 92 L64 56 L68.5 80 C70 85 74.5 84 74 78 L71 48 C70 38 64 30 50 30 Z";
  const Fig = ({op}) => (
    <svg viewBox="0 0 100 185" style={{height:72,width:"auto"}}>
      <g fill="#161616"><circle cx="50" cy="18" r="11"/><path d={corpo}/></g>
      {marcas.map((m,i)=><ellipse key={i} cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill={AB.verde} opacity={op}/>)}
    </svg>
  );
  return <div style={{display:"flex",gap:5,alignItems:"center"}}><Fig op="0.95"/><Fig op="0.6"/></div>;
}

function ABodyCard({ ex }) {
  return (
    <div style={{fontFamily:AB.fonte,background:AB.preto,borderRadius:18,padding:"0 8px 8px",width:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,padding:"11px 3px"}}>
        <div style={{background:AB.verdeEsc,border:"2px solid #fff",borderRadius:10,color:"#fff",fontWeight:800,fontSize:19,lineHeight:1,padding:"7px 10px",minWidth:40,textAlign:"center"}}>{ex.numero}</div>
        <div style={{border:`2px solid ${AB.verde}`,borderRadius:10,color:"#2ecc63",fontWeight:800,fontSize:14,letterSpacing:1,padding:"7px 10px"}}>{ex.categoria}</div>
        <h2 style={{color:"#fff",fontWeight:800,fontSize:"clamp(15px,4vw,21px)",letterSpacing:0.4,textTransform:"uppercase",margin:0,flex:1,lineHeight:1.05}}>{ex.nome}</h2>
      </div>
      <div style={{background:AB.fundo,borderRadius:13,padding:"13px 14px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
          <ABSilhueta regiao={ex.regiao_destaque}/>
          <div style={{width:2,alignSelf:"stretch",background:AB.verde,opacity:0.85}}/>
          <div>
            <div style={{color:AB.verde,fontWeight:800,fontSize:15}}>Grupo muscular:</div>
            <div style={{color:AB.texto,fontWeight:700,fontSize:14}}>{ex.grupo_muscular}</div>
          </div>
        </div>
        {ex.imagem_url && <div style={{display:"flex",justifyContent:"center",padding:"4px 0 10px"}}>
          <img src={ex.imagem_url} alt={ex.nome} loading="lazy" onError={e=>{e.currentTarget.style.display="none";}} style={{width:"100%",maxWidth:420,display:"block",mixBlendMode:"multiply"}}/>
        </div>}
        <div style={{borderTop:"1.5px solid #d8d8dc",paddingTop:9,display:"flex",alignItems:"center"}}>
          <div style={{flex:1}}>
            <div style={{color:AB.verde,fontWeight:800,fontSize:13}}>Equipamento:</div>
            <div style={{color:AB.texto,fontWeight:700,fontSize:12.5}}>{ex.equipamento}</div>
          </div>
          <div style={{width:1.5,height:32,background:"#c9c9ce"}}/>
          <div style={{flex:1,paddingLeft:14}}>
            <div style={{color:AB.verde,fontWeight:800,fontSize:13}}>Acessório:</div>
            <div style={{color:AB.texto,fontWeight:700,fontSize:12.5}}>{ex.acessorio}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryScreen({ onBack }) {
  const [exs, setExs] = useState(null);
  const [err, setErr] = useState(null);
  const [grupo, setGrupo] = useState("Todos");
  useEffect(()=>{
    (async()=>{
      try{
        setExs(await fetchBiblioteca());
      }catch(e){ setErr(e.message); }
    })();
  },[]);
  const grupos = exs ? ["Todos", ...Array.from(new Set(exs.map(e=>e.grupo_muscular)))] : [];
  const lista = exs ? (grupo==="Todos" ? exs : exs.filter(e=>e.grupo_muscular===grupo)) : [];
  return (
    <div style={S.box}>
      <button onClick={onBack} style={S.back}>← Voltar</button>
      <h1 style={S.h1}>Biblioteca</h1>
      <p style={S.sub}>{exs ? `${lista.length} exercício${lista.length!==1?"s":""}` : "Carregando exercícios…"}</p>
      {err && <p style={{color:"#ff8a8a",fontSize:13}}>Não foi possível carregar a biblioteca ({err}). Verifique sua conexão e tente novamente.</p>}
      {exs && <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:12}}>
        {grupos.map(g=>(
          <button key={g} onClick={()=>setGrupo(g)}
            style={{flexShrink:0,padding:"7px 13px",borderRadius:20,fontSize:12.5,fontWeight:700,cursor:"pointer",
              border:`1.5px solid ${g===grupo?C.acc:C.border}`,
              background:g===grupo?C.acc:"transparent",color:g===grupo?"#0b1f17":C.muted}}>{g}</button>
        ))}
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:14,paddingBottom:30}}>
        {lista.map(ex=><ABodyCard key={ex.id} ex={ex}/>)}
      </div>
    </div>
  );
}

const C={bg:"#0b1f17",card:"#11281f",border:"#1c3a2c",acc:"#3ddc84",text:"#eaf6ee",muted:"#9ec4b1",fig:"#bff0d4"};
const CSS=`*{box-sizing:border-box;}body{margin:0;}input::placeholder,textarea::placeholder{color:#8fb8a2;}button{font-family:inherit;cursor:pointer;color:inherit;}textarea,select{font-family:inherit;}`;
const S={
  page:{minHeight:"100vh",background:C.bg,fontFamily:"'Helvetica Neue',Arial,sans-serif",display:"flex",justifyContent:"center",padding:"20px 14px"},
  box:{width:"100%",maxWidth:480,color:C.text},
  brandRow:{display:"flex",alignItems:"center",gap:10,marginBottom:22},
  logo:{width:30,height:30,borderRadius:8,background:C.acc,color:"#06140e",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:15},
  brand:{fontSize:15,fontWeight:800,letterSpacing:"0.05em"},
  eyebrow:{fontSize:11,letterSpacing:"0.15em",color:C.acc,fontWeight:700,marginBottom:8},
  h1:{fontSize:26,fontWeight:800,margin:"0 0 6px 0",letterSpacing:"-0.01em"},
  sub:{fontSize:13,color:C.muted,margin:"0 0 16px 0",lineHeight:1.5},
  topRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14},
  back:{background:"none",border:"none",color:C.muted,fontSize:13,padding:0},
  sectionLabel:{fontSize:11,color:C.muted,letterSpacing:"0.1em",marginBottom:8,display:"block"},
  fieldLabel:{fontSize:11,color:C.muted,letterSpacing:"0.08em",display:"block",marginBottom:6,marginTop:14},
  field:{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px",color:C.text,fontSize:15,outline:"none"},
  card:{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",display:"flex",flexDirection:"column",color:C.text},
  dayCard:{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",color:C.text,textAlign:"left"},
  figCard:{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"8px 4px 6px",textAlign:"center"},
  figLbl:{fontSize:10,color:C.muted,marginTop:2},
  seriesTimer:{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 18px",display:"flex",flexDirection:"column",alignItems:"center",gap:2},
  input:{width:"100%",fontSize:30,fontWeight:700,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",color:C.text,marginTop:8,marginBottom:16,outline:"none"},
  btn:{width:"100%",background:C.acc,border:"none",borderRadius:14,padding:"16px",fontSize:15,fontWeight:700,color:"#06140e"},
  btnOutline:{width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px",fontSize:14,color:C.muted},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100},
  modal:{background:"#0f2419",borderRadius:"20px 20px 0 0",padding:"24px 20px 36px",width:"100%",maxWidth:480},
};
