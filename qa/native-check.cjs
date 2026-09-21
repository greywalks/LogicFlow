const {_electron}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const temp=await fs.mkdtemp(path.join(os.tmpdir(),'logicflow-native-')),watch=path.join(temp,'Inbox'),data=path.join(temp,'data');await fs.mkdir(watch);await fs.writeFile(path.join(watch,'notes.txt'),'keep me');await fs.mkdir(path.join(watch,'Personal'));
let app;try{
 app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron'),args:['--no-sandbox',path.resolve('qa/integration-host.cjs')],env:{...process.env,DISPLAY:process.env.DISPLAY||'127.0.0.1:94',LOGICFLOW_TEST_DATA:data,LOGICFLOW_PWSH:process.env.LOGICFLOW_PWSH||'pwsh'}});
 const p=await app.firstWindow();p.on('pageerror',e=>{throw e;});await p.getByRole('heading',{name:'Where should LogicFlow work?'}).waitFor();
 await app.evaluate(({dialog},watch)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[watch]});},watch);
 await p.locator('[data-action="choose-watch"]').click();
 for(let i=0;i<3;i++)await p.getByRole('button',{name:'Continue',exact:true}).click();
 await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},path.join(watch,'Personal'));
 await p.getByRole('button',{name:'Choose a folder',exact:true}).click();await p.getByText('Personal',{exact:true}).waitFor();
 await p.getByRole('button',{name:'Continue',exact:true}).click();await p.getByRole('button',{name:'Finish setup',exact:true}).click();await p.getByRole('heading',{name:'Everything in its place'}).waitFor();
 assert.equal(await fs.readFile(path.join(watch,'notes.txt'),'utf8'),'keep me');const saved=JSON.parse(await fs.readFile(path.join(data,'settings.json')));assert.equal(saved.WatchFolder,watch);assert.deepEqual(saved.ExcludedFolders,['Personal']);assert.equal(saved.Enabled,false);
 await p.getByRole('button',{name:'Start organizing',exact:true}).click();await p.locator('#ask-yes').click();await p.getByRole('button',{name:'Pause',exact:true}).waitFor();await p.getByRole('button',{name:'Pause',exact:true}).click();assert.equal(await fs.readFile(path.join(watch,'notes.txt'),'utf8'),'keep me');
 await p.getByRole('button',{name:'Custom rules',exact:true}).click();await p.getByRole('button',{name:'Add a rule',exact:true}).click();await p.locator('#item-words').fill('notes');await p.locator('#item-folder').fill('My notes');await p.locator('#item-form button[type=submit]').click();await p.locator('.footer [data-action="save"]').click();await p.getByRole('button',{name:'Overview',exact:true}).click();await p.getByRole('button',{name:'Refresh preview',exact:true}).click();await p.getByText('Custom rule',{exact:true}).waitFor();
 await Promise.all([app.waitForEvent('close'),p.getByRole('button',{name:'Exit LogicFlow',exact:true}).click().catch(e=>{if(!e.message.includes('closed'))throw e;})]);app=null;
 assert.equal(JSON.parse(await fs.readFile(path.join(data,'settings.json'))).Rules[0].Subfolder,'My notes');
 console.log('PASS: actual Electron main/preload/PowerShell IPC, first-run setup, native-dialog selection results, preview, saved exclusions, start/pause and custom rule persistence.');
 }finally{if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exit(1);});
