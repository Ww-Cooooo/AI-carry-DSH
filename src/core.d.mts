import type {View,DraftInput} from './types.ts';
export class CarryError extends Error {code:string;constructor(code:string,message:string);}
export class CarryCore {
  close():void;
  constructor(directory:string,sessions:{check:(sessionId:string,workspaceId:string)=>Promise<void>;prompt:(sessionId:string,requestId:string,text:string)=>Promise<unknown>;events:(sessionId:string)=>Promise<unknown[]>;text:(event:unknown)=>string});
  view(taskId?:string):View; bind(root:string):View; unbind(id:string):View;
  openTask(bindingId:string,sessionId:string,workspaceId:string,title:string):Promise<View>;
  find(taskId:string,query:string):View;read(taskId:string,assetId:string):View;adjust(taskId:string,overrides:string):View;
  deliver(taskId:string,operationId:string):Promise<View>;observe(taskId:string):Promise<View>;
  suggest(taskId:string,sourceId:string,operationId:string):Promise<View>;
  propose(taskId:string,sourceId:string,request:DraftInput):View;
  edit(taskId:string,candidateId:string,expectedRevision:number,request:DraftInput):View;
  preview(taskId:string,candidateId:string):View;
  decide(taskId:string,candidateId:string,previewId:string,revision:number,choice:string,operationId:string,remindAt:string,actor:string):Promise<View>;
  recheck(taskId:string,candidateId:string):Promise<View>;
  recover(taskId:string,candidateId:string):Promise<View>;
}
