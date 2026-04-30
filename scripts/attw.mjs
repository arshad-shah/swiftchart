import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const tarball = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;

execFileSync('pnpm', ['pack', '--pack-destination', '.'], { stdio: 'inherit' });
try {
  execFileSync('attw', [tarball], { stdio: 'inherit' });
} finally {
  rmSync(tarball, { force: true });
}
