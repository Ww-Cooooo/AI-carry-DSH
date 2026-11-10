import {withInstanceWriteLock} from '../vendor/ai-carry/dashboard/scripts/instance-write-lock.mjs';
await withInstanceWriteLock(process.argv[2],'formal-cli-compatibility-check',async()=>{process.stdout.write('locked\n');process.stdin.resume();await new Promise(resolve=>process.stdin.once('end',resolve));});
