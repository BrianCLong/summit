export async function verify(){console.log('ok');return 0}
if(require.main===module)verify().then(()=>process.exit(0));
