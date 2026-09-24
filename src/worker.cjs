const {spawn} = require('node:child_process');
const readline = require('node:readline');
const path = require('node:path');
class Worker {
  constructor(script, onFailure=()=>{}) {
    const executable = process.platform==='win32' ? path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe') : (process.env.LOGICFLOW_PWSH || 'pwsh');
    this.queue=[]; this.failed=null;
    // Disable PowerShell 7 telemetry in the local folder service.
    this.child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,POWERSHELL_TELEMETRY_OPTOUT:'1'}});
    const fail=error=>{if(this.failed)return;this.failed=error;for(const p of this.queue.splice(0))p.reject(error);onFailure(error);};
    readline.createInterface({input:this.child.stdout}).on('line',line=>{
      const next=this.queue.shift(); if(!next)return;
      try {const res=JSON.parse(line.replace(/^\uFEFF/,'')); res.ok ? next.resolve(res.value) : next.reject(new Error(res.error));}catch(e){next.reject(new Error('LogicFlow could not read the folder service response.'));}
    });
    this.child.stderr.on('data',()=>{});
    this.child.on('error',()=>fail(new Error('The folder service could not start. Windows PowerShell is required.')));
    this.child.on('exit',()=>fail(new Error('The folder service stopped. Close and reopen LogicFlow.')));
    this.child.stdin.on('error',()=>fail(new Error('The folder service is unavailable. Close and reopen LogicFlow.')));
  }
  send(action, data={}) {
    if(this.failed)return Promise.reject(this.failed);
    return new Promise((resolve,reject)=>{this.queue.push({resolve,reject});this.child.stdin.write(JSON.stringify({action,...data})+'\n','utf8');});
  }
  close(){this.child.stdin.end();}
}
module.exports={Worker};
