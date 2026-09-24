// Portable rule files contain sorting choices only. Machine settings stay local.
const MAX_RULE_BYTES = 500000;
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function text(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048 || /[\x00-\x1f]/.test(value))
    fail(`${label} must contain text (up to 2,048 characters).`);
  return value.trim();
}
function folder(value, label, single = false) {
  value = text(value, label);
  const parts = value.split(/[\\/]/);
  if (value.length > 240 || (single && parts.length !== 1) || parts.some(part =>
    !part || part === '.' || part === '..' || /[<>:"|?*]|[. ]$/.test(part) ||
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)))
    fail(`${label} must be a folder name inside your organized-files folder, not a full location.`);
  return value;
}
function words(value, label) {
  const result = text(value, label).split(';').map(word => word.trim()).filter(Boolean);
  if (!result.length) fail(`${label} needs at least one word or phrase.`);
  return result.join(';');
}
function list(input, key) {
  if (!Array.isArray(input[key]) || input[key].length > 1000 || !input[key].every(object))
    fail(`${key} must be a list of up to 1,000 entries in a LogicFlow rules file.`);
  return input[key];
}
function validateRules(input) {
  if (!object(input)) fail('Choose a LogicFlow rules JSON file.');
  if (input.Version !== 1) fail('This rules file uses an unsupported version. Export it from a compatible version of LogicFlow.');
  if (input.RootCategories !== undefined && typeof input.RootCategories !== 'boolean')
    fail('The file-type fallback setting must be true or false.');
  const seen = new Set();
  const Groups = list(input, 'Groups').map((group, index) => {
    const Folder = folder(group.Folder, `Name group ${index + 1}`, true);
    if (seen.has(Folder.toLowerCase())) fail(`Duplicate name group: ${Folder}.`);
    seen.add(Folder.toLowerCase());
    return {Folder, Aliases: words(group.Aliases, `Words for ${Folder}`)};
  });
  const Rules = list(input, 'Rules').map((rule, index) => {
    const label = `Rule ${index + 1}`;
    const Scope = text(rule.Scope, `${label} group`);
    if (Scope !== '*' && !seen.has(Scope.toLowerCase())) fail(`${label} refers to a name group that is missing: ${Scope}.`);
    // Earlier v1 exports sometimes stored the priority as a numeric string.
    const Priority = typeof rule.Priority === 'string' && /^-?\d+$/.test(rule.Priority) ? Number(rule.Priority) : rule.Priority;
    if (!Number.isInteger(Priority) || Priority < -2147483648 || Priority > 2147483647)
      fail(`${label} order must be a whole number.`);
    if (!['Files', 'Folders', 'Both'].includes(rule.Kind)) fail(`${label} must apply to files, folders, or both.`);
    if (typeof rule.Dated !== 'boolean') fail(`${label} month-and-year setting must be true or false.`);
    return {Priority, Scope, Words: words(rule.Words, `${label} words`),
      Subfolder: folder(rule.Subfolder, `${label} destination`), Dated: rule.Dated, Kind: rule.Kind};
  }).sort((a, b) => a.Priority - b.Priority);
  const extensions = new Set();
  const Extensions = list(input, 'Extensions').map((mapping, index) => {
    const Folder = folder(mapping.Folder, `File-type folder ${index + 1}`);
    const values = words(mapping.Extensions, `File types for ${Folder}`).split(';');
    for (const ext of values) {
      if (!/^\.[a-z0-9]+$/i.test(ext)) fail(`File types must look like .pdf or .xlsx: ${ext}.`);
      if (extensions.has(ext.toLowerCase())) fail(`Duplicate file type: ${ext}.`);
      extensions.add(ext.toLowerCase());
    }
    return {Extensions: values.join(';'), Folder};
  });
  // Pick fields explicitly, including within each row. Unknown metadata cannot
  // carry paths, startup preferences, or other settings to the next computer.
  const result = {Version: 1, Groups, Rules, Extensions, RootCategories: input.RootCategories ?? false};
  if (Buffer.byteLength(JSON.stringify(result, null, 2), 'utf8') > MAX_RULE_BYTES)
    fail('Choose a rules file smaller than 500 KB.');
  return result;
}
function parseRules(content) {
  if (Buffer.byteLength(content, 'utf8') > MAX_RULE_BYTES) fail('Choose a rules file smaller than 500 KB.');
  let input;
  try { input = JSON.parse(content.replace(/^\uFEFF/, '')); }
  catch { fail('This file is not valid JSON. Choose a rules file exported by LogicFlow.'); }
  return validateRules(input);
}
module.exports = {MAX_RULE_BYTES, validateRules, parseRules};
