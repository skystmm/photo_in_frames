import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const dest=new URL('../dist/',import.meta.url);
await mkdir(dest,{recursive:true});
for(const item of ['index.html','styles.css','src','assets'])await cp(new URL(item,root),new URL(item,dest),{recursive:true});
const html=await readFile(new URL('index.html',dest),'utf8');
if(!html.includes('src/app.js'))throw new Error('Application entry missing');
await writeFile(new URL('build-info.json',dest),JSON.stringify({name:'hangzhou-photo-map',builtAt:new Date().toISOString(),type:'static'},null,2));
console.log('Built static website → dist/');
