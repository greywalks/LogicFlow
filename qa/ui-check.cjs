const {_electron}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{
 const browser=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron'),args:['--no-sandbox',path.resolve('qa/browser-host.cjs')],env:{...process.env,DISPLAY:'127.0.0.1:97'}});
 const page=await browser.firstWindow();await page.setViewportSize({width:1280,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const c={Version:1,WatchFolder:'C:\\Users\\Example\\Desktop',Destination:'C:\\Users\\Example\\Desktop\\Organized Files',Unclassified:'C:\\Users\\Example\\Desktop\\Unclassified Items',Groups:[],Rules:[],Extensions:[{Folder:'Documents',Extensions:'.docx;.txt;.md'},{Folder:'Spreadsheets',Extensions:'.xlsx;.csv'},{Folder:'PDFs',Extensions:'.pdf'},{Folder:'Images',Extensions:'.jpg;.png'},{Folder:'Packages',Extensions:'.zip'}],RootCategories:true,Protected:[],ExcludedFolders:[],LaunchAtLogin:false};
 let state={defaults:c,config:null,needsSetup:true,running:false,moved:0,lastCheck:null,lastError:'',version:'3.0.0'},callback=()=>{};
 window.__calls=[];
 window.logicflow={state:async()=>structuredClone(state),onState:cb=>callback=cb,validate:async c=>{for(const r of c.Rules)if(!r.Words||!r.Subfolder)throw new Error('Enter words and a folder name.');return true;},chooseFolder:async(kind)=>{window.__calls.push(kind);return kind==='excluded'?'Personal':kind==='watch'?'D:\\Inbox':kind==='rule'?'Trips':null;},save:async c=>{state={...state,config:structuredClone(c),needsSetup:false,running:false};callback(state);return state;},pause:async()=>{state.running=false;callback(state);return state;},preview:async c=>[{Name:'Trip notes.docx',Type:'File',Destination:c.Destination+'\\Documents\\Trip notes.docx',Folder:c.Destination+'\\Documents',Reason:'Extension .docx'},{Name:'holiday 092026.pdf',Type:'File',Destination:c.Destination+'\\Trips\\092026\\holiday 092026.pdf',Folder:c.Destination+'\\Trips\\092026',Reason:'Filename rule: holiday'},{Name:'Scans',Type:'Folder (intact)',Destination:c.Unclassified+'\\Scans',Folder:c.Unclassified,Reason:'No matching rule'}],start:async()=>{state.running=true;callback(state);return state;},history:async()=>[],exportRules:async()=>true,importRules:async()=>null,exit:async()=>window.__calls.push('exit')};
 });
 await page.goto('file://'+path.resolve('src/index.html'));
 await page.getByRole('heading',{name:'Where should LogicFlow work?'}).waitFor();
 await page.screenshot({path:'qa/setup.png'});
 await page.locator('[data-action="choose-watch"]').click();await page.getByText('D:\\Inbox',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Add file type',exact:true}).click();
 await page.locator('#item-folder').fill('Drawings');await page.locator('#item-extensions').fill('dwg, dxf');await page.locator('#item-form button[type=submit]').click();
 await page.getByRole('cell',{name:'.dwg, .dxf',exact:true}).waitFor();
 await page.getByRole('button',{name:'Add a group',exact:true}).click();await page.locator('#item-folder').fill('Garden');await page.locator('#item-form button[type=submit]').click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Add a rule',exact:true}).click();
 await page.locator('#item-words').fill('holiday, travel');await page.locator('#item-folder').fill('Trips');await page.locator('#item-dated').check();
 await page.screenshot({path:'qa/rule-editor.png'});await page.locator('#item-form button[type=submit]').click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Choose a folder',exact:true}).click();await page.getByText('Personal',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.screenshot({path:'qa/review.png'});
 await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.getByRole('heading',{name:'Everything in its place'}).waitFor();await page.screenshot({path:'qa/overview.png'});
 await page.getByRole('button',{name:'Start organizing',exact:true}).click();await page.locator('#ask-yes').click();await page.getByRole('button',{name:'Pause',exact:true}).click();
 for(const name of ['Folders','Name groups','File types','Custom rules','Leave alone','Activity','Overview']){await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' horizontal overflow');}
 await page.setViewportSize({width:980,height:720});await page.screenshot({path:'qa/compact.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1280,height:900});await page.getByRole('button',{name:'Custom rules',exact:true}).click();await page.getByRole('button',{name:'Add a rule',exact:true}).click();await page.locator('#item-words').fill('<img src=x onerror=alert(1)>');await page.locator('#item-folder').fill('Safe');await page.locator('#item-form button[type=submit]').click();assert.equal(await page.locator('img[src=x]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: five setup steps, folder pickers, group/category/custom-rule editors, exclusions, preview, start/pause, all pages, compact layout, escaped user text.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
