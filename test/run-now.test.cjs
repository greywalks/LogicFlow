const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Worker}=require('../src/worker.cjs');

test('one-time worker preparation waits safely and reset cancels the batch',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'logicflow-once-worker-'));
  const worker=new Worker(path.join(__dirname,'..','engine','Worker.ps1'));
  try{
    const config=await worker.send('defaults',{watch:root});
    await fs.writeFile(path.join(root,'notes.txt'),'unchanged');
    const log=path.join(root,'history.jsonl');config.Protected.push(log);
    const prepared=await worker.send('prepare-once',{config,log});
    assert.equal(prepared.Candidates,1);assert.equal(prepared.WaitMs,30000);
    await assert.rejects(worker.send('finish-once',{config,log}),/readiness check/);
    assert.equal(await fs.readFile(path.join(root,'notes.txt'),'utf8'),'unchanged');
    await worker.send('reset');
    await assert.rejects(worker.send('finish-once',{config,log}),/no one-time run/);
    assert.equal(await fs.readFile(path.join(root,'notes.txt'),'utf8'),'unchanged');
  }finally{worker.close();await fs.rm(root,{recursive:true,force:true});}
});
