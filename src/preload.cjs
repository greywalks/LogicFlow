const {contextBridge,ipcRenderer}=require('electron');
const invoke=async(channel,...args)=>{const r=await ipcRenderer.invoke(channel,...args);if(!r.ok)throw new Error(r.error);return r.value;};
contextBridge.exposeInMainWorld('logicflow',{
  state:()=>invoke('get-state'),chooseFolder:(kind,c,scope)=>invoke('choose-folder',kind,c,scope),
  validate:c=>invoke('validate',c),save:c=>invoke('save',c),pause:()=>invoke('pause'),preview:c=>invoke('preview',c),
  start:()=>invoke('start'),history:()=>invoke('history'),exportRules:c=>invoke('export',c),importRules:c=>invoke('import',c),
  openFolder:which=>invoke('open-folder',which),exit:()=>invoke('exit'),
  onState:callback=>{ipcRenderer.on('state',(_event,state)=>callback(state));}
});
