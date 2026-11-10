import {CarryCore} from '../src/core.mjs';
const [directory,taskId,candidateId,previewId]=process.argv.slice(2);
const core=new CarryCore(directory,{});
const persist=core.persist.bind(core);
core.persist=()=>{if(Object.values(core.state.operations).some(op=>op.kind==='save'&&op.state==='committed'))process.exit(23);persist();};
await core.decide(taskId,candidateId,previewId,1,'keep','crash-save','','user');
throw new Error('Crash checkpoint was not reached');
