import type { GenerateIconsOptions, IconTarget } from '../src';
import { Buffer } from 'node:buffer';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateIcons } from '../src';

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
const webSizes = {
  'favicon-16.png': 16,
  'favicon-32.png': 32,
  'apple-touch-icon.png': 180,
  'icon-192.png': 192,
  'icon-512.png': 512,
};
const extensionSizes = {
  'logo-16.png': 16,
  'logo-32.png': 32,
  'logo-48.png': 48,
  'logo-128.png': 128,
};
const sizesByTarget: Record<IconTarget, Record<string, number>> = {
  web: webSizes,
  extension: extensionSizes,
  all: { ...webSizes, ...extensionSizes },
};
let temporaryDir: string;
let options: GenerateIconsOptions;

beforeEach(async () => {
  temporaryDir = await mkdtemp(join(tmpdir(), 'svg-to-app-icons-'));
  options = {
    svgPath: join(fixtures, 'favicon.svg'),
    outputDir: join(temporaryDir, 'nested', 'icons'),
  };
});
afterEach(async () => {
  if (!resolve(temporaryDir).startsWith(`${resolve(tmpdir())}${sep}svg-to-app-icons-`)) {
    throw new Error('Refusing cleanup outside the test temporary directory.');
  }
  await rm(temporaryDir, { recursive: true, force: true });
});

describe('generateIcons', () => {
  it.each<IconTarget>(['web', 'extension', 'all'])(
    'should generate only the %s preset with correct PNG dimensions',
    async (target) => {
      const files = await generateIcons({ ...options, target });
      const sizes = sizesByTarget[target];
      expect(files.map((file) => basename(file)).sort()).toEqual(
        Object.keys(sizes).sort(),
      );
      expect((await readdir(options.outputDir)).sort()).toEqual(
        Object.keys(sizes).sort(),
      );
      await Promise.all(
        files.map(async (file) => {
          const size = sizes[basename(file)];
          expect(await sharp(file).metadata()).toMatchObject({
            format: 'png',
            width: size,
            height: size,
            hasAlpha: true,
          });
        }),
      );
    },
  );

  it('should invert the shape to white on black and make rounded corners transparent', async () => {
    await generateIcons({ ...options, target: 'extension' });
    const { data, info } = await sharp(join(options.outputDir, 'logo-128.png'))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number): number[] => [
      ...data.subarray(
        (y * info.width + x) * info.channels,
        (y * info.width + x + 1) * info.channels,
      ),
    ];
    expect(pixel(64, 64)).toEqual([255, 255, 255, 255]);
    expect(pixel(64, 5)).toEqual([0, 0, 0, 255]);
    expect(pixel(0, 0)[3]).toBe(0);
    expect(pixel(127, 127)[3]).toBe(0);
  });

  it('should apply custom scale and square corners and overwrite existing icons', async () => {
    const svgPath = join(temporaryDir, 'solid.svg');
    await writeFile(
      svgPath,
      '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="black"/></svg>',
    );
    await generateIcons({ ...options, svgPath, target: 'extension' });
    await generateIcons({
      ...options,
      svgPath,
      target: 'extension',
      sourceSize: 64,
      centerTolerance: 0,
      half: 4,
      iconScale: 0.5,
      iconCornerRadiusRatio: 0,
    });
    const { data, info } = await sharp(join(options.outputDir, 'logo-128.png'))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number): number[] => [
      ...data.subarray(
        (y * info.width + x) * info.channels,
        (y * info.width + x + 1) * info.channels,
      ),
    ];
    expect(pixel(0, 0)).toEqual([0, 0, 0, 255]);
    expect(pixel(31, 64)).toEqual([0, 0, 0, 255]);
    expect(pixel(32, 64)).toEqual([255, 255, 255, 255]);
    expect(pixel(95, 64)).toEqual([255, 255, 255, 255]);
    expect(pixel(96, 64)).toEqual([0, 0, 0, 255]);
  });

  it('should render visible text from a real SVG', async () => {
    await generateIcons({
      ...options,
      svgPath: join(fixtures, 'text.svg'),
      target: 'web',
      centerTolerance: 32,
    });
    const { data } = await sharp(join(options.outputDir, 'icon-512.png'))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data.filter((value) => value > 200).length).toBeGreaterThan(1000);
  });

  it('should honor source size, center tolerance, and the center offset divisor', async () => {
    const svgPath = join(temporaryDir, 'slightly-offset.svg');
    await writeFile(
      svgPath,
      '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="20" width="20" height="20"/></svg>',
    );
    const settings: GenerateIconsOptions = {
      ...options,
      svgPath,
      target: 'extension',
      sourceSize: 64,
      centerTolerance: 1,
    };
    await expect(generateIcons(settings)).rejects.toThrow('not centered');
    expect(await generateIcons({ ...settings, half: 4 })).toHaveLength(4);
    expect(await generateIcons({ ...settings, centerTolerance: 2 })).toHaveLength(4);
  });

  it.each([
    [
      'empty',
      '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"/>',
      'no visible pixels',
    ],
    [
      'off-center',
      '<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8"/></svg>',
      'not centered',
    ],
    ['malformed', '<svg broken', ''],
  ])(
    'should reject %s SVGs before creating the output directory',
    async (_, svg, message) => {
      const svgPath = join(temporaryDir, 'invalid.svg');
      await writeFile(svgPath, svg);
      await expect(generateIcons({ ...options, svgPath })).rejects.toThrow(message);
      await expect(readdir(options.outputDir)).rejects.toThrow();
    },
  );

  it('should reject raster inputs and missing files', async () => {
    const svgPath = join(temporaryDir, 'raster.svg');
    await sharp(
      Buffer.from(
        '<svg width="8" height="8" xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8"/></svg>',
      ),
    )
      .png()
      .toFile(svgPath);
    await expect(generateIcons({ ...options, svgPath })).rejects.toThrow(
      'must be an SVG',
    );
    await expect(
      generateIcons({ ...options, svgPath: join(temporaryDir, 'missing.svg') }),
    ).rejects.toThrow('ENOENT');
  });

  it.each<Partial<GenerateIconsOptions>>([
    { sourceSize: 0 },
    { sourceSize: 1.5 },
    { centerTolerance: -1 },
    { iconCornerRadiusRatio: 0.6 },
    { half: 0 },
    { iconScale: 0 },
    { iconScale: 1.1 },
    { iconScale: Number.NaN },
    { sourceSize: Number.POSITIVE_INFINITY },
  ])(
    'should reject invalid rendering settings %j before writing files',
    async (invalid) => {
      await expect(generateIcons({ ...options, ...invalid })).rejects.toThrow();
      await expect(readdir(options.outputDir)).rejects.toThrow();
    },
  );
});
