import ts from 'typescript';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import './generate-remote.mjs';
await mkdir('lib',{recursive:true});
await build({entryPoints:['src/index.ts'],bundle:true,outfile:'lib/index.js',format:'esm',platform:'node',target:'node24',packages:'external'});
await mkdir('lib/types',{recursive:true});
await writeFile('lib/types/types.d.ts',await readFile('src/types.ts','utf8'));
await writeFile('lib/types/types.js','export {};\n');
const font=await readFile('assets/fonts/NotoSansSC-variable.woff2');
const fontCss=`@font-face{font-family:'AI Carry Sans';font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2')}`;
for(const [entry,name] of [['src/client.tsx','client'],['src/graph.ts','client.graph'],['src/canvas.ts','client.canvas']]){
 const result=await build({entryPoints:[entry],bundle:true,outfile:`lib/${name}.js`,write:false,format:'cjs',platform:'browser',target:'es2022',external:['react','react/*','react-dom','react-dom/*','zod'],loader:{'.css':'text'},define:{__CARRY_FONT_CSS__:JSON.stringify(fontCss)},minify:true,legalComments:'external',metafile:true});
 const id=name==='client'?'eh3-dsh-ai-carry':`eh3-dsh-ai-carry/${name}.js`;
 await writeFile(`lib/${name}.js`,`window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory(require){const module={exports:{}};const exports=module.exports;\n${result.outputFiles.find(f=>f.path.endsWith('.js')).text}\nreturn module.exports;}});\n`);
 await writeFile(`.build/${name}.meta.json`,JSON.stringify(result.metafile));
 const legal=result.outputFiles.find(f=>f.path.endsWith('.LEGAL.txt'));if(legal)await writeFile(`lib/${name}.LICENSE.txt`,legal.text);
}
