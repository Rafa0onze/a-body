const dialogs=[];
const inertNodes=new Map();
let bodyOverflow='';
const focusable='button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
const visible=element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden'&&!element.closest('[inert]');

export function attachDialogFocus(panel,onClose){
  const trigger=document.activeElement;
  const token={panel};dialogs.push(token);
  if(dialogs.length===1)bodyOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const disabled=[];
  let branch=panel.closest('.ab-modal-overlay')||panel;
  while(branch.parentElement){
    for(const sibling of branch.parentElement.children){
      if(sibling===branch||['SCRIPT','STYLE','LINK'].includes(sibling.tagName))continue;
      const entry=inertNodes.get(sibling)||{count:0,original:sibling.inert};
      entry.count++;inertNodes.set(sibling,entry);sibling.inert=true;disabled.push(sibling);
    }
    branch=branch.parentElement;if(branch===document.body)break;
  }
  const top=()=>dialogs.at(-1)===token;
  const targets=()=>[...panel.querySelectorAll(focusable)].filter(visible);
  const focusFirst=()=> (targets()[0]||panel).focus({preventScroll:true});
  const keydown=event=>{
    if(!top())return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
    if(event.key!=='Tab')return;
    const list=targets(),first=list[0],last=list.at(-1),active=document.activeElement;
    if(!list.length){event.preventDefault();panel.focus();}
    else if(event.shiftKey&&(active===first||active===panel||!panel.contains(active))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(active===last||active===panel||!panel.contains(active))){event.preventDefault();first.focus();}
  };
  const focusin=event=>{if(top()&&!panel.contains(event.target))focusFirst();};
  document.addEventListener('keydown',keydown,true);document.addEventListener('focusin',focusin);
  panel.focus({preventScroll:true});
  let attached=true;
  return ()=>{
    if(!attached)return;attached=false;
    document.removeEventListener('keydown',keydown,true);document.removeEventListener('focusin',focusin);
    const index=dialogs.indexOf(token);if(index>=0)dialogs.splice(index,1);
    for(const element of disabled){const entry=inertNodes.get(element);if(!entry)continue;if(--entry.count===0){element.inert=entry.original;inertNodes.delete(element);}}
    if(!dialogs.length)document.body.style.overflow=bodyOverflow;
    if(trigger?.isConnected&&!trigger.closest('[inert]'))trigger.focus({preventScroll:true});
    else dialogs.at(-1)?.panel.focus({preventScroll:true});
  };
}
