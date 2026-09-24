const {_electron}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'logicflow-run-now-'));
 const watch=path.join(temp,'Inbox'),data=path.join(temp,'profile');
 const config={Version:1,WatchFolder:watch,Destination:path.join(watch,'Organized'),Unclassified:path.join(watch,'Review'),Interval:30,Enabled:false,ExcludedFolders:['Keep'],Protected:[],Groups:[],Rules:[],RootCategories:true,LaunchAtLogin:false,Extensions:[{Folder:'Documents',Extensions:'.txt'}]};
 await fs.mkdir(data);await fs.mkdir(watch);await fs.mkdir(path.join(watch,'Keep'));
 await fs.mkdir(path.join(watch,'Whole folder','nested'),{recursive:true});
 await fs.writeFile(path.join(watch,'Whole folder','nested','inside.txt'),'intact');
 await fs.writeFile(path.join(watch,'Keep','untouched.txt'),'protected');
 const old=new Date(Date.now()-120000);
 const oldFile=async name=>{await fs.writeFile(path.join(watch,name),'original');await fs.utimes(path.join(watch,name),old,old);};
 await oldFile('notes.txt');await oldFile('changing.txt');await fs.utimes(path.join(watch,'Whole folder'),old,old);
 await fs.writeFile(path.join(data,'settings.json'),JSON.stringify(config));
 let app;
 try{
  app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron'),args:['--no-sandbox',path.resolve('qa/integration-host.cjs')],env:{...process.env,DISPLAY:process.env.DISPLAY||'127.0.0.1:103',LOGICFLOW_TEST_DATA:data}});
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('heading',{name:'Everything in its place'}).waitFor();
  await app.evaluate((_electron,workerPath)=>{
   const Worker=global.__logicflowWorker;
   global.__actions=[];const send=Worker.prototype.send;
   Worker.prototype.send=function(action,...args){global.__actions.push(action);return send.call(this,action,...args);};
  },path.resolve('src/worker.cjs'));
  const state=()=>page.evaluate(()=>window.logicflow.state());
  const refresh=async()=>{await page.getByRole('button',{name:'Refresh preview',exact:true}).click();await page.getByText('Preview updated. No files moved.',{exact:true}).waitFor();};
  const begin=async()=>{await page.getByRole('button',{name:'Run Now',exact:true}).click();await page.locator('#ask-yes').click();await page.getByRole('button',{name:'Cancel run',exact:true}).waitFor();};
  await refresh();
  await page.getByRole('button',{name:'Run Now',exact:true}).click();await page.locator('#ask-no').click();
  assert.equal((await state()).runOnce,null);
  await begin();assert.equal((await state()).runOnce.phase,'waiting');
  await page.getByRole('button',{name:'Cancel run',exact:true}).click();
  assert.equal((await state()).runOnce,null);assert.equal(await fs.readFile(path.join(watch,'notes.txt'),'utf8'),'original');
  // Switching from automatic to Run Now must clear the recurring scan timer.
  await page.getByRole('button',{name:'Start automatic',exact:true}).click();await page.locator('#ask-yes').click();
  await page.getByRole('button',{name:'Pause automatic',exact:true}).waitFor();
  await begin();assert.equal((await state()).running,false);
  console.log('Run Now is checking the original batch for 30 seconds.');
  await oldFile('later.txt');await fs.appendFile(path.join(watch,'changing.txt'),' changed during check');
  await page.setViewportSize({width:980,height:720});
  await page.screenshot({path:'qa/run-now-checking.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const deadline=Date.now()+45000;
  while(true){const current=await state();if(!current.runOnce&&current.lastRun)break;assert(Date.now()<deadline,'Run Now must finish');await new Promise(resolve=>setTimeout(resolve,250));}
  const completed=await state();
  assert.equal(completed.running,false);assert.equal(completed.runOnce,null);
  assert.equal(completed.lastRun.Moved,2);assert.equal(completed.lastRun.Skipped,1);assert.equal(completed.lastRun.Errors,0);
  assert.equal(await fs.readFile(path.join(config.Destination,'Documents','notes.txt'),'utf8'),'original');
  assert.equal(await fs.readFile(path.join(config.Unclassified,'Whole folder','nested','inside.txt'),'utf8'),'intact');
  assert.equal(await fs.readFile(path.join(watch,'Keep','untouched.txt'),'utf8'),'protected');
  assert.equal(await fs.readFile(path.join(watch,'later.txt'),'utf8'),'original');
  assert.match(await fs.readFile(path.join(watch,'changing.txt'),'utf8'),/changed during check/);
  await page.getByRole('button',{name:'Start automatic',exact:true}).waitFor();
  await page.screenshot({path:'qa/run-now-complete.png'});
  const before=await app.evaluate(()=>global.__actions.length);
  await oldFile('after-completion.txt');
  console.log('One batch completed and paused. Verifying no further scans for 32 seconds.');
  await new Promise(resolve=>setTimeout(resolve,32000));
  assert.equal(await app.evaluate(()=>global.__actions.length),before,'no worker requests after completion');
  assert.equal(await fs.readFile(path.join(watch,'after-completion.txt'),'utf8'),'original');
  // An error while preparing a later run must leave the app stopped as well.
  await refresh();
  await app.evaluate((_electron,workerPath)=>{
   const Worker=global.__logicflowWorker;
   const send=Worker.prototype.send;
   Worker.prototype.send=function(action,...args){if(action==='prepare-once')return Promise.reject(new Error('Test preparation error'));return send.call(this,action,...args);};
  },path.resolve('src/worker.cjs'));
  await page.getByRole('button',{name:'Run Now',exact:true}).click();await page.locator('#ask-yes').click();
  await page.getByText('Test preparation error',{exact:true}).waitFor();
  assert.equal((await state()).runOnce,null);assert.equal((await state()).running,false);
  assert.deepEqual(errors,[]);
  console.log('PASS: Run Now confirmation/cancellation, real 30-second readiness check, original-batch limit, changed-file skip, intact folders, automatic-to-once transition, stopped timers, error cleanup, and compact UI.');
 }finally{if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
