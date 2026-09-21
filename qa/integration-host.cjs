// Linux test harness only. The real Windows singleton and native pickers need
// Windows validation; mock those OS integrations, retaining production IPC.
const {app}=require('electron');
app.requestSingleInstanceLock=()=>true;
require('../src/main.cjs');
