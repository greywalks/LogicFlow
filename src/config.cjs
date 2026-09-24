// LogicFlow | Author: Cisik
const path = require('node:path');
const fs = require('node:fs/promises');
const {validateRules} = require('./rules.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const inside = (child, parent) => { const rel = path.relative(path.resolve(parent).toLowerCase(), path.resolve(child).toLowerCase()); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)); };
function normalize(input, desktop) {
  const c = clone(input);
  if (c.Version !== 1) throw new Error('This settings file is from an unsupported version.');
  c.WatchFolder ||= desktop;
  c.Enabled = false;
  c.Groups ||= []; c.Rules ||= []; c.Extensions ||= []; c.ExcludedFolders ||= []; c.Protected ||= [];
  c.RootCategories ??= false; c.LaunchAtLogin = !!c.LaunchAtLogin;
  return c;
}
function exportRules(c) {
  return validateRules(c);
}
function importRules(c, input) {
  return {...clone(c), ...validateRules(input), Enabled:false};
}
function protectPrevious(candidate, existing) {
  const c = clone(candidate);
  c.Enabled = false;
  c.Protected = [...new Set([...(c.Protected || []), ...(existing?.Protected || []), ...(existing ? [existing.Destination,existing.Unclassified] : [])])].filter(Boolean);
  return c;
}
async function saveAtomic(file, data) {
  await fs.mkdir(path.dirname(file), {recursive:true});
  const temp = file + '.tmp';
  const handle = await fs.open(temp,'w');
  try { await handle.writeFile(JSON.stringify(data,null,2),'utf8'); await handle.sync(); } finally {await handle.close();}
  try {await fs.copyFile(file,file+'.bak');} catch(e) {if(e.code!=='ENOENT')throw e;}
  await fs.rename(temp,file);
}
module.exports = {normalize,exportRules,importRules,protectPrevious,saveAtomic,inside};
