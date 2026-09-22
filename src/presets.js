const ex=(id,name,sets,reps,rest,rir=2)=>({
  id,name,sets,reps,rest,rir,
  progressionRule:"Aumentar a carga ao atingir o topo da faixa com técnica estável e RIR alvo",
  iso:false,isoSec:null,subs:[]
});

const day=(id,label,sub,exercises)=>({
  id,label,sub,mobility:[],exercises,
  postCardio:{min:0,max:0,text:"Sem cardio obrigatório",intensity:"—"}
});

export const UPPER_FOCUS_5X={
  mode:"pro",
  planName:"Hipertrofia 5x — foco tronco",
  planDescription:"Cinco dias de musculação com prioridade para peito, costas, ombros e braços. Posteriores e glúteos aparecem em volume reduzido como complemento.",
  progressionStrategy:"Dupla progressão orientada por RIR.",
  safetyNotes:[],
  weekDays:[
    day("d1","A","Peito + Tríceps",[
      ex("a1","Supino reto com halteres",4,"6-10",90),
      ex("a2","Supino inclinado com halteres",3,"8-12",75),
      ex("a3","Peck Deck",3,"10-15",60),
      ex("a4","Crossover na polia",3,"12-15",60),
      ex("a5","Tríceps na polia com barra",3,"8-12",60),
      ex("a6","Tríceps com corda",3,"10-15",60),
      ex("a7","Tríceps unilateral na polia",2,"12-15",45)
    ]),
    day("d2","B","Costas + Bíceps",[
      ex("b1","Puxada frontal pegada neutra",4,"6-10",90),
      ex("b2","Remada máquina com apoio do peito",4,"8-12",75),
      ex("b3","Remada baixa na polia",3,"8-12",75),
      ex("b4","Pulldown com braços estendidos",3,"10-15",60),
      ex("b5","Rosca direta com barra W",3,"8-12",60),
      ex("b6","Rosca inclinada com halteres",3,"10-12",60),
      ex("b7","Rosca martelo",2,"10-15",60)
    ]),
    day("d3","C","Ombros + Core",[
      ex("c1","Desenvolvimento de ombros na máquina",3,"6-10",90),
      ex("c2","Elevação lateral com halteres",4,"10-15",60),
      ex("c3","Elevação lateral unilateral na polia",3,"12-15",45),
      ex("c4","Crucifixo inverso",4,"10-15",60),
      ex("c5","Face Pull",3,"12-15",60),
      ex("c6","Pallof Press",3,"10-15 por lado",45),
      ex("c7","Crunch na polia",3,"10-15",45)
    ]),
    day("d4","D","Peito + Costas",[
      ex("d1e","Supino inclinado na máquina",3,"8-12",75),
      ex("d2e","Chest Press",3,"8-12",75),
      ex("d3e","Crossover na polia",2,"12-15",60),
      ex("d4e","Puxada frontal",3,"8-12",75),
      ex("d5e","Remada articulada com apoio do peito",3,"8-12",75),
      ex("d6e","Pullover na polia",2,"10-15",60),
      ex("d7e","Crucifixo inverso",2,"12-15",60)
    ]),
    day("d5","E","Ombros + Braços + Posteriores/Glúteos",[
      ex("e1","Elevação lateral na máquina",4,"10-15",60),
      ex("e2","Reverse Fly",3,"12-15",60),
      ex("e3","Rosca Scott",3,"8-12",60),
      ex("e4","Rosca martelo na polia",2,"10-15",60),
      ex("e5","Tríceps francês na polia",3,"8-12",60),
      ex("e6","Tríceps corda",2,"10-15",60),
      ex("e7","Elevação pélvica / Hip Thrust",3,"8-12",75,3),
      ex("e8","Mesa ou cadeira flexora",3,"10-15",60,3)
    ])
  ]
};

export const PRESETS={
  "upper-focus-5x":UPPER_FOCUS_5X
};
