// LogicFlow 3.0 | Author: Cisik
const {app,BrowserWindow,ipcMain,dialog,Tray,Menu,nativeImage,shell,session}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {Worker}=require('./worker.cjs');
const {normalize,exportRules,importRules,protectPrevious,saveAtomic,inside}=require('./config.cjs');
app.setName('LogicFlow');
let window,tray,worker,config,defaults,dataDir,settings,history,desktop,quitting=false,running=false,moved=0,lastCheck=null,lastError='',task=Promise.resolve();
const serialize=fn=>{const result=task.then(fn);task=result.catch(()=>{});return result;};
const uiPath=path.join(__dirname,'index.html');
const getState=()=>({config,defaults,needsSetup:!config,running,moved,lastCheck,lastError,version:app.getVersion()});
function broadcast(){if(window&&!window.isDestroyed())window.webContents.send('state',getState());if(tray){tray.setToolTip(`LogicFlow • ${running?'Organizing':'Paused'}`);tray.setContextMenu(Menu.buildFromTemplate([{label:'Open LogicFlow',click:show},{label:'Pause organizing',enabled:running,click:()=>serialize(pause).catch(report)},{type:'separator'},{label:'Exit LogicFlow',click:()=>app.quit()}]));}}
function report(e){lastError=e.message;running=false;broadcast();}
function safeConfig(c){
  if(!c||JSON.stringify(c).length>500000)throw new Error('The settings are too large or incomplete.');
  for(const key of ['Groups','Rules','Extensions','ExcludedFolders','Protected'])if(!Array.isArray(c[key])||c[key].length>1000)throw new Error('Please check the list of folders and rules.');
  for(const key of ['WatchFolder','Destination','Unclassified'])if(typeof c[key]!=='string'||!c[key])throw new Error('Choose the folders you want to use.');
  if(inside(c.WatchFolder,dataDir)||inside(c.WatchFolder,path.dirname(process.execPath)))throw new Error('Choose a personal folder, not the application or settings folder.');
  return {...c,Protected:[...new Set([...c.Protected,dataDir,path.dirname(process.execPath),app.getAppPath()])]};
}
async function validate(c){await worker.send('validate',{config:safeConfig(c)});return true;}
async function pause(){running=false;await worker.send('reset');broadcast();return getState();}
async function save(c){
  await pause();
  const candidate=protectPrevious(normalize(c,desktop),config);
  await validate(candidate);
  await saveAtomic(settings,candidate);config=candidate;
  if(process.platform==='win32'&&app.isPackaged)app.setLoginItemSettings({openAtLogin:!!config.LaunchAtLogin,path:process.execPath,args:['--tray']});
  lastError='';broadcast();return getState();
}
async function cycle(){
  if(!running||!config)return;
  try{const r=await worker.send('cycle',{config:safeConfig(config),log:history});moved+=r.Moved;lastCheck=new Date().toISOString();lastError=r.Errors?`${r.Errors} item(s) could not be moved. See Activity for details.`:'';broadcast();}catch(e){report(e);}
}
function show(){if(window){window.show();window.restore();window.focus();}}
function handle(name,fn){ipcMain.handle(name,(event,...args)=>{
  if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||event.senderFrame.url!==pathToFileURL(uiPath).href)throw new Error('Unrecognized application window.');
  return serialize(async()=>{try{return {ok:true,value:await fn(...args)};}catch(e){return {ok:false,error:e.message};}});
});}
async function choose(kind,c,scope='*'){
  await pause();
  if(!c)c=config||defaults;
  const start=kind==='watch'?c.WatchFolder:kind==='excluded'?c.WatchFolder:kind==='unclassified'?c.Unclassified:c.Destination;
  const result=await dialog.showOpenDialog(window,{title:kind==='excluded'?'Choose a folder to leave alone':kind==='watch'?'Choose the folder to organize':'Choose a folder',defaultPath:start,properties:kind==='watch'||kind==='excluded'?['openDirectory']:['openDirectory','createDirectory']});
  if(result.canceled)return null;
  const selected=result.filePaths[0];
  if(kind==='excluded'){
    if(path.dirname(selected).toLowerCase()!==path.resolve(c.WatchFolder).toLowerCase())throw new Error('Choose a folder directly inside the folder you are organizing. Folders further inside are never scanned.');
    return path.basename(selected);
  }
  if(kind==='rule'){
    const root=scope==='*'?c.Destination:path.join(c.Destination,scope);
    const relative=path.relative(root,selected);
    if(!relative||!inside(selected,root))throw new Error('Choose a folder inside your organized-files folder'+(scope==='*'?'.':` under ${scope}.`));
    return relative;
  }
  return selected;
}
async function boot(){
  desktop=app.getPath('desktop');
  dataDir=process.env.LOGICFLOW_TEST_DATA&&!app.isPackaged?process.env.LOGICFLOW_TEST_DATA:path.join(process.env.LOCALAPPDATA||app.getPath('appData'),'LogicFlow');
  app.setPath('userData',path.join(dataDir,'Interface'));
  settings=path.join(dataDir,'settings.json');history=path.join(dataDir,'history.jsonl');
  await fs.mkdir(dataDir,{recursive:true});
  worker=new Worker(path.join(app.isPackaged?path.join(process.resourcesPath,'engine'):path.join(__dirname,'..','engine'),'Worker.ps1'),report);
  defaults=await worker.send('defaults',{watch:desktop});defaults.LaunchAtLogin=false;
  try{config=normalize(JSON.parse((await fs.readFile(settings,'utf8')).replace(/^\uFEFF/,'')),desktop);}catch(e){if(e.code!=='ENOENT')throw new Error('Your saved settings could not be loaded. Your settings have not been changed. '+e.message);}
  // A new session always starts paused. Existing personal configurations stay local.
  Menu.setApplicationMenu(null);
  window=new BrowserWindow({width:1280,height:880,minWidth:980,minHeight:720,show:false,title:'LogicFlow',backgroundColor:'#101216',icon:path.join(__dirname,'..','assets','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',e=>e.preventDefault());
  window.on('close',e=>{if(!quitting){e.preventDefault();window.hide();}});
  const icon=nativeImage.createFromPath(path.join(__dirname,'..','assets','icon.png')).resize({width:32,height:32});
  tray=new Tray(icon);tray.on('double-click',show);broadcast();
  handle('get-state',()=>getState());
  handle('choose-folder',choose);
  handle('validate',validate);
  handle('save',save);
  handle('pause',pause);
  handle('preview',async c=>{await pause();await validate(c);return await worker.send('preview',{config:safeConfig(c)});});
  handle('start',async()=>{if(!config)throw new Error('Finish setup first.');await validate(config);await worker.send('initialize',{config:safeConfig(config)});running=true;lastError='';await cycle();return getState();});
  handle('history',()=>worker.send('history',{log:history}));
  handle('export',async c=>{await validate(c);const result=await dialog.showSaveDialog(window,{title:'Save a copy of your rules',defaultPath:'LogicFlow-Rules.json',filters:[{name:'LogicFlow rules',extensions:['json']}]});if(result.canceled)return false;await fs.writeFile(result.filePath,JSON.stringify(exportRules(c),null,2));return true;});
  handle('import',async c=>{await pause();const result=await dialog.showOpenDialog(window,{title:'Choose a LogicFlow rules file',properties:['openFile'],filters:[{name:'LogicFlow rules',extensions:['json']}]});if(result.canceled)return null;const stat=await fs.stat(result.filePaths[0]);if(stat.size>500000)throw new Error('Choose a rules file smaller than 500 KB.');const updated=importRules(c,JSON.parse((await fs.readFile(result.filePaths[0],'utf8')).replace(/^\uFEFF/,'')));await validate(updated);return updated;});
  handle('open-folder',async which=>{const c=config||defaults;const target={watch:c.WatchFolder,organized:c.Destination,unclassified:c.Unclassified}[which];if(!target)throw new Error('Unknown folder.');const error=await shell.openPath(target);if(error)throw new Error('This folder has not been created yet. It will be created when you start organizing.');});
  handle('exit',()=>{quitting=true;app.quit();});
  await window.loadFile(uiPath);
  if(!process.argv.includes('--tray')||!config)show();
  setInterval(()=>serialize(cycle).catch(report),30000).unref();
}
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',show);
  app.on('before-quit',()=>{quitting=true;running=false;});
  app.on('will-quit',()=>{worker?.close();tray?.destroy();});
  app.whenReady().then(boot).catch(e=>{dialog.showErrorBox('LogicFlow could not start',e.message);app.quit();});
}
