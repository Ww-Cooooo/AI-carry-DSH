import React, {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Alert,Button,Collapse,ConfigProvider,Empty,Form,Input,Modal,Select,Space,Spin,Tag,theme} from 'antd';
import {ArrowLeftOutlined,ArrowRightOutlined,CheckOutlined,FolderOpenOutlined,ReloadOutlined,SearchOutlined} from '@ant-design/icons';
import {gsap} from 'gsap';
import {useGSAP} from '@gsap/react';
import Lenis from 'lenis';
import type {View,TaskView,Learning,DraftInput,SessionOption} from './types';
import {TYPERT_REMOTE} from '../lib/typert.remote-client.js';
import css from './style.css';

gsap.registerPlugin(useGSAP);
const NS='eh3-ai-carry';
const empty:View={revision:0,bindings:[],tasks:[],task:null};
const uid=()=>crypto.randomUUID();
const lines=(text:string)=>text.split('\n').map(s=>s.trim()).filter(Boolean);
const short=(s:string,n=65)=>s.length>n?s.slice(0,n)+'…':s;
type Invoke=(method:string,...args:any[])=>Promise<any>;
type Act=(method:string,...args:any[])=>Promise<View|undefined>;
function Icon(){return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M5 5h9v9H5zM10 10h9v9h-9M5 19l4-4M14 5l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>}
function useReduced(){const [v,set]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)'),f=()=>set(q.matches);q.addEventListener('change',f);return()=>q.removeEventListener('change',f)},[]);return v;}
function Text({children}:{children:string}){return <pre className="carry-text">{children}</pre>}
function Reading({children}:{children:string}){const inline=(s:string)=>s.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part);return <div className="carry-reading">{children.trim().split(/\n\s*\n/).map((block,i)=>/^---+$/.test(block.trim())?<hr key={i}/>:/^#{1,4} /.test(block)?<h4 key={i}>{inline(block.replace(/^#{1,4} /,''))}</h4>:<p key={i}>{inline(block)}</p>)}</div>}
function Evidence({children}:{children:React.ReactNode}){return <div className="carry-evidence">{children}</div>}

// Native module chunks are loaded by Harness, so optional renderers have no CDN dependency.
declare const require:any;
function Relations({task}:{task:TaskView}){
 const ref=useRef<HTMLDivElement>(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{let disposed=false,graph:any,resize:ResizeObserver;setFailed(false);
  require.async('./client.graph.js').then(({Graph}:any)=>{if(disposed||!ref.current)return;const nodes:any[]=[],edges:any[]=[];
   const add=(id:string,label:string,x:number,y:number)=>nodes.push({id,style:{x,y,labelText:label}});
   if(task.selection)add('method','选用方法',80,50);
   task.deliveries.slice(-3).forEach((d,i)=>{add(d.operationId,d.userSeq?'会话材料 #'+d.userSeq:'等待材料回读',240,50+i*90);if(task.selection?.assetId===d.assetId)edges.push({source:'method',target:d.operationId});});
   task.artifacts.slice(-3).forEach((a,i)=>{add(a.id,'成果 #'+a.seq,410,50+i*90);if(nodes.some(n=>n.id===a.deliveryId))edges.push({source:a.deliveryId,target:a.id});});
   task.learning.slice(-3).forEach((c,i)=>{add(c.id,c.receipt?.state==='saved'?'已保存学习':'学习草稿',580,50+i*90);if(nodes.some(n=>n.id===c.sourceId))edges.push({source:c.sourceId,target:c.id});});
   graph=new Graph({container:ref.current,width:ref.current.clientWidth,height:290,animation:false,autoFit:'view',padding:25,data:{nodes,edges},node:{type:'rect',style:{size:[108,38],radius:8,fill:'#edf6f3',stroke:'#74a99a',labelFill:'#123e33',labelFontSize:13,labelFontFamily:'AI Carry Sans'}},edge:{style:{stroke:'#93aaa2',endArrow:true}},behaviors:['drag-canvas','zoom-canvas']});
   graph.render().catch(()=>setFailed(true));resize=new ResizeObserver(()=>{if(!disposed&&ref.current&&ref.current.clientWidth)graph.resize(ref.current.clientWidth,290)});resize.observe(ref.current);
  }).catch(()=>{if(!disposed)setFailed(true)});return()=>{disposed=true;resize?.disconnect();graph?.destroy()};
 },[task.id,task.deliveries.length,task.artifacts.length,task.learning.map(c=>c.receipt?.state).join()]);
 return <><div ref={ref} className="carry-graph" aria-hidden="true"/>{failed&&<Alert type="info" title="关系图暂不可用，下方引用仍可核对。"/>}<p className="carry-meta">只连接本任务的真实材料、成果与学习。图示表示引用关系，不表示模型已掌握。</p><ul className="carry-relations">{task.artifacts.map(a=><li key={a.id}>成果 #{a.seq} ← 材料 {task.deliveries.find(d=>d.operationId===a.deliveryId)?.userSeq??'待回读'}；关联学习 {task.learning.filter(c=>c.sourceId===a.id).length} 条</li>)}</ul></>;
}
function DifferenceMap({before,after}:{before:string;after:string}){
 const ref=useRef<HTMLDivElement>(null),[failed,setFailed]=useState(false);
 const a=lines(before),b=lines(after),removed=a.filter(x=>!b.includes(x)),added=b.filter(x=>!a.includes(x));
 useEffect(()=>{let disposed=false,space:any,observer:ResizeObserver;
  require.async('./client.canvas.js').then(({CanvasSpace,Pt,Group}:any)=>{
   if(disposed||!ref.current)return;
   space=new CanvasSpace(ref.current).setup({bgcolor:'#f5f7f6',retina:true,resize:true});const form=space.getForm();
   space.add({animate:()=>{const w=space.width;[a,b].forEach((group,col)=>group.forEach((line,index)=>{
    const changed=col===0?!b.includes(line):!a.includes(line);
    form.fillOnly(changed?(col===0?'#b96d53':'#24765d'):'#c3d3cd').rect(new Group(new Pt(col*w/2+8,index*4+6),new Pt((col+1)*w/2-8,index*4+8)));
   }));}});
   const draw=()=>{if(!disposed)space.playOnce(0)};observer=new ResizeObserver(draw);observer.observe(ref.current);draw();
  }).catch(()=>{if(!disposed)setFailed(true)});
  return()=>{disposed=true;observer?.disconnect();space?.dispose()};
 },[before,after]);
 return <div className="carry-diffmap"><div ref={ref} style={{height:Math.min(160,Math.max(a.length,b.length)*4+16),overflow:'hidden'}} aria-hidden="true"/>
 <p className="carry-meta">{before?`对照已有内容：新增 ${added.length} 行，移除 ${removed.length} 行`:`新建内容，共 ${b.length} 个非空行`}{failed?' · 图示暂不可用':''}。按文本行比较，完整正文以下方预览为准。</p></div>;
}
function LearningEditor({candidate,task,act,busy,openSession}:{candidate:Learning;task:TaskView;act:Act;busy:boolean;openSession:()=>void}){
 const draftKey=`${NS}.draft.${task.id}.${candidate.id}`;const restore=()=>{try{const stored=JSON.parse(sessionStorage.getItem(draftKey)??'null');return stored?.revision===candidate.revision?stored.request:candidate.request}catch{return candidate.request}};const [draft,setDraft]=useState<DraftInput>(restore),[confirm,setConfirm]=useState<string|null>(null),[remindAt,setRemindAt]=useState('');
 const block=useRef<HTMLDivElement>(null),reduce=useReduced();
 useEffect(()=>setDraft(restore()),[candidate.id,candidate.revision]);
 useEffect(()=>{try{if(JSON.stringify(draft)!==JSON.stringify(candidate.request))sessionStorage.setItem(draftKey,JSON.stringify({revision:candidate.revision,request:draft}));else sessionStorage.removeItem(draftKey)}catch{}},[draft,candidate.revision]);
 const dirty=JSON.stringify(draft)!==JSON.stringify(candidate.request),receipt=candidate.receipt;
 const locked=!!receipt&&!['failed','discarded'].includes(receipt.state);
 const preview=candidate.preview;
 useGSAP(()=>{if(!block.current||!receipt)return;gsap.fromTo(block.current.querySelector('.carry-save-result'),{y:reduce?0:12,opacity:reduce?1:0},{y:0,opacity:1,duration:reduce?0:.45,clearProps:'transform,opacity'});},{scope:block,dependencies:[receipt?.state,reduce],revertOnUpdate:true});
 const field=(key:keyof DraftInput,label:string,rows=2)=>{const value=draft[key];return <Form.Item label={label} key={key}><Input.TextArea aria-label={label} value={Array.isArray(value)?value.join('\n'):String(value??'')} autoSize={{minRows:rows,maxRows:9}} data-lenis-prevent readOnly={locked} onChange={e=>setDraft({...draft,[key]:['title','summary'].includes(key)?e.target.value:lines(e.target.value)})}/></Form.Item>};
 async function prepare(){let v;if(dirty)v=await act('edit',task.id,candidate.id,candidate.revision,draft);if(!dirty||v)await act('preview',task.id,candidate.id)}
 async function decide(){if(!preview||!confirm)return;const key=`${task.id}:${candidate.id}:${preview.id}:${confirm}:${remindAt}`;let operation=sessionStorage.getItem(key);if(!operation){operation=uid();sessionStorage.setItem(key,operation)}const result=await act('decide',task.id,candidate.id,preview.id,candidate.revision,confirm,operation,remindAt);if(result)setConfirm(null);}
 const states:Record<string,string>={saved:'正式内容已保存',once:'仅用于本次',discarded:'未保存这条建议',observing:'已进入后续处理',failed:'保存未完成，草稿已保留',writing:'正在保存',committed:'正文已提交，待核对', 'recovery-required':'保存中断，等待恢复'};
 return <div className="carry-learning" ref={block} data-learning-id={candidate.id}>
  <div className="carry-section-heading"><div><span className="carry-eyebrow">学习建议 · 草稿 {candidate.revision}</span><h2>{candidate.request.title}</h2></div><Tag>{({sop:'方法',memory:'记忆',experience:'经验',capability:'能力边界'})[draft.kind]}</Tag></div>
  <div className="carry-learning-grid"><aside className="carry-source"><h3>这条建议从哪里来</h3><p className="carry-meta">本次会话 · 成果 #{candidate.sourceSeq}</p><Reading>{candidate.sourceQuote}</Reading><Button onClick={openSession}>打开来源会话</Button><p className="carry-meta">来源引用已保留。一次任务成果只能作为建议依据，长期适用范围仍需你核对。</p></aside>
  <div><h3>{locked?'已处理的内容':'编辑要留下的内容'}</h3><Form layout="vertical" className="carry-form">
   <Form.Item label="学习类型"><Select aria-label="学习类型" value={draft.kind} disabled={locked} onChange={kind=>{const next={...draft,kind};if(kind!=='memory')delete next.subtype;setDraft(next)}} options={[{value:'sop',label:'可复用方法'},{value:'memory',label:'记忆'},{value:'experience',label:'经验'},{value:'capability',label:'能力边界'}]}/></Form.Item>
   {draft.kind==='memory'&&<Form.Item label="记忆类别"><Select aria-label="记忆类别" value={draft.subtype??'general'} disabled={locked} onChange={subtype=>setDraft({...draft,subtype})} options={[{value:'general',label:'普通记忆'},{value:'habit',label:'偏好与习惯'}]}/></Form.Item>}
   {field('title','标题',1)}{field('summary','核心内容')}{field('triggers','什么时候使用（每行一项）')}{field('scope','适用范围（每行一项）')}{field('steps','执行步骤（每行一步）',4)}
   <Collapse ghost items={[{key:'details',label:'条件、边界和完成检查',children:<>{field('conditions','前置条件')}{field('excludes','不适用范围')}{field('failure_handling','失败时怎么处理')}{field('completion_checks','怎样检查完成')}{field('notes','补充说明')}</>}]} />
  </Form><div className="carry-actions"><Button type="primary" disabled={locked} loading={busy} onClick={prepare}>{dirty?'保存草稿并重新预览':'查看正式保存预览'}</Button>{dirty&&<span className="carry-meta">有未保存编辑 · 原预览不可用于保存</span>}</div></div></div>
  {preview&&<section className="carry-preview" data-preview-id={preview.id}><div className="carry-section-heading"><div><span className="carry-eyebrow">保存前核对</span><h3>将写入的完整正文</h3></div><Tag color={dirty?'orange':'green'}>{dirty?'需更新预览':'对应草稿 '+preview.revision}</Tag></div>
   <p className="carry-path">{preview.target||'等待正式规则确定保存位置'}</p><p className="carry-meta">{preview.decision==='learning-save-already-current'?'相同内容已存在；留下时只核对现有文件。':preview.summary.includes('选择“留下”后：')?preview.summary.slice(preview.summary.indexOf('选择“留下”后：')):preview.summary}</p>
   <DifferenceMap before={preview.priorBody} after={preview.body}/>
   <div className="carry-comparison">{preview.priorBody&&<div><h4>相关已有内容 · 对照参考</h4><Reading>{preview.priorBody}</Reading></div>}<div><h4>本次拟保存正文</h4><Reading>{preview.body.replace(/^\+\+\+[\s\S]*?\+\+\+\n/,'')}</Reading></div></div>
   <Collapse ghost items={[{key:'exact',label:'查看完整正式文件（含元数据）',children:<Text>{preview.body}</Text>}]} />
   {!locked&&<div className="carry-choices"><Button type="primary" disabled={dirty||busy} onClick={()=>setConfirm('keep')}>留下</Button><Button disabled={dirty||busy} onClick={()=>setConfirm('once')}>仅这次</Button><Button disabled={dirty||busy} onClick={()=>setConfirm('observe')}>先观察</Button><Button disabled={dirty||busy} onClick={()=>setConfirm('remind')}>以后提醒</Button><Button disabled={dirty||busy} onClick={()=>setConfirm('discard')}>不保存</Button></div>}
  </section>}
  {receipt&&<section className="carry-save-result" aria-live="polite"><h3>{states[receipt.state]??'处理记录'}</h3><div className="carry-status-grid"><Evidence><b>正式保存</b><span>{receipt.state==='saved'?'已完成':states[receipt.state]??'待核对'}</span></Evidence><Evidence><b>正文回读</b><span>{receipt.state==='saved'?(receipt.readback?'与本次预览一致':'尚未核对一致'):'不适用'}</span></Evidence><Evidence><b>普通检索</b><span>{receipt.state==='saved'?(receipt.recall?'已找回':'仍待检查'):'不适用'}</span></Evidence><Evidence><b>后续实际效果</b><span>尚需后续任务验证</span></Evidence></div>
   {receipt.target&&<p className="carry-path">{receipt.target}</p>}{receipt.recallQuery&&<p className="carry-meta">核对用语：{receipt.recallQuery}</p>}{receipt.state==='saved'&&<><p className="carry-meta">{receipt.projection==='refresh-pending'?'正文保留；派生展示待刷新。':'正式文件是唯一真源。'} 再次核对不会重复保存。</p><Button onClick={()=>act('recheck',task.id,candidate.id)} loading={busy}>重新检查回读与检索</Button></>}
   {['writing','committed','recovery-required'].includes(receipt.state)&&<Button type="primary" onClick={()=>act('recover',task.id,candidate.id)} loading={busy}>恢复并核对原保存</Button>}
   {receipt.state==='observing'&&<p>已按实例规则保留观察或提醒记录，没有显示为正式学习成功。</p>}
  </section>}
  <Modal title={({keep:'留下这条学习',once:'仅用于本次任务',observe:'先观察这条建议',remind:'安排以后提醒',discard:'不保存这条建议'} as any)[confirm??'']} open={!!confirm} onCancel={()=>setConfirm(null)} onOk={decide} confirmLoading={busy} okText="确认这项选择" cancelText="返回编辑" okButtonProps={{disabled:confirm==='remind'&&!remindAt}}>
   <p>{candidate.request.title}</p><p>{confirm==='keep'?'将按刚才显示的完整正文执行正式保存。':confirm==='once'?'保留本次材料和成果，不写入长期资产。':confirm==='discard'?'不写入实例。草稿、成果和本次选择仍保留在插件任务记录中。':confirm==='observe'?'按实例规则保留观察记录，之后再决定。':'按实例规则保留提醒记录；在此填入提醒时间。'}</p>
   {confirm==='remind'&&<Input type="datetime-local" aria-label="提醒时间" value={remindAt} onChange={e=>setRemindAt(e.target.value)}/>}<p className="carry-meta">只处理这一条建议，其他任务不受影响。</p>
  </Modal>
 </div>;
}

function App({ctx}:{ctx:any}){
 const [view,setView]=useState<View>(empty),[sessions,setSessions]=useState<SessionOption[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true),[mode,setMode]=useState('task');
 const [bindOpen,setBindOpen]=useState(false),[root,setRoot]=useState(''),[bindingId,setBinding]=useState(''),[sessionId,setSession]=useState(''),[title,setTitle]=useState(''),[query,setQuery]=useState(''),[overrides,setOverrides]=useState(''),[learningId,setLearning]=useState('');
 const [dark,setDark]=useState(()=>document.body.hasAttribute('data-ds-dark-theme'));
 const scroll=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),selection=useRef<HTMLDivElement>(null),alive=useRef(true),inflight=useRef(false);const reduce=useReduced();const task=view.task;
 const taskIdRef=useRef('');taskIdRef.current=task?.id??'';
 const invoke:Invoke=async(method,...args)=>{const result=await ctx.remote[NS][method](...args);if(!result.ok)throw new Error(result.error.message||'暂时无法完成，请稍后重试。');return result.value;};
 const applyView=(v:View)=>{if(!alive.current)return;setView(previous=>v.revision>=previous.revision?v:previous);if(v.task){localStorage.setItem(`${NS}.task`,v.task.id);setBinding(v.task.bindingId);setSession(v.task.sessionId)}else if(v.bindings.length&&!bindingId)setBinding(v.bindings[0].id);};
 const act:Act=async(method,...args)=>{if(inflight.current)return;inflight.current=true;setBusy(true);setError('');try{const v=await invoke(method,...args);applyView(v);return v;}catch(e){if(alive.current)setError((e as Error).message);return undefined;}finally{inflight.current=false;if(alive.current)setBusy(false)}};
 useEffect(()=>{alive.current=true;Promise.all([invoke('view',localStorage.getItem(`${NS}.task`)??'').catch(()=>invoke('view','')),invoke('sessions')]).then(([v,s])=>{applyView(v);if(alive.current)setSessions(s)}).catch(e=>{if(alive.current)setError(e.message)}).finally(()=>{if(alive.current)setLoading(false)});return()=>{alive.current=false}},[]);
 useEffect(()=>{const observer=new MutationObserver(()=>setDark(document.body.hasAttribute('data-ds-dark-theme')));observer.observe(document.body,{attributes:true,attributeFilter:['data-ds-dark-theme']});return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!scroll.current||!content.current||reduce)return;const lenis=new Lenis({wrapper:scroll.current,content:content.current,autoRaf:true,duration:.45,allowNestedScroll:true,prevent:n=>!!n.closest('textarea,input,.ant-select-dropdown,.ant-modal,[data-lenis-prevent]')});return()=>lenis.destroy()},[reduce,loading]);
 useEffect(()=>{if(task){setQuery(task.query);setOverrides(task.selection?.overrides??'')}},[task?.id,task?.selection?.assetId]);
 useEffect(()=>{if(!task?.suggestions?.some(x=>['accepted','pending'].includes(x.state))||task.learning.some(c=>!c.receipt))return;let active=true;const timer=setInterval(()=>{if(!inflight.current)invoke('view',task.id).then(v=>{if(active&&taskIdRef.current===task.id)applyView(v)}).catch(()=>{})},3000);return()=>{active=false;clearInterval(timer)}},[task?.id,task?.suggestions?.map(x=>x.state).join(),task?.learning.length]);
 useGSAP(()=>{if(!selection.current)return;gsap.fromTo(selection.current,{height:reduce?'auto':0,opacity:reduce?1:0},{height:'auto',opacity:1,duration:reduce?0:.38,ease:'power2.out',clearProps:'height,opacity'});},{scope:selection,dependencies:[task?.selection?.assetId,reduce],revertOnUpdate:true});
 const currentBinding=view.bindings.find(b=>b.id===task?.bindingId),currentSession=sessions.find(s=>s.id===task?.sessionId),candidate=task?.learning.find(c=>c.id===learningId)??task?.learning.at(-1);
 const openSession=()=>{if(task)ctx.uiWorkspace.openSession(task.sessionId)};
 const chooseTask=async(id:string)=>{const v=await act('view',id);if(v){setMode('task');setLearning('');scroll.current?.scrollTo(0,0)}};
 async function deliver(){if(!task?.selection)return;let v:View|undefined;if(overrides!==task.selection.overrides)v=await act('adjust',task.id,overrides);if(overrides!==task.selection.overrides&&!v)return;const uncertain=task.deliveries.findLast(d=>d.state==='uncertain'&&d.assetId===task.selection!.assetId&&d.overrides===overrides);await act('deliver',task.id,uncertain?.operationId??uid());}
 async function suggest(){if(!task?.artifacts.length)return;const source=task.artifacts.at(-1)!;const retry=task.suggestions?.findLast(s=>s.sourceId===source.id&&s.state==='uncertain');await act('suggest',task.id,source.id,retry?.operationId??uid());}
 async function manualDraft(){if(!task?.artifacts.length)return;const source=task.artifacts.at(-1)!;const draft:DraftInput={kind:'sop',title:'本次任务的可复用方法',summary:'请根据左侧成果写明要保留的核心方法。',triggers:[task.query],scope:['与本次任务相同的适用范围'],steps:['核对成果后填写可复用的步骤']};const v=await act('propose',task.id,source.id,draft);if(v){setLearning(v.task!.learning.at(-1)!.id);setMode('learning')}}
 const themeTokens={fontFamily:'"AI Carry Sans", sans-serif',fontSize:14,colorPrimary:dark?'#73baa4':'#246b55',borderRadius:7,controlHeight:38};
 return <ConfigProvider button={{autoInsertSpace:false}} theme={{algorithm:dark?theme.darkAlgorithm:theme.defaultAlgorithm,token:themeTokens}}><div className={'carry-root'+(dark?' carry-dark':'')} data-eh3-ai-carry="native">
  <header className="carry-header"><div className="carry-brand"><Icon/><strong>AI Carry</strong><span>让方法用于任务，让经验有据可留</span></div><Button icon={<ArrowLeftOutlined/>} onClick={()=>ctx.layout.selectPanel(null)}>返回会话</Button></header>
  <div className="carry-scroll" ref={scroll} tabIndex={0} aria-label="AI Carry 工作区"><div className="carry-content" ref={content}>
   <div className="carry-toolbar"><Select aria-label="已记录任务" placeholder="选择已记录的任务" value={task?.id} onChange={chooseTask} options={view.tasks.map(t=>({value:t.id,label:short(t.title)}))} style={{minWidth:240,flex:1}}/><Button onClick={()=>{setView({...view,task:null});setTitle('');setMode('task');localStorage.removeItem(`${NS}.task`)}}>连接新任务</Button><Button icon={<FolderOpenOutlined/>} onClick={()=>setBindOpen(true)}>实例连接</Button></div>
   {error&&<Alert title={error} type="error" showIcon closable onClose={()=>setError('')}/ >}{view.issue&&<Alert type="warning" title={view.issue} showIcon/>}
   {loading?<div className="carry-loading"><Spin/><p>正在读取实例与任务记录</p></div>:!task?<section className="carry-start"><span className="carry-eyebrow">当前任务</span><h1>带着合适的方法开始</h1><p>选一个已有实例和目标会话。本次要求与长期内容分别保留。</p><Form layout="vertical"><Form.Item label="AI Carry 实例"><Select aria-label="AI Carry 实例" value={bindingId||undefined} placeholder="先连接已有实例" onChange={setBinding} options={view.bindings.map(b=>({value:b.id,label:b.name+' · '+b.instanceId}))}/></Form.Item><Form.Item label="目标会话"><Select aria-label="目标会话" value={sessionId||undefined} onChange={setSession} placeholder="选择要接收材料的 Harness 会话" options={sessions.map(s=>({value:s.id,label:s.workspaceName+' / '+s.title+(s.running?' · 运行中':'')}))}/></Form.Item>{!sessions.length&&<Alert type="info" title="请先在 Harness 侧栏创建一个会话，再刷新这里。" action={<Button onClick={()=>invoke('sessions').then(setSessions).catch(e=>setError(e.message))}>刷新会话</Button>}/>}<Form.Item label="这次要完成什么"><Input.TextArea aria-label="这次要完成什么" value={title} onChange={e=>setTitle(e.target.value)} maxLength={240} autoSize={{minRows:3,maxRows:7}} placeholder="说明任务、读者和希望得到的成果"/></Form.Item><Button type="primary" loading={busy} disabled={!bindingId||!sessionId||!title.trim()} onClick={()=>{const s=sessions.find(x=>x.id===sessionId)!;act('openTask',bindingId,sessionId,s.workspaceId,title)}}>进入任务 <ArrowRightOutlined/></Button></Form></section>:<>
    <section className="carry-task-head"><span className="carry-eyebrow">{currentBinding?.name??'实例待连接'} · {currentSession?.workspaceName??'原工作区'}</span><h1>{task.title.length>95?task.title.split("。")[0]+"。":task.title}</h1>{task.title.length>95&&<Collapse ghost items={[{key:"task-details",label:"查看完整任务要求",children:<p>{task.title}</p>}]} />}<p>材料送往 <button className="carry-link" onClick={openSession}>{currentSession?.title??'原任务会话'}</button></p></section>
    <nav className="carry-mode" aria-label="工作区域"><button aria-selected={mode==='task'} onClick={()=>setMode('task')}>本次使用</button><button aria-selected={mode==='learning'} onClick={()=>setMode('learning')}>处理学习 <span>{task.learning.length}</span></button></nav>
    {mode==='task'?<div className="carry-task-grid"><section className="carry-methods"><div className="carry-section-heading"><h2>找合适的方法</h2><span className="carry-meta">最多 3 个候选</span></div><form className="carry-search" onSubmit={e=>{e.preventDefault();act('find',task.id,query)}}><Input aria-label="检索方法" value={query} maxLength={400} onChange={e=>setQuery(e.target.value)} placeholder="描述本次需要的方法"/><Button htmlType="submit" icon={<SearchOutlined/>} loading={busy} disabled={!query.trim()||!!view.issue}>查找</Button></form>
     {!task.candidates.length?<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={task.query?'没有合适候选，试着说明更具体的任务。':'先查少量相关方法，再决定是否使用。'}/>:<div className="carry-candidates">{task.candidates.map((c,i)=><button key={c.id} className={'carry-candidate'+(task.selection?.assetId===c.id?' selected':'')} disabled={busy||!!view.issue} onClick={()=>act('read',task.id,c.id)}><span className="carry-number">0{i+1}</span><span><b>{c.title}</b><span className="carry-candidate-summary">{c.summary}</span><small>{c.reason}</small><small>{c.scope.join(" / ")||"按本次任务匹配"} · 来自当前实例</small></span>{task.selection?.assetId===c.id?<CheckOutlined/>:<ArrowRightOutlined/>}</button>)}</div>}
     {task.selection&&<div ref={selection} className="carry-selected"><div className="carry-section-heading"><h3>{task.selection.title}</h3><Tag color="green">本次选用</Tag></div><Collapse ghost items={[{key:'body',label:'查看方法正文与版本',children:<><Reading>{task.selection.body}</Reading><p className="carry-path">{task.selection.source}</p><p className="carry-meta">正文版本 {task.selection.hash.slice(0,16)}</p></>}]} /><Form layout="vertical"><Form.Item label="仅用于这次的要求"><Input.TextArea aria-label="仅用于这次的要求" autoSize={{minRows:4,maxRows:9}} value={overrides} maxLength={1600} onChange={e=>setOverrides(e.target.value)} data-lenis-prevent/></Form.Item></Form><p className="carry-meta">这里的调整不会写入长期偏好。材料进入会话队列；若会话正在运行，将在后续轮次应用。</p><Button type="primary" loading={busy} onClick={deliver} disabled={!!view.issue}>{task.deliveries.some(d=>d.state==='uncertain')?'重试原材料投递':'将材料送入目标会话'} <ArrowRightOutlined/></Button></div>}
    </section><section className="carry-outcome"><div className="carry-section-heading"><h2>材料与成果</h2><Button icon={<ReloadOutlined/>} onClick={()=>act('observe',task.id)} loading={busy} disabled={!task.deliveries.length||!!view.issue}>读取成果</Button></div>
     {!task.deliveries.length?<p className="carry-empty-copy">送入材料后，这里会显示实际会话记录与成果引用。</p>:<>{task.deliveries.map(d=><Evidence key={d.operationId}><b>{d.userSeq?'已在会话中回读材料':d.state==='uncertain'?'投递回执暂不明确':'Harness 已接收，等待回读'}</b><span>{d.userSeq?`材料记录 #${d.userSeq}`:'接收回执不等于模型完成任务'}</span><span className="carry-meta">{d.overrides||'无额外临时要求'}</span></Evidence>)}</>}
     {task.artifacts.map((a,i)=><section key={a.id} className="carry-artifact"><div className="carry-section-heading"><h3>成果 {task.artifacts.length>1?i+1:''}</h3><button className="carry-link" onClick={openSession}>会话 #{a.seq} ↗</button></div><Reading>{a.text}</Reading></section>)}
     {!!task.artifacts.length&&<div className="carry-actions"><Button onClick={suggest} loading={busy} disabled={task.suggestions?.some(s=>['accepted','pending'].includes(s.state))}>请会话提出学习建议</Button><Button onClick={manualDraft} disabled={busy}>自己写一条建议</Button><p className="carry-meta">建议进入草稿，经过编辑和明确选择后才处理保存。</p></div>}
     {task.suggestions?.some(s=>['accepted','pending'].includes(s.state))&&<Alert type="info" title="已请求学习建议。可打开会话查看进度，草稿出现后在“处理学习”中编辑。"/>}
     {!!task.learning.length&&<Button type="primary" onClick={()=>setMode('learning')}>查看 {task.learning.length} 条学习建议 <ArrowRightOutlined/></Button>}
    </section></div>:candidate?<><Select aria-label="学习建议" className="carry-learning-select" value={candidate.id} onChange={setLearning} options={task.learning.map(c=>({value:c.id,label:c.request.title+(c.receipt?' · 已处理':' · 待编辑')}))}/><LearningEditor key={candidate.id} candidate={candidate} task={task} act={act} busy={busy} openSession={openSession}/></>:<Empty description="还没有学习建议。先查看真实成果，再请会话提出建议或自己编写。"><Button onClick={()=>setMode('task')}>返回本次使用</Button></Empty>}
    {!!task.artifacts.length&&<Collapse className="carry-relationships" destroyOnHidden items={[{key:'relations',label:'查看方法、材料、成果与学习的引用关系',children:<Relations task={task}/>}]} />}
   </>}
  </div></div>
  <Modal title="连接已有 AI Carry 实例" open={bindOpen} onCancel={()=>setBindOpen(false)} footer={null}><p>输入已经建立的 AI Carry 2.2.0 实例目录。开发母版或空模板不能用作实例。</p><Form layout="vertical" onFinish={async()=>{const v=await act('bind',root);if(v){setBinding(v.bindings.at(-1)!.id);setRoot('');setBindOpen(false)}}}><Form.Item label="实例完整路径"><Input aria-label="实例完整路径" value={root} onChange={e=>setRoot(e.target.value)} placeholder="粘贴本机实例目录路径"/></Form.Item><Button type="primary" htmlType="submit" loading={busy} disabled={!root.trim()}>连接实例</Button></Form>{error&&<Alert type="error" title={error}/>}<div className="carry-bindings">{view.bindings.map(b=><div key={b.id}><b>{b.name}</b><p className="carry-path">{b.realRoot}</p><Button onClick={()=>act('unbind',b.id)} disabled={busy}>解除连接</Button></div>)}</div><p className="carry-meta">解除连接和卸载均保留实例文件、任务成果与草稿。</p></Modal>
 </div></ConfigProvider>;
}

export const inject=['slots','locale','layout','remote','uiWorkspace'];
export async function apply(ctx:any){
 await ctx.remote.$mount(TYPERT_REMOTE);
 await ctx.inject([...inject,'remote.eh3-ai-carry'],(ctx:any)=>{
  ctx.effect(()=>{const tag=document.createElement('style');tag.dataset.pluginCss=NS;tag.textContent=css+'\n'+__CARRY_FONT_CSS__;document.head.appendChild(tag);return()=>tag.remove()},'eh3-ai-carry.styles');
  ctx.effect(()=>ctx.locale.register(NS,{zh:{title:'AI Carry'},en:{title:'AI Carry'}}));
  ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:NS,label:'AI Carry',order:30},Icon));
  ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:NS},()=> <App ctx={ctx}/>));
 });
}
declare const __CARRY_FONT_CSS__:string;
