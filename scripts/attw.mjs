import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const tarball = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'attw-'));
const env = { ...process.env };
delete env.npm_config_dry_run;
delete env.npm_config_dry_dash_run;
execFileSync('npm', ['pack', '--pack-destination', dir, '--ignore-scripts'], { stdio: 'inherit', env });
const tarballPath = join(dir, tarball);
try {
  execFileSync('attw', [tarballPath], { stdio: 'inherit' });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
