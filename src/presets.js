const ex=(id,name,sets,reps,rest,rir=2,pose="")=>({
  id,name,sets,reps,rest,rir,pose,
  progressionRule:"Aumentar a carga ao atingir o topo da faixa com técnica estável e RIR alvo",
  iso:false,isoSec:null,subs:[]
});

const isoEx=(id,name,sets,seconds,rest,pose="plank")=>({
  id,name,sets,reps:"1",rest,rir:2,pose,
  progressionRule:"Aumentar gradualmente o tempo mantendo técnica e controle",
  iso:true,isoSec:seconds,subs:[]
});

const day=(id,label,sub,exercises)=>({
  id,label,sub,mobility:[],exercises,
  postCardio:{min:0,max:0,text:"Sem cardio obrigatório",intensity:"—"}
});

export const UPPER_FOCUS_5X={
  mode:"pro",
  presetVersion:"2026-09-23-v2",
  planName:"Hipertrofia 5x — Tronco + Core",
  planDescription:"Cinco dias de musculação com prioridade para peito, costas, ombros e braços, incluindo trabalho direto de core, trapézio e antebraços. Membros inferiores ficam fora desta divisão.",
  progressionStrategy:"Dupla progressão orientada por RIR.",
  safetyNotes:[],
  weekDays:[
    day("d1","A","Peito + Tríceps + Core",[
      ex("a1","Supino reto com halteres",3,"6-10",90,2,"press_chest"),
      ex("a2","Supino inclinado com halteres",3,"8-12",75,2,"press_chest"),
      ex("a3","Peck Deck",2,"10-15",60,2,"fly"),
      ex("a4","Crossover na polia",2,"12-15",60,2,"fly"),
      ex("a5","Tríceps na polia com barra",3,"8-12",60,2,"triceps"),
      ex("a6","Tríceps francês na polia",2,"10-15",60,2,"triceps"),
      ex("a7","Crunch na polia",3,"10-15",45,2,"plank")
    ]),
    day("d2","B","Costas + Bíceps + Posterior de Ombro",[
      ex("b1","Puxada frontal pegada neutra",3,"6-10",90,2,"pulldown"),
      ex("b2","Remada máquina com apoio do peito",3,"8-12",75,2,"row"),
      ex("b3","Remada baixa na polia",2,"8-12",75,2,"row"),
      ex("b4","Pulldown com braços estendidos",2,"10-15",60,2,"pulldown"),
      ex("b5","Reverse Fly",3,"12-15",60,2,"face_pull"),
      ex("b6","Rosca direta com barra W",3,"8-12",60,2,"curl"),
      ex("b7","Rosca martelo",2,"10-15",60,2,"curl")
    ]),
    day("d3","C","Ombros + Core",[
      ex("c1","Desenvolvimento de ombros na máquina",3,"6-10",90,2,"press_overhead"),
      ex("c2","Elevação lateral com halteres",4,"10-15",60,2,"lateral_raise"),
      ex("c3","Elevação lateral unilateral na polia",2,"12-15",45,2,"lateral_raise"),
      ex("c4","Crucifixo inverso",3,"12-15",60,2,"face_pull"),
      ex("c5","Face Pull",2,"12-15",60,2,"face_pull"),
      ex("c6","Pallof Press",3,"10-15 por lado",45,2,"plank"),
      isoEx("c7","Prancha",3,45,45,"plank")
    ]),
    day("d4","D","Peito + Costas + Trapézio",[
      ex("d1e","Supino inclinado na máquina",3,"8-12",75,2,"press_chest"),
      ex("d2e","Chest Press",2,"8-12",75,2,"press_chest"),
      ex("d3e","Crossover na polia",2,"12-15",60,2,"fly"),
      ex("d4e","Puxada frontal",3,"8-12",75,2,"pulldown"),
      ex("d5e","Remada articulada com apoio do peito",3,"8-12",75,2,"row"),
      ex("d6e","Pullover na polia",2,"10-15",60,2,"pulldown"),
      ex("d7e","Encolhimento com Halteres",3,"10-15",60,2,"row")
    ]),
    day("d5","E","Braços + Ombros + Core",[
      ex("e1","Elevação lateral na máquina",3,"10-15",60,2,"lateral_raise"),
      ex("e2","Rosca Scott",3,"8-12",60,2,"curl"),
      ex("e3","Rosca martelo na polia",2,"10-15",60,2,"curl"),
      ex("e4","Tríceps francês na polia",3,"8-12",60,2,"triceps"),
      ex("e5","Tríceps corda",2,"10-15",60,2,"triceps"),
      ex("e6","Elevação de joelhos em suspensão",3,"10-15",45,2,"plank"),
      ex("e7","Abdominal reverso",3,"12-20",45,2,"plank")
    ])
  ]
};

export const PRESETS={
  "upper-focus-5x":UPPER_FOCUS_5X
};
