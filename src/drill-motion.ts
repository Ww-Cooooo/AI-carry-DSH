import {useEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import {gsap} from 'gsap';

type Running={key:string;surface:HTMLElement;label:HTMLElement;target:HTMLElement;timeline:gsap.core.Timeline;reveal:HTMLElement[]};
const rect=(el:HTMLElement)=>el.getBoundingClientRect();
const place=(el:HTMLElement,r:DOMRect)=>gsap.set(el,{left:r.left,top:r.top,width:r.width,height:r.height,x:0,y:0});

/** One measured surface and one unscaled label connect the two real views.
 * Reversals reuse their current displayed pose, never an old endpoint. */
export function useDrillMotion(scope:React.RefObject<HTMLElement|null>){
  const running=useRef<Running|null>(null);
  const clear=()=>{
    const old=running.current;if(!old)return;
    old.timeline.kill();old.target.style.removeProperty('visibility');
    gsap.set(old.reveal,{clearProps:'opacity,transform'});
    old.surface.remove();old.label.remove();running.current=null;
    scope.current?.removeAttribute('data-motion');
  };
  useEffect(()=>{
    const q=matchMedia('(prefers-reduced-motion: reduce)');
    const finish=()=>clear();q.addEventListener('change',finish);window.addEventListener('resize',finish);
    return()=>{clear();q.removeEventListener('change',finish);window.removeEventListener('resize',finish)};
  },[]);
  return (change:()=>void,key='',after?:()=>void)=>{
    const root=scope.current;if(!root){change();return}
    const find=(part:string)=>root.querySelector<HTMLElement>(`[data-drill-${part}="${CSS.escape(key)}"]`);
    const from=key&&find('surface'),subject=key&&find('label');
    let surface:HTMLElement|undefined,label:HTMLElement|undefined;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&from&&subject){
      const old=running.current;
      if(old?.key===key){
        const box=rect(old.surface),text=rect(old.label);
        old.timeline.kill();old.target.style.removeProperty('visibility');
        gsap.set(old.reveal,{clearProps:'opacity,transform'});
        surface=old.surface;label=old.label;place(surface,box);place(label,text);running.current=null;
      }else{
        clear();surface=document.createElement('div');label=subject.cloneNode(true) as HTMLElement;
        surface.className='carry-motion-surface';label.className+=' carry-motion-label';
        surface.setAttribute('aria-hidden','true');label.setAttribute('aria-hidden','true');
        label.removeAttribute('data-drill-label');
        root.append(surface,label);place(surface,rect(from));place(label,rect(subject));
      }
    }else clear();
    flushSync(change);after?.();
    const to=key&&find('surface'),target=key&&find('label');
    if(!surface||!label||!to||!target){surface?.remove();label?.remove();return}
    const destination=rect(to),text=rect(target);
    target.style.visibility='hidden';root.setAttribute('data-motion',key);
    const reveal=Array.from(root.querySelectorAll<HTMLElement>('[data-drill-reveal]'));
    const timeline=gsap.timeline({onComplete:()=>{
      if(running.current?.timeline===timeline)clear();
    }});
    running.current={key,surface,label,target,timeline,reveal};
    timeline.to(surface,{left:destination.left,top:destination.top,width:destination.width,height:destination.height,borderRadius:getComputedStyle(to).borderRadius,duration:.5,ease:'power3.inOut'},0)
      .to(surface,{opacity:0,duration:.23,ease:'power2.out'},.18)
      .to(label,{left:text.left,top:text.top,width:text.width,height:text.height,duration:.5,ease:'power3.inOut'},0)
      .fromTo(reveal,{opacity:0,y:12},{opacity:1,y:0,duration:.34,stagger:.035,ease:'power2.out',clearProps:'opacity,transform'},.12);
  };
}
