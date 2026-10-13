import {useEffect,useRef,useState} from 'react';
const SCREENS=new Set(['auth','passwordRecovery','onboarding','modeSelect','anamnesis','generating','splitSelect','dayBuilder','planPreview','home','workoutOverview','warmup','workout','rest','bodyReport','reassess','calendar','library','evolucao','postcardio','report','measurements','proHome','proPerfil','proAgenda','proAlunos','aguardandoTreino']);
export function useAppScreen() {
  const [screen,setScreen]=useState('boot');
  const initialized=useRef(false),fromHistory=useRef(false),current=useRef(screen);
  current.current=screen;
  useEffect(()=>{const pop=event=>{const next=event.state?.abodyScreen;if(SCREENS.has(next)&&next!==current.current){fromHistory.current=true;setScreen(next);}};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  useEffect(()=>{
    if(screen==='boot')return;
    if(!initialized.current){window.history.replaceState({...window.history.state,abodyScreen:screen},'');initialized.current=true;}
    else if(fromHistory.current)fromHistory.current=false;
    else if(window.history.state?.abodyScreen!==screen)window.history.pushState({...window.history.state,abodyScreen:screen},'');
  },[screen]);
  return [screen,setScreen];
}
