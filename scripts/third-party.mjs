import {readFile,readdir,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
const roots=new Set();
for(const name of ['client','client.graph','client.canvas']){
 const meta=JSON.parse(await readFile(`.build/${name}.meta.json`,'utf8'));
 for(const input of Object.keys(meta.inputs)){
  if(!input.startsWith('node_modules/'))continue;
  let dir=dirname(resolve(input));
  while(dir.startsWith(resolve('node_modules'))){try{const p=JSON.parse(await readFile(resolve(dir,'package.json'),'utf8'));if(p.name){roots.add(dir);break;}}catch{}dir=dirname(dir)}
 }
}
const rows=[],missing=[];await mkdir('licenses/dependencies',{recursive:true});
for(const root of [...roots].sort()){
 const p=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));const names=(await readdir(root)).filter(x=>/^(license|licence|copying|notice)(\.|$)/i.test(x));
 const outputs=[];
 for(const name of names){if(!(await stat(resolve(root,name))).isFile())continue;const output=`licenses/dependencies/${p.name.replaceAll('/','__')}-${name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await writeFile(output,await readFile(resolve(root,name)));outputs.push(output);}
 if(!outputs.length){const supplied=(await readdir('licenses/dependencies')).filter(n=>n.startsWith(p.name.replaceAll('/','__')+'-'));const versioned=supplied.filter(n=>n.includes('-'+p.version+'-'));for(const n of versioned.length?versioned:supplied)outputs.push('licenses/dependencies/'+n);}
 if(!outputs.length&&['gsap','@gsap/react'].includes(p.name))outputs.push('licenses/GSAP-Standard-License.txt');
 if(!outputs.length)missing.push({name:p.name,root:relative(process.cwd(),root),license:p.license});
 rows.push({name:p.name,version:p.version,license:p.license,notices:outputs});
}
await writeFile('THIRD_PARTY_LICENSES.md','# Third-party components\n\nThis prebuilt plugin includes the following production browser code. React, ReactDOM and Harness services are supplied by the host. AI Carry public core modules are Apache-2.0; see NOTICE and vendor/ai-carry/PROVENANCE.json. MiSans 400/500/600 is embedded unchanged under the Xiaomi MiSans license as part of this application; see licenses/MiSans-License.pdf and assets/fonts/manifest.json. It is not Apache-2.0 and may not be redistributed as a standalone font package. GSAP and @gsap/react use the GSAP Standard No Charge License, not MIT; see licenses/GSAP-Standard-License.txt.\n\n| Package | Version | License | Notice |\n|---|---|---|---|\n'+rows.map(p=>`| ${p.name} | ${p.version} | ${typeof p.license==='string'?p.license:JSON.stringify(p.license)} | ${p.notices.map(f=>`[text](${f})`).join(', ')} |`).join('\n')+'\n');
await writeFile('.build/third-party.json',JSON.stringify({rows,missing},null,2));
console.log(JSON.stringify({bundledPackages:rows.length,missing},null,2));
