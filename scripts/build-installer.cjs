const {spawnSync}=require('node:child_process');const path=require('node:path');
const command=process.env.MAKENSIS || 'makensis';
for(const file of ['remove.nsi','setup.nsi']){
 const result=spawnSync(command,[process.platform==='win32'?'/V2':'-V2',file],{cwd:path.resolve('installer'),stdio:'inherit',env:{...process.env,...(process.env.NSISDIR?{}:path.isAbsolute(command)?{NSISDIR:path.basename(path.dirname(command))==='linux'||path.basename(path.dirname(command))==='mac'?path.dirname(path.dirname(command)):path.dirname(command)}:{})}});
 if(result.error){console.error('Install NSIS 3, or set MAKENSIS to its executable. '+result.error.message);process.exit(1);}if(result.status!==0)process.exit(result.status||1);
}
console.log('Built release/LogicFlow-Setup.exe');
