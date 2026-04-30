import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const tarball = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;

execFileSync('pnpm', ['pack', '--pack-destination', process.cwd()], { stdio: 'inherit' });
const tarballPath = `${process.cwd()}/${tarball}`;
try {
  execFileSync('attw', [tarballPath], { stdio: 'inherit' });
} finally {
  rmSync(tarballPath, { force: true });
}
