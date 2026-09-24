// Edit application metadata without running Windows tools.
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const PE=await import('pe-library'),R=await import('resedit');
 const version=require('../package.json').version.split('.').map(Number);
 const file=path.resolve('release/win-unpacked/LogicFlow.exe');
 const exe=PE.NtExecutable.from(fs.readFileSync(file),{ignoreCert:true});
 const res=PE.NtExecutableResource.from(exe);
 const ico=R.Data.IconFile.from(fs.readFileSync('assets/icon.ico'));
 const groups=res.entries.filter(x=>x.type===14);
 for(const g of groups)R.Resource.IconGroupEntry.replaceIconsForResource(res.entries,g.id,g.lang,ico.icons.map(i=>i.data));
 const vi=R.Resource.VersionInfo.fromEntries(res.entries)[0];
 vi.setFileVersion(...version,0,1033);vi.setProductVersion(...version,0,1033);
 vi.setStringValues({lang:1033,codepage:1200},{CompanyName:'Cisik',FileDescription:'LogicFlow',ProductName:'LogicFlow',LegalCopyright:'Copyright © 2026 Cisik',OriginalFilename:'LogicFlow.exe',InternalName:'LogicFlow'});
 vi.outputToResourceEntries(res.entries);res.outputResource(exe);fs.writeFileSync(file,Buffer.from(exe.generate()));
 console.log('Applied LogicFlow icon and Cisik product metadata.');
})().catch(e=>{console.error(e);process.exit(1);});
