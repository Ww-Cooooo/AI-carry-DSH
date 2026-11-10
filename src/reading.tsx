import React from 'react';
export function Reading({children}:{children:string}){
  const inline=(s:string)=>s.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part);
  return <div className="carry-reading">{children.trim().split(/\n\s*\n/).map((block,i)=>/^---+$/.test(block.trim())?<hr key={i}/>:/^#{1,4} /.test(block)?<h4 key={i}>{inline(block.replace(/^#{1,4} /,''))}</h4>:<p key={i}>{inline(block)}</p>)}</div>;
}
