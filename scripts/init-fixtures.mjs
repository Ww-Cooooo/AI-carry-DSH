import { cp, mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { executeFirstInstantiation } from '../vendor/ai-carry/dashboard/scripts/first-instantiation-transaction.mjs';
import { prepare, confirm, stableReadJson } from '../vendor/ai-carry/dashboard/scripts/learning-save-cli.mjs';
const seed={kind:'sop',title:'内容提纲整理',summary:'先辨认读者与问题，再把材料整理成有证据的内容提纲',triggers:['整理内容提纲','写内容提纲'],aliases:['内容创作提纲'],scope:['内容创作','用户提供的资料'],steps:['明确读者与要回答的问题','列出三个有材料支持的要点','依次写开头、主体和结尾，并保留事实出处'],failure_handling:['材料不足时标明待核实部分'],completion_checks:['要点之间顺序清楚，每个事实有依据']};
await mkdir('fixtures/runtime-data',{recursive:true});
for(const label of ['A','B']){
  const root=resolve('fixtures/runtime-data',label);
  try{await access(resolve(root,'.eh3-fixture-created'));console.log(`${label}: retained existing fixture`);continue;}catch{}
  await mkdir(root,{recursive:true});await cp('fixtures/template',root,{recursive:true,force:false});
  for(const dir of ['instance/profile','instance/memory','instance/sops','instance/capabilities','instance/experiences','instance/todo','instance/deferred','instance/governance','instance/skills','instance/components','core/maps','dashboard/public','dashboard/dist','dashboard/scripts'])await mkdir(resolve(root,dir),{recursive:true});
  await cp('vendor/ai-carry/dashboard/scripts',resolve(root,'dashboard/scripts'),{recursive:true});
  await writeFile(resolve(root,'AGENTS.md'),'# Isolated AI Carry test instance\nNo private user material. Use only supplied fixture content.\n');
  await writeFile(resolve(root,'BOOTSTRAP.md'),'# Test instance\nRead the verified startup capsule before using the explicit test methods.\n');
  await writeFile(resolve(root,'core/maps/root-map.toml'),'schema_version = 1\n');
  const request={schema_version:1,guidance_mode:'balanced',language:'zh-CN',learning_policy:'risk-tiered',display_name:`测试实例 ${label}`,mission:'整理公开资料与内容提纲。',direction:{type:'domain',domain_id:'content-work',label:'内容整理',scope_statement:'整理资料、形成提纲并核对结果。'},first_task:{title:'整理第一份内容提纲',summary:'形成有材料依据的内容提纲。',trigger:'开始整理内容',aliases:[],scope:[],conditions:[],excludes:[],start_after_instantiation:false},profile:{in_scope:['内容整理'],out_of_scope:['代替用户发布'],automation:[],privacy:['只使用测试资料'],learning:['记录经过确认的可复用方法'],environment:[],unknowns:[]},host:{label:'Harness 插件测试',product_name:'',product_version:'',model_name:'',model_selection_label:'',request_model_name:'',model_routing_mode:'unknown',model_observation_basis:[],environment:'isolated',observation_basis:'current-session',integration_mode:'direct-workspace',match_hint:'isolated',limitations:[]}};
  const created=executeFirstInstantiation(root,request,{testIdentity:{instanceId:`eh3-fixture-${label.toLowerCase()}`,createdAt:new Date().toISOString()}});
  await writeFile(resolve(root,'.eh3-initialization-receipt.json'),JSON.stringify(created,null,2));
  const requestFile=resolve(root,'.eh3-seed-request.json');await writeFile(requestFile,JSON.stringify(seed));
  const preview=prepare(root,stableReadJson(requestFile,'test seed'));
  const result=preview.confirmationRef?confirm(root,stableReadJson(requestFile,'test seed'),{confirmationRef:preview.confirmationRef,choice:'keep',userReply:'留下'}):preview;
  await writeFile(resolve(root,'.eh3-seed-receipt.json'),JSON.stringify(result,null,2));
  if(!result.decision.startsWith('learning-save-complete'))throw new Error(JSON.stringify(result));
  await writeFile(resolve(root,'.eh3-fixture-created'),'Synthetic content; initialized and seeded through the official transactions.\n');
  console.log(JSON.stringify({label,initialization:created.decision,seed:result.decision,assetId:result.assetId}));
}
