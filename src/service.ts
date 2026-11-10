import { TypertRemoteService, Remote, RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { defineTool } from '@deepseek-ai/dsh-tools';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-api-session-controller';
import type {} from '@deepseek-ai/dsh-workspace';
import type {SessionPromptRequest,SessionPageRequest} from '@deepseek-ai/dsh-api-session-controller/types';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { realpathSync } from 'node:fs';
import { z } from 'zod';
import { CarryCore, CarryError, assertWorkspaceTarget } from './core.mjs';
import type { View, DraftInput, SessionOption, EntryView, AssetDetail } from './types.ts';
export interface Config {stateDirectory?:string}

declare module '@deepseek-ai/dsh-typert-protocol' {interface RemoteErrorDetailsMap {'eh3-ai-carry/rejected':{reason:string}}}
const signal=()=>new AbortController().signal;
function textOf(event:unknown):string{
  const data=(event as {data?:{content?:unknown[];message?:{content?:unknown[]};stream?:unknown[]}}).data;
  const content=data?.content??data?.message?.content;
  if(content)return content.map(part=>{const p=part as {type?:string;text?:string};return p.type==='text'?p.text??'':''}).join('\n');
  return '';
}
/** Host owner for the generated AI Carry Remote endpoints. */
export default class AiCarry extends TypertRemoteService {
  static inject=['tools','sessionController','workspaceRegistry'];
  static Config=z.object({stateDirectory:z.string().optional().describe('Directory for task drafts and receipts. Formal assets stay in their bound instances.')});
  private core:CarryCore;
  constructor(ctx:Context,config:Config={}){
    super(ctx,'eh3AiCarry',{namespace:'eh3-ai-carry'});
    this.core=new CarryCore(config.stateDirectory??resolve(homedir(),'.ai-carry','harness-control'),{
      check:async(sessionId,workspaceId,instanceRoot)=>{
        const workspace=ctx.workspaceRegistry.list().find(w=>w.id===workspaceId);
        if(!workspace||!workspace.sessionIds.some(id=>id===sessionId))throw new CarryError('session','目标会话已不属于所选工作区，请重新选择。');
        if(instanceRoot)assertWorkspaceTarget(workspace,sessionId,instanceRoot);
      },
      prompt:(sessionId,requestId,text)=>ctx.sessionController.prompt({sessionId:sessionId as SessionPromptRequest['sessionId'],requestId:requestId as SessionPromptRequest['requestId'],mode:'queue',content:[{type:'text',text}]} as SessionPromptRequest,signal()),
      events:async(sessionId)=>{
        const page=await ctx.sessionController.events({address:{kind:'session',sessionId},maxMessages:100} as SessionPageRequest,signal());
        return page.records.map(record=>record.event);
      },text:textOf,
    });
    ctx.effect(()=>()=>this.core.close(),'eh3-ai-carry.control-store');
    ctx.tools.register(defineTool({name:'eh3_ai_carry_status',description:'Read AI Carry plugin connectivity. Does not grant permission or save learning.',parameters:{},output:{schema:{type:'json'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},execute:async()=>this.ping()}));
    ctx.tools.register(defineTool({
      name:'eh3_ai_carry_task',description:'Use AI Carry in the caller’s bound task. find returns at most 3 methods; read loads a current selection; adjust changes this task only; deliver queues frozen material using a stable operation id; observe reads real output. Human learning choices and instance permission changes are unavailable to this tool.',
      parameters:{action:{type:'string',required:true,enum:['find','read','adjust','deliver','observe','status']},taskId:{type:'string',required:true},value:{type:'string'}},
      output:{schema:{type:'json'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},
      execute:async(args,exec)=>{
        const task=this.core.view(args.taskId).task;
        if(!exec.agent||task?.sessionId!==exec.agent.id)throw new CarryError('session','Tool caller does not own this task');
        let result:View;
        switch(args.action){case 'find':result=this.core.find(args.taskId,args.value??'');break;case 'read':result=this.core.read(args.taskId,args.value??'');break;case 'adjust':result=this.core.adjust(args.taskId,args.value??'');break;case 'deliver':result=await this.core.deliver(args.taskId,args.value??'');break;case 'observe':result=await this.core.observe(args.taskId);break;default:result=this.core.view(args.taskId);}
        return JSON.parse(JSON.stringify(result.task));
      },
    }));
    ctx.tools.register(defineTool({name:'eh3_ai_carry_learning',description:'Draft a sourced AI Carry learning suggestion or preview its exact formal content. Only a registered artifact from this bound task is accepted. This tool never approves or saves learning; recovery only reconciles an already recorded user decision.',parameters:{action:{type:'string',required:true,enum:['propose','preview','recover']},taskId:{type:'string',required:true},sourceId:{type:'string'},candidateId:{type:'string'},draft:{type:'string',description:'For propose: JSON object with kind, title, summary, triggers, scope, steps and optional failure_handling/completion_checks.'}},output:{schema:{type:'json'},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},execute:async(args,exec)=>{
      const task=this.core.view(args.taskId).task;if(!exec.agent||task?.sessionId!==exec.agent.id)throw new CarryError('session','Tool caller does not own this task');
      let result:View;
      if(args.action==='propose'){if(!args.draft||args.draft.length>16000)throw new CarryError('invalid','学习草稿为空或过长。');result=this.core.propose(args.taskId,args.sourceId??'',JSON.parse(args.draft));}
      else if(args.action==='preview')result=this.core.preview(args.taskId,args.candidateId??'');
      else result=await this.core.recover(args.taskId,args.candidateId??'');
      return JSON.parse(JSON.stringify(result.task));
    }}));
  }
  private user(){if(this.ctx.invocation?.peer.principal.kind!=='owner')throw new RemoteError('eh3-ai-carry/rejected','请由当前用户在插件中执行这项操作。',{reason:'user-required'});}
  private async run<T>(work:()=>T|Promise<T>):Promise<T>{try{return await work();}catch(error){if(error instanceof CarryError)throw new RemoteError('eh3-ai-carry/rejected',error.message,{reason:error.code});const e=error as Error & {code?:string};if(['ENOENT','EACCES','EPERM','EBUSY'].includes(e.code??''))throw new RemoteError('eh3-ai-carry/rejected','暂时无法访问实例文件。请检查目录是否可用；已有成果和草稿已保留。',{reason:e.code??'file'});throw error;}}
  @Remote('ping') ping():{product:string;version:string;connectedAt:string}{return {product:'AI Carry',version:'0.3.0',connectedAt:new Date().toISOString()};}
  @Remote('entry') entry(workspaceId:string):Promise<EntryView>{this.user();return this.run(()=>{if(!workspaceId)return this.core.entry();const w=this.ctx.workspaceRegistry.list().find(w=>w.id===workspaceId);if(!w)throw new CarryError('workspace','这个工作区已不存在，请从 Harness 工作区重新打开。');return this.core.entry({id:w.id,path:w.path,name:w.title});});}
  @Remote('assetDetail') assetDetail(workspaceId:string,assetId:string,bindingId:string):Promise<AssetDetail>{this.user();return this.run(()=>{const w=this.ctx.workspaceRegistry.list().find(w=>w.id===workspaceId);if(!w)throw new CarryError('workspace','这个工作区已不存在，请重新打开。');return this.core.assetDetail({id:w.id,path:w.path,name:w.title},assetId,bindingId);});}
  @Remote('openInstance') openInstance(bindingId:string):Promise<EntryView>{this.user();return this.run(async()=>{const b=this.core.binding(bindingId);const w=await this.ctx.workspaceRegistry.create(b.realRoot,b.name);return this.core.entry({id:w.id,path:w.path,name:w.title});});}
  @Remote('openRoot') openRoot(root:string):Promise<EntryView>{this.user();return this.run(async()=>{const v=this.core.bind(root);const physicalRoot=realpathSync(root);const b=v.bindings.find(b=>b.realRoot===physicalRoot);if(!b)throw new CarryError('binding','实例目录未能连接，请重新检查。');const w=await this.ctx.workspaceRegistry.create(b.realRoot,b.name);return this.core.entry({id:w.id,path:w.path,name:w.title});});}
  @Remote('view') view(taskId:string):Promise<View>{this.user();return this.run(()=>this.core.view(taskId||undefined));}
  @Remote('bind') bind(root:string):Promise<View>{this.user();return this.run(()=>this.core.bind(root));}
  @Remote('unbind') unbind(bindingId:string):Promise<View>{this.user();return this.run(()=>this.core.unbind(bindingId));}
  @Remote('sessions') async sessions():Promise<SessionOption[]>{this.user();const rows=await this.ctx.sessionController.list({},signal());const workspaces=this.ctx.workspaceRegistry.list();return rows.items.filter(x=>x.origin!=='subagent').flatMap(row=>{const w=workspaces.find(w=>w.sessionIds.includes(row.sessionId));const title=row.projections?.values.title;return w?[{id:row.sessionId,title:typeof title==='string'&&title?title:'未命名会话',workspaceId:w.id,workspaceName:w.title,running:row.running}]:[];});}
  @Remote('openTask') openTask(bindingId:string,sessionId:string,workspaceId:string,title:string):Promise<View>{this.user();return this.run(()=>this.core.openTask(bindingId,sessionId,workspaceId,title));}
  @Remote('find') find(taskId:string,query:string):Promise<View>{this.user();return this.run(()=>this.core.find(taskId,query));}
  @Remote('read') read(taskId:string,assetId:string):Promise<View>{this.user();return this.run(()=>this.core.read(taskId,assetId));}
  @Remote('adjust') adjust(taskId:string,overrides:string):Promise<View>{this.user();return this.run(()=>this.core.adjust(taskId,overrides));}
  @Remote('deliver') deliver(taskId:string,operationId:string):Promise<View>{this.user();return this.run(()=>this.core.deliver(taskId,operationId));}
  @Remote('observe') observe(taskId:string):Promise<View>{this.user();return this.run(()=>this.core.observe(taskId));}
  @Remote('suggest') suggest(taskId:string,sourceId:string,operationId:string):Promise<View>{this.user();return this.run(()=>this.core.suggest(taskId,sourceId,operationId));}
  @Remote('propose') propose(taskId:string,sourceId:string,request:DraftInput):Promise<View>{this.user();return this.run(()=>this.core.propose(taskId,sourceId,request));}
  @Remote('edit') edit(taskId:string,candidateId:string,expectedRevision:number,request:DraftInput):Promise<View>{this.user();return this.run(()=>this.core.edit(taskId,candidateId,expectedRevision,request));}
  @Remote('preview') preview(taskId:string,candidateId:string):Promise<View>{this.user();return this.run(()=>this.core.preview(taskId,candidateId));}
  @Remote('decide') decide(taskId:string,candidateId:string,previewId:string,revision:number,choice:'keep'|'observe'|'remind'|'discard'|'once',operationId:string,remindAt:string):Promise<View>{this.user();return this.run(()=>this.core.decide(taskId,candidateId,previewId,revision,choice,operationId,remindAt,'user'));}
  @Remote('recheck') recheck(taskId:string,candidateId:string):Promise<View>{this.user();return this.run(()=>this.core.recheck(taskId,candidateId));}
  @Remote('recover') recover(taskId:string,candidateId:string):Promise<View>{this.user();return this.run(()=>this.core.recover(taskId,candidateId));}
}

