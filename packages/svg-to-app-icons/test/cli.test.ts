import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execute = promisify(execFile);
const cliPath = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
let outputDir: string;

beforeEach(async () => {
  outputDir = await mkdtemp(join(tmpdir(), 'svg-to-app-icons-cli-'));
});
afterEach(async () => {
  if (!resolve(outputDir).startsWith(`${resolve(tmpdir())}${sep}svg-to-app-icons-cli-`)) {
    throw new Error('Refusing cleanup outside the test temporary directory.');
  }
  await rm(outputDir, { recursive: true, force: true });
});

async function run(args: string[]) {
  return execute(process.execPath, ['--import', 'tsx', cliPath, ...args]);
}

describe('cli', () => {
  it('should show help without requiring source or output flags', async () => {
    const { stdout, stderr } = await run(['--help']);
    expect(stdout).toContain('--svg-dir');
    expect(stdout).toContain('--icon-scale');
    expect(stderr).toBe('');
  });

  it('should generate all nine real PNGs using the default SVG in a source directory', async () => {
    const { stdout } = await run(['--svg-dir', fixtures, '--output-dir', outputDir]);
    expect(stdout).toContain('Generated 9 all icon assets');
    expect(await readdir(outputDir)).toHaveLength(9);
    expect(await sharp(join(outputDir, 'icon-512.png')).metadata()).toMatchObject({
      format: 'png',
      width: 512,
      height: 512,
    });
  });

  it('should accept every rendering flag and generate text icons for the extension target', async () => {
    const { stdout } = await run([
      '--svg-dir',
      fixtures,
      '--svg',
      'text.svg',
      '-o',
      outputDir,
      '-t',
      'extension',
      '--source-size',
      '256',
      '--center-tolerance',
      '32',
      '--half',
      '4',
      '--icon-scale',
      '0.7',
      '--icon-corner-radius-ratio',
      '0',
    ]);
    expect(stdout).toContain('Generated 4 extension icon assets');
    expect((await readdir(outputDir)).sort()).toEqual([
      'logo-128.png',
      'logo-16.png',
      'logo-32.png',
      'logo-48.png',
    ]);
    const { data } = await sharp(join(outputDir, 'logo-128.png'))
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(255);
    expect(data.filter((value) => value > 200).length).toBeGreaterThan(128 * 128);
  });

  it('should accept an SVG file path and the web target', async () => {
    const { stdout } = await run([
      '-s',
      join(fixtures, 'favicon.svg'),
      '-o',
      outputDir,
      '-t',
      'web',
    ]);
    expect(stdout).toContain('Generated 5 web icon assets');
    expect(await readdir(outputDir)).toHaveLength(5);
  });

  it.each([
    [[], 'Provide --svg'],
    [['--svg-dir', fixtures, '-t', 'wrong'], '--target must be'],
    [['--svg-dir', fixtures, '--icon-scale', 'NaN'], 'finite number'],
    [['--svg', join(fixtures, 'missing.svg')], 'ENOENT'],
    [['--unknown'], 'Unknown option'],
  ])(
    'should fail with a nonzero exit code for invalid arguments %j',
    async (args, message) => {
      await expect(run([...args, '-o', outputDir])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining(message),
      });
      expect(await readdir(outputDir)).toEqual([]);
    },
  );

  it('should require an output directory', async () => {
    await expect(run(['--svg-dir', fixtures])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Provide --output-dir'),
    });
  });
});
