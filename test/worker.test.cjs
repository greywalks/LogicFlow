const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {Worker}=require('../src/worker.cjs');
test('real worker handles configurable source, custom rules, preview and exclusions without moving',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'logicflow-worker-'));const w=new Worker(path.join(__dirname,'..','engine','Worker.ps1'));
 try{const watch=path.join(root,'Chosen folder');await fs.mkdir(watch);await fs.writeFile(path.join(root,'Outside.pdf'),'untouched');await fs.writeFile(path.join(watch,'holiday 092026.pdf'),'image');await fs.mkdir(path.join(watch,'Leave me'));await fs.writeFile(path.join(watch,'Leave me','nested.pdf'),'nested');
 const c=await w.send('defaults',{watch});assert.equal(c.WatchFolder,watch);assert.equal(c.Groups.length,0);assert.equal(c.Rules.length,0);c.ExcludedFolders=['Leave me'];c.Rules=[{Priority:1,Scope:'*',Words:'holiday',Subfolder:'Trips',Dated:true,Kind:'Files'}];
 await w.send('validate',{config:c});const rows=await w.send('preview',{config:c});assert.equal(rows.length,1);assert.equal(rows[0].Folder,path.join(c.Destination,'Trips','092026'));assert.equal(await fs.readFile(path.join(root,'Outside.pdf'),'utf8'),'untouched');assert.equal(await fs.readFile(path.join(watch,'Leave me','nested.pdf'),'utf8'),'nested');await fs.access(path.join(watch,'holiday 092026.pdf'));
 await assert.rejects(w.send('validate',{config:{...c,WatchFolder:path.join(root,'missing')}}),/existing folder/);
 await assert.rejects(w.send('validate',{config:{...c,Destination:watch}}),/destination cannot/);
 await assert.rejects(w.send('validate',{config:{...c,Extensions:[{Folder:'../escape',Extensions:'.pdf'}]}}),/folder name/);
 await w.send('reset');const res=await w.send('cycle',{config:c,log:path.join(root,'log.jsonl')});assert.equal(res.Moved,0);assert.equal(res.Waiting,1);
 }finally{w.close();await fs.rm(root,{recursive:true,force:true});}
});
