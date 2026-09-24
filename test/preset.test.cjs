const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const {Worker} = require('../src/worker.cjs');
const {importRules} = require('../src/config.cjs');
const preset = require('../examples/LogicFlow-Original-Rules.json');

test('requested preset routes original examples with the real engine and preserves folder contents', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'logicflow-preset-'));
  const worker = new Worker(path.join(__dirname, '..', 'engine', 'Worker.ps1'));
  try {
    const c = importRules(await worker.send('defaults', {watch:root}), preset);
    const cases = {
      'AMC Warehouse Invoice 092026.xlsx':'AMC/Invoices/092026',
      'Hisense invoice 2026-09.pdf':'Hisense/Invoices/092026',
      'Philips invoices 092026.pdf':'Philips/Invoices/092026',
      'Promethean invoice 092026.pdf':'Promethean/Invoices/092026',
      'Samsung invoice 092026.pdf':'Samsung/Invoices/092026',
      'TCL invoice 092026.pdf':'TCL/Invoices/092026',
      'Samsung Guide.pdf':'Samsung/Guides',
      'USSI guides.docx':'USSI/Guides',
      'IT instructions.docx':'IT/Word',
      'Promethean stock.csv':'Promethean/Excel',
      'USSI drawing.png':'USSI/Images',
      'AMC labels.zpl':'AMC/ZPL',
      'Hisense driver.zip':'Hisense/Downloads',
      'Philips note.pdf':'Philips/PDF',
      'AMC Contract.pdf':'Contracts',
      'Contracts Renewal.docx':'Contracts',
      'IT invoice 092026.pdf':'IT/PDF',
      'Unmatched.xlsx':null,
      'AMC Samsung.xlsx':null,
      'AMC invoice.pdf':null,
      'AMC invoice 092026 102026.pdf':null,
      'AMC unknown.xyz':null,
      'Samsungish.xlsx':null,
    };
    for (const name of Object.keys(cases)) await fs.writeFile(path.join(root,name), 'sample');
    await fs.mkdir(path.join(root,'Whole folder'));
    await fs.writeFile(path.join(root,'Whole folder','AMC inner.xlsx'),'untouched');
    const rows = await worker.send('preview', {config:c});
    assert.equal(rows.length, Object.keys(cases).length + 1);
    for (const [name,dest] of Object.entries(cases)) {
      assert.equal(rows.find(r => r.Name === name).Folder, dest ? path.join(c.Destination,dest) : c.Unclassified, name);
      assert.equal(await fs.readFile(path.join(root,name),'utf8'),'sample');
    }
    assert.equal(rows.find(r => r.Name === 'Whole folder').Folder, c.Unclassified);
    await worker.send('initialize', {config:c});
    const roots = (await fs.readdir(c.Destination)).sort();
    assert.deepEqual(roots,['AMC','Contracts','Hisense','IT','Philips','Promethean','Samsung','TCL','USSI']);
    assert.deepEqual(await fs.readdir(path.join(c.Destination,'Contracts')),[]);
    for (const group of c.Groups) {
      const expected=['Downloads','Excel','Guides','Images','PDF','Word','ZPL'];
      if (!['IT','USSI'].includes(group.Folder)) expected.push('Invoices');
      assert.deepEqual((await fs.readdir(path.join(c.Destination,group.Folder))).sort(),expected.sort(),group.Folder);
    }
    assert.equal((await fs.readdir(path.join(c.Destination,'AMC','Invoices'))).length,12);
    assert.equal(await fs.readFile(path.join(root,'Whole folder','AMC inner.xlsx'),'utf8'),'untouched');
  } finally {worker.close(); await fs.rm(root,{recursive:true,force:true});}
});
