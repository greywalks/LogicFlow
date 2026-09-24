const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseRules, validateRules, MAX_RULE_BYTES} = require('../src/rules.cjs');
const {exportRules, importRules} = require('../src/config.cjs');
const preset = require('../examples/LogicFlow-Original-Rules.json');
const clone = x => JSON.parse(JSON.stringify(x));
const profile = () => ({Version:1, WatchFolder:'D:\\Inbox', Destination:'D:\\Sorted',
  Unclassified:'D:\\Review', ExcludedFolders:['Private'], Protected:['D:\\Old'],
  LaunchAtLogin:true, Interval:30, Enabled:true, Groups:[], Rules:[], Extensions:[], RootCategories:true});

test('cross-computer round trip replaces sorting choices and preserves every local setting', () => {
  const source = {...profile(), ...clone(preset), WatchFolder:'C:\\Users\\One\\Desktop', Destination:'C:\\Sorted'};
  const exported = JSON.stringify(exportRules(source));
  assert(!exported.includes('Users')); assert(!exported.includes('Private'));
  const current = profile(), original = clone(current);
  const imported = importRules(current, parseRules(exported));
  for (const key of ['WatchFolder','Destination','Unclassified','ExcludedFolders','Protected','LaunchAtLogin','Interval'])
    assert.deepEqual(imported[key], current[key], key);
  assert.equal(imported.Enabled, false);
  assert.deepEqual(exportRules(imported), preset);
  assert.deepEqual(current, original);
  imported.Groups[0].Folder = 'Changed'; assert.equal(source.Groups[0].Folder, 'AMC');
});

test('legacy version-1 BOM files, omitted fallback, and numeric-string order still import', () => {
  const input = clone(preset); delete input.RootCategories;
  input.Rules.reverse(); input.Rules[0].Priority = String(input.Rules[0].Priority);
  const result = parseRules('\uFEFF' + JSON.stringify(input));
  assert.equal(result.RootCategories, false);
  assert.equal(result.Rules[0].Words, 'contract;contracts');
  assert.equal(typeof result.Rules.at(-1).Priority, 'number');
});

test('unrecognized top-level and nested metadata never travels in an export', () => {
  const input = clone(preset);
  input.Destination = 'C:\\Users\\One'; input.Groups[0].WatchFolder = 'private';
  input.Rules[0].Script = 'untrusted'; input.Extensions[0].History = ['private'];
  assert.deepEqual(exportRules(input), preset);
});

test('invalid imports fail without changing the existing configuration', () => {
  const current = profile(), before = clone(current);
  const bad = [null, [], 'text', {}, {...preset,Version:2}, {...preset,Groups:[null]},
    {...preset,RootCategories:'false'}, {...preset,Rules:{}}, {...preset,Extensions:Array(1001).fill({})}];
  for (const input of bad) assert.throws(() => importRules(current, input));
  for (const patch of [{Scope:'Missing'}, {Kind:'Script'}, {Dated:'false'}, {Priority:2.5}, {Priority:null}, {Words:';;'}]) {
    const input = clone(preset); Object.assign(input.Rules[0], patch);
    assert.throws(() => importRules(current, input));
  }
  assert.deepEqual(current, before);
});

test('portable paths reject traversal, absolute paths and Windows device names', () => {
  for (const value of ['../outside','..\\outside','C:\\Users\\One','\\\\server\\share','/outside',
    'C:relative','Invoices/../../outside','NUL','COM1.txt','Invoices//Nested','Trailing.']) {
    const input = clone(preset); input.Rules[0].Subfolder = value;
    assert.throws(() => validateRules(input), /folder name/, value);
  }
  const input = clone(preset); input.Rules[0].Subfolder = 'Contracts\\Approved';
  assert.equal(validateRules(input).Rules[0].Subfolder, 'Contracts\\Approved');
});

test('duplicate case-insensitive groups and extensions are rejected', () => {
  const input = clone(preset); input.Groups.push({Folder:'amc',Aliases:'amc'});
  assert.throws(() => validateRules(input), /Duplicate name group/);
  const another = clone(preset); another.Extensions.push({Folder:'Other',Extensions:'.PDF'});
  assert.throws(() => validateRules(another), /Duplicate file type/);
});

test('bad JSON and oversized UTF-8 files have clear errors', () => {
  assert.throws(() => parseRules('{'), /not valid JSON/);
  assert.throws(() => parseRules(' '.repeat(MAX_RULE_BYTES + 1)), /500 KB/);
  assert.throws(() => parseRules('é'.repeat(MAX_RULE_BYTES / 2 + 1)), /500 KB/);
});
