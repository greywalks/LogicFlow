// Real Electron/main/preload/PowerShell flow; only native file pickers are mocked.
const {_electron} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
const assert = require('node:assert/strict');
const preset = require('../examples/LogicFlow-Original-Rules.json');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(),'logicflow-transfer-'));
  const watch = path.join(temp,'Inbox'), data = path.join(temp,'profile');
  await fs.mkdir(watch); await fs.mkdir(path.join(watch,'Keep'));
  await fs.writeFile(path.join(watch,'AMC Warehouse Invoice 092026.xlsx'),'unchanged');
  const input = path.resolve('examples/LogicFlow-Original-Rules.json');
  const output = path.join(temp,'Export.json'), bad = path.join(temp,'Broken.json');
  await fs.writeFile(bad,'{"Version":1,');
  let app;
  try {
    app = await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron'),
      args:['--no-sandbox',path.resolve('qa/integration-host.cjs')],
      env:{...process.env,DISPLAY:process.env.DISPLAY || '127.0.0.1:97',LOGICFLOW_TEST_DATA:data}});
    const page = await app.firstWindow(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const pick = file => app.evaluate(({dialog}, file) => {
      dialog.showOpenDialog = async () => file ? {canceled:false,filePaths:[file]} : {canceled:true,filePaths:[]};
    }, file);
    const exportTo = file => app.evaluate(({dialog}, file) => {
      dialog.showSaveDialog = async () => ({canceled:false,filePath:file});
    }, file);
    const state = () => page.evaluate(() => window.logicflow.state());
    await page.getByRole('heading',{name:'Where should LogicFlow work?'}).waitFor();
    await pick(watch); await page.locator('[data-action="choose-watch"]').click();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await pick(input); await page.getByRole('button',{name:'Import rules',exact:true}).click();
    await page.getByRole('heading',{name:'Use these imported rules?'}).waitFor();
    await page.screenshot({path:'qa/import-review.png'});
    await page.locator('#ask-no').click();
    assert.equal(await page.getByRole('cell',{name:'AMC',exact:true}).count(),0);
    await page.getByRole('button',{name:'Import rules',exact:true}).click();
    await page.locator('#ask-yes').click();
    await page.getByRole('cell',{name:'ZPL',exact:true}).waitFor();
    assert.equal((await state()).config,undefined);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await pick(path.join(watch,'Keep')); await page.getByRole('button',{name:'Choose a folder',exact:true}).click();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('button',{name:'Finish setup',exact:true}).click();
    await page.getByRole('heading',{name:'Everything in its place'}).waitFor();
    const original = JSON.parse(await fs.readFile(path.join(data,'settings.json'),'utf8'));
    assert.deepEqual(original.Groups,preset.Groups); assert.deepEqual(original.ExcludedFolders,['Keep']);
    await page.getByRole('button',{name:'Start organizing',exact:true}).click();
    await page.locator('#ask-yes').click();
    await page.getByRole('button',{name:'Pause',exact:true}).waitFor();
    await page.getByRole('button',{name:'Import & export',exact:true}).click();
    await pick(null); await page.getByRole('button',{name:'Import rules',exact:true}).click();
    await page.getByRole('button',{name:'Start organizing',exact:true}).waitFor();
    assert.equal((await state()).running,false);
    await exportTo(output); await page.getByRole('button',{name:'Export rules',exact:true}).click();
    await page.getByText('Rules exported. Your personal folder locations were not included.',{exact:true}).waitFor();
    assert.deepEqual(JSON.parse(await fs.readFile(output,'utf8')),preset);
    // Rejected files leave both the draft and the saved profile intact.
    await pick(bad); await page.getByRole('button',{name:'Import rules',exact:true}).click();
    await page.getByText('This file is not valid JSON. Choose a rules file exported by LogicFlow.',{exact:true}).waitFor();
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(data,'settings.json'),'utf8')),original);
    // Import replaces only sorting choices, and only after the review is accepted.
    await page.getByRole('button',{name:'Name groups',exact:true}).click();
    await page.getByRole('button',{name:'Add a group',exact:true}).click();
    await page.locator('#item-folder').fill('Temporary');
    await page.locator('#item-form button[type=submit]').click();
    await page.getByRole('cell',{name:'Temporary',exact:true}).first().waitFor();
    await page.getByRole('button',{name:'Import & export',exact:true}).click();
    await pick(output); await page.getByRole('button',{name:'Import rules',exact:true}).click();
    await page.locator('#ask-no').click();
    await page.getByRole('button',{name:'Name groups',exact:true}).click();
    await page.getByRole('cell',{name:'Temporary',exact:true}).first().waitFor();
    await page.getByRole('button',{name:'Import & export',exact:true}).click();
    await page.getByRole('button',{name:'Import rules',exact:true}).click();
    await page.locator('#ask-yes').click();
    await page.locator('.footer [data-action="save"]').click();
    await page.getByText('Changes saved. Refresh the preview before starting.',{exact:true}).waitFor();
    const saved = JSON.parse(await fs.readFile(path.join(data,'settings.json'),'utf8'));
    assert.deepEqual(saved.Groups,preset.Groups); assert.deepEqual(saved.Rules,preset.Rules);
    for (const key of ['WatchFolder','Destination','Unclassified','ExcludedFolders','LaunchAtLogin'])
      assert.deepEqual(saved[key],original[key],key);
    for (const location of original.Protected) assert(saved.Protected.includes(location));
    await page.setViewportSize({width:1280,height:900});
    await page.screenshot({path:'qa/import-export.png'});
    await page.setViewportSize({width:980,height:720});
    await page.screenshot({path:'qa/import-export-compact.png'});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    await page.getByRole('button',{name:'Overview',exact:true}).click();
    await page.getByRole('button',{name:'Refresh preview',exact:true}).click();
    await page.getByText('Custom rule',{exact:true}).waitFor();
    assert.equal(await fs.readFile(path.join(watch,'AMC Warehouse Invoice 092026.xlsx'),'utf8'),'unchanged');
    assert.deepEqual(errors,[]);
    console.log('PASS: setup import, review/cancel, export and round trip, invalid-file recovery, paused import, local settings, compact layout, and real-engine preview.');
  } finally {if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}
})().catch(error => {console.error(error);process.exit(1);});
