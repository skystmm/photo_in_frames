import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,pathname==='/'?'index.html':`.${pathname}`);
    const extension=extname(file);
    if(!file.startsWith(root.endsWith(sep)?root:root+sep)||!types[extension]||pathname.split('/').some(p=>p.startsWith('.')&&p!=='.')){res.writeHead(404);res.end('Not found');return;}
    if(!(await stat(file)).isFile()){res.writeHead(404);res.end('Not found');return;}
    const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extension],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(content);
  }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
