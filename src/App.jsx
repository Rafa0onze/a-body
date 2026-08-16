import { useState, useEffect, useRef, useId } from "react";
import "./app.css";
import { adaptiveInsight } from "./adaptation.js";

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

const C={bg:"#f7f9f7",card:"#ffffff",border:"#e1e9e4",acc:"#1f9d68",text:"#14241d",muted:"#66756d",fig:"#55b88a"};
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

const ICON_PATHS = {
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
  sparkles: <><path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4Z"/><path d="m19 14-.8 2.2L16 17l2.2.8L19 20l.8-2.2L22 17l-2.2-.8Z"/><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8Z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.37.36.7.64.98.3.28.68.42 1.06.42h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/></>,
  dumbbell: <><path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 0 3-2 4-3 4 1-5-2-8-5-10 0 5-4 7-4 13 0 4 4 7 9 7Z"/>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  play: <path d="m8 5 11 7-11 7Z"/>,
  repeat: <><path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
  swap: <><path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/></>,
  zap: <path d="M13 2 3 14h8l-1 8 10-12h-8Z"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
};

function Icon({ name, size = 20, className = "" }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[name]}</svg>;
}

function BrandMark({ className = "" }) {
  return (
    <span className={`ab-logo-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" role="img">
        <path fillRule="evenodd" d="M4.5 35 16.8 5h6.5l8.4 21.2-6.1 2.7-2.2-6.1h-8L10.7 35H4.5Zm13-18h3.9l-2-5.7-1.9 5.7Z"/>
        <path d="m26.6 30.6 5.9-2.7 2.8 7.1h-6.2l-2.5-4.4Z"/>
      </svg>
    </span>
  );
}
async function loadStorage(key) {
  // Nuvem primeiro (se logado), fallback local
  if (typeof A…63024 tokens truncated…y(editDia, { day }); track("registro_manual",{treino:day.label}); setEditDia(null); }}
                    style={{...S.card,flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",cursor:"pointer",border:`1.5px solid #f0a848`}}>
                    <span style={{fontSize:14,fontWeight:800,color:"#f0a848"}}>{day.label}</span>
                    <span style={{fontSize:12,color:C.muted}}>{day.sub||""}</span>
                  </button>
                ))}
              </div>
              <p style={{fontSize:12,color:C.muted,margin:"0 0 8px"}}>Ou fez algo fora do plano? Selecione o(s) grupo(s):</p>
            </>)}
            {!(plan?.weekDays?.length > 0) && <p style={{fontSize:12,color:C.muted,margin:"0 0 12px"}}>Selecione o(s) grupo(s) muscular(es) que você treinou nesse dia:</p>}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
              {GRUPOS_MANUAL.map(g=>{
                const sel = gruposSel.includes(g);
                return (
                  <button key={g} onClick={()=>setGruposSel(sel ? gruposSel.filter(x=>x!==g) : [...gruposSel,g])}
                    style={{padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:700,cursor:"pointer",
                      border:`1.5px solid ${sel?"#f0a848":C.border}`,
                      background:sel?"#f0a848":"transparent",color:sel?"#06140e":C.muted}}>{g}</button>
                );
              })}
            </div>
            <button style={{...S.btn,opacity:gruposSel.length?1:0.4}} disabled={!gruposSel.length}
              onClick={()=>{ onUpdateHistory(editDia, { grupos: gruposSel }); track("registro_manual",{grupos:gruposSel}); setEditDia(null); }}>
              Salvar registro
            </button>
            {workoutsOn(editDia).some(s=>s.manual) && (
              <button style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,color:"#ff8a8a",fontSize:12,fontWeight:600,padding:"9px 12px",width:"100%",cursor:"pointer",marginTop:8}}
                onClick={()=>{ onUpdateHistory(editDia, null); setEditDia(null); }}>
                Remover registro manual deste dia
              </button>
            )}
          </div>
        </div>
      )}
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

function ReportScreen({ report, onHome, vinculo, onFeedback }) {
  const totalVolume = report.rows.filter(r=>!r.iso).reduce((sum,r)=>sum+(Number(r.curVolume)||0),0);
  const evolucoes = report.rows.filter(r=>r.diffPct!=null&&r.diffPct>0).length;
  const [recovery,setRecovery] = useState("good");
  const [pain,setPain] = useState(false);
  const [feedbackSaved,setFeedbackSaved] = useState(false);
  const saveFeedback = async () => { await onFeedback({recovery,pain}); setFeedbackSaved(true); };
  return (
    <div className="ab-data-page">
      <section className="ab-report-hero">
        <div className="ab-kicker">TREINO CONCLUÍDO · ÓTIMO TRABALHO</div>
        <h1>{report.dayLabel}</h1>
        <p>{report.hasPrev?`${evolucoes} exercício${evolucoes!==1?"s":""} com evolução em relação à sessão anterior.`:"Sua primeira sessão foi registrada. Este é o começo da sua linha de evolução."}</p>
        <div className="ab-stat-grid">
          <div className="ab-stat-tile"><strong>{report.rows.length}</strong><span>Exercícios</span></div>
          <div className="ab-stat-tile"><strong>{Math.round(totalVolume)}</strong><span>Volume em kg</span></div>
          <div className="ab-stat-tile"><strong>{evolucoes}</strong><span>Evoluções</span></div>
          <div className="ab-stat-tile"><strong>100%</strong><span>Concluído</span></div>
        </div>
      </section>
      {vinculo && <ObsPersonalBox vinculo={vinculo} contexto={{tipo:"fim_treino",treino:report.dayLabel||null}} placeholder="fale com seu personal: dúvidas, feedback, pedido de substituição…"/>}
      <div className="ab-section-title"><h2>Desempenho por exercício</h2><span>{report.hasPrev?"Comparado à sessão anterior":"Primeira referência"}</span></div>
      <div className="ab-report-grid">
        {report.rows.map((r,i)=>(
          <div key={i} className="ab-report-row">
            <div className="ab-report-row-top"><strong>{r.name}</strong>{r.diffPct!=null&&<span className="ab-delta" data-negative={r.diffPct<0}>{r.diffPct>=0?"▲":"▼"} {Math.abs(r.diffPct).toFixed(0)}%</span>}</div>
            <div className="ab-report-stats">
              <div className="ab-report-stat"><span>{r.iso?"MELHOR":"VOLUME"}</span><b>{r.iso?`${r.curMax}s`:`${r.curVolume}kg`}</b></div>
              <div className="ab-report-stat"><span>{r.iso?"TOTAL":"CARGA MÁX."}</span><b>{r.iso?`${r.curVolume}s`:`${r.curMax}kg`}</b></div>
            </div>
          </div>
        ))}
      </div>
      {report.strongest&&report.weakest&&(
        <div className="ab-highlight-grid">
          <div className="ab-highlight"><span>MAIOR EVOLUÇÃO</span><strong>{report.strongest.name}</strong><b>+{report.strongest.diffPct.toFixed(0)}%</b></div>
          <div className="ab-highlight" data-tone="attention"><span>PRÓXIMO FOCO</span><strong>{report.weakest.name}</strong><b>{report.weakest.diffPct.toFixed(0)}%</b></div>
        </div>
      )}
      <section className="ab-feedback-card">
        <div className="ab-section-title"><div><span>PRÓXIMA ADAPTAÇÃO</span><h2>Como seu corpo respondeu?</h2></div></div>
        <div className="ab-feedback-options">
          {[["good","Recuperado"],["okay","Cansado, mas bem"],["poor","Muito fatigado"]].map(([value,label])=><button key={value} data-active={recovery===value} onClick={()=>{setRecovery(value);setFeedbackSaved(false);}}>{label}</button>)}
        </div>
        <label className="ab-pain-check"><input type="checkbox" checked={pain} onChange={event=>{setPain(event.target.checked);setFeedbackSaved(false);}}/><span>Senti dor articular, aguda ou diferente do esforço muscular esperado.</span></label>
        <button className="ab-secondary-action" style={{width:"100%"}} onClick={saveFeedback}>{feedbackSaved?"✓ Resposta registrada":"Registrar resposta"}</button>
      </section>
      <button className="ab-primary" onClick={onHome}>Voltar para hoje <Icon name="arrow" size={18}/></button>
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
    if ((comum >= 2 || comum === menor) && comum > 0 && score > melhorScore) {
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
        <div style={{aspectRatio:"4/3",maxWidth:380,margin:"0 auto"}}>
          <img src={match.imagem_url} alt={exercise.name} loading="lazy"
            onError={()=>setMatch(null)}
            style={{width:"100%",height:"100%",objectFit:"contain",display:"block",mixBlendMode:"multiply"}}/>
        </div>
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
    <article className="ab-library-card">
      <div className="ab-library-media">{ex.imagem_url?<img src={ex.imagem_url} alt={ex.nome} loading="lazy" onError={e=>{e.currentTarget.style.display="none";}}/>:<ABSilhueta regiao={ex.regiao_destaque}/>}</div>
      <div className="ab-library-body"><div className="ab-library-number">EXERCÍCIO {ex.numero||"—"} · {ex.categoria}</div><h2>{ex.nome}</h2><div className="ab-library-meta"><span>{ex.grupo_muscular}</span>{ex.equipamento&&<span>{ex.equipamento}</span>}{ex.acessorio&&<span>{ex.acessorio}</span>}</div></div>
    </article>
  );
}

function EvolucaoScreen({ history, onBack }) {
  // séries temporais por exercício (apenas sessões reais)
  const porExercicio = {};
  history.filter(s=>!s.manual).forEach(s => {
    (s.completed||[]).forEach(e => {
      if (e.iso || !Array.isArray(e.weights) || !e.weights.length) return;
      const w = e.weights.filter(v=>v!=null&&!isNaN(v));
      if (!w.length) return;
      const r = (e.reps||[]).filter(v=>v!=null&&!isNaN(v));
      (porExercicio[e.name] = porExercicio[e.name]||[]).push({
        date: s.date, max: Math.max(...w),
        vol: w.reduce((a,b,i)=>a+b*(r[i]||0),0) || null,
        repsMin: r.length ? Math.min(...r) : null,
      });
    });
  });
  const nomes = Object.keys(porExercicio).sort((a,b)=>porExercicio[b].length-porExercicio[a].length);
  const [sel, setSel] = useState(nomes[0]||null);
  if (!nomes.length) return (
    <div className="ab-data-page">
      <button onClick={onBack} className="ab-workout-exit">← Voltar</button>
      <div className="ab-empty-state"><div><div className="ab-empty-icon"><Icon name="chart" size={28}/></div><h1>Sua evolução começa no primeiro treino.</h1><p>Registre pesos e repetições durante uma sessão. Seus gráficos, recordes e tendências aparecerão automaticamente aqui.</p></div></div>
    </div>
  );
  const dados = (porExercicio[sel]||[]).slice(-12); // últimas 12 sessões
  const W=320, H=150, PX=14, PY=16;
  const vals = dados.map(d=>d.max);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = (max-min) || 1;
  const px = (i)=> dados.length>1 ? PX + i*(W-2*PX)/(dados.length-1) : W/2;
  const py = (v)=> H-PY - (v-min)*(H-2*PY)/range;
  const pts = dados.map((d,i)=>`${px(i)},${py(d.max)}`).join(" ");
  const primeiro = dados[0], ultimo = dados[dados.length-1];
  const delta = primeiro && ultimo && primeiro.max>0 ? ((ultimo.max-primeiro.max)/primeiro.max*100) : 0;
  const fmtData = (iso)=> new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
  return (
    <div className="ab-data-page">
      <button onClick={onBack} className="ab-workout-exit">← Voltar</button>
      <header className="ab-page-head"><div><div className="ab-kicker">PROGRESSO</div><h1>Evolução de carga</h1><p className="ab-copy">Acompanhe recordes, consistência e tendência das últimas {dados.length} execuções.</p></div></header>
      <div className="ab-filter-row">
        {nomes.map(n=>(
          <button key={n} onClick={()=>setSel(n)} className="ab-filter-chip" data-active={n===sel}>{n}</button>
        ))}
      </div>
      <div className="ab-chart-card">
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
          {[0.25,0.5,0.75].map(f=>(
            <line key={f} x1={PX} x2={W-PX} y1={PY+f*(H-2*PY)} y2={PY+f*(H-2*PY)} stroke={C.border} strokeWidth="1" strokeDasharray="3 4"/>
          ))}
          {dados.length>1 && <polyline points={pts} fill="none" stroke={C.acc} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
          {dados.map((d,i)=>(
            <g key={i}>
              <circle cx={px(i)} cy={py(d.max)} r="4" fill={C.acc}/>
              <text x={px(i)} y={py(d.max)-8} textAnchor="middle" fontSize="9" fontWeight="800" fill={C.text}>{d.max}</text>
            </g>
          ))}
          <text x={PX} y={H-2} fontSize="8.5" fill={C.muted}>{fmtData(primeiro.date)}</text>
          <text x={W-PX} y={H-2} textAnchor="end" fontSize="8.5" fill={C.muted}>{fmtData(ultimo.date)}</text>
        </svg>
      <div className="ab-stat-grid">
        {[["início",`${primeiro.max}kg`],["atual",`${ultimo.max}kg`],["progresso",`${delta>=0?"+":""}${delta.toFixed(0)}%`],["sessões",`${(porExercicio[sel]||[]).length}`]].map(([l,v],i)=>(
          <div key={i} className="ab-stat-tile">
            <strong style={{color:i===2&&delta>0?C.acc:C.text}}>{v}</strong><span>{l}</span>
          </div>
        ))}
      </div>
      {ultimo.repsMin != null && <p style={{fontSize:12,color:C.muted,marginTop:10}}>
        Última sessão: mínimo de {ultimo.repsMin} reps por série{ultimo.vol ? ` · volume total ${Math.round(ultimo.vol)}kg` : ""}.
      </p>}
      </div>
    </div>
  );
}

function LibraryScreen({ onBack }) {
  const [exs, setExs] = useState(null);
  const [err, setErr] = useState(null);
  const [grupo, setGrupo] = useState("Todos");
  const [busca, setBusca] = useState("");
  useEffect(()=>{
    (async()=>{
      try{
        setExs(await fetchBiblioteca());
      }catch(e){ setErr(e.message); }
    })();
  },[]);
  const grupos = exs ? ["Todos", ...Array.from(new Set(exs.map(e=>e.grupo_muscular)))] : [];
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const lista = exs ? exs.filter(e=>(grupo==="Todos"||e.grupo_muscular===grupo)&&(!termo||`${e.nome} ${e.grupo_muscular} ${e.equipamento||""}`.toLocaleLowerCase("pt-BR").includes(termo))) : [];
  return (
    <div className="ab-data-page">
      <button onClick={onBack} className="ab-workout-exit">← Voltar</button>
      <header className="ab-page-head"><div><div className="ab-kicker">MOVIMENTOS</div><h1>Biblioteca de exercícios</h1><p className="ab-copy">Explore execuções, grupos musculares e equipamentos disponíveis.</p></div><div className="ab-stat-tile"><strong>{exs?lista.length:"—"}</strong><span>Resultados</span></div></header>
      {err && <p style={{color:"#ff8a8a",fontSize:13}}>Não foi possível carregar a biblioteca ({err}). Verifique sua conexão e tente novamente.</p>}
      <div className="ab-library-toolbar"><div className="ab-search"><Icon name="search" size={18}/><input aria-label="Buscar exercícios" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por exercício, grupo ou equipamento"/></div></div>
      {exs && <div className="ab-filter-row">
        {grupos.map(g=>(
          <button key={g} onClick={()=>setGrupo(g)} className="ab-filter-chip" data-active={g===grupo}>{g}</button>
        ))}
      </div>}
      {!exs&&!err&&<div className="ab-library-grid">{[1,2,3,4,5,6].map(i=><div className="ab-skeleton" key={i}/>)}</div>}
      {exs&&lista.length>0&&<div className="ab-library-grid">{lista.map(ex=><ABodyCard key={ex.id} ex={ex}/>)}</div>}
      {exs&&lista.length===0&&<div className="ab-empty-state"><div><div className="ab-empty-icon"><Icon name="search" size={28}/></div><h1>Nenhum exercício encontrado.</h1><p>Tente outro nome, equipamento ou grupo muscular.</p></div></div>}
    </div>
  );
}


