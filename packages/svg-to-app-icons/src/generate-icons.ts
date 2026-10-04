import type { GenerateIconsOptions, IconDefinition, RenderOptions } from './types';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { defaults } from './defaults';
import { ensureCentered } from './ensure-centered';
import { ensureOptions } from './ensure-options';
import { renderIcon } from './render-icon';

const webIcons: IconDefinition[] = [
  { fileName: 'favicon-16.png', size: 16 },
  { fileName: 'favicon-32.png', size: 32 },
  { fileName: 'apple-touch-icon.png', size: 180 },
  { fileName: 'icon-192.png', size: 192 },
  { fileName: 'icon-512.png', size: 512 },
];
const extensionIcons: IconDefinition[] = [
  { fileName: 'logo-16.png', size: 16 },
  { fileName: 'logo-32.png', size: 32 },
  { fileName: 'logo-48.png', size: 48 },
  { fileName: 'logo-128.png', size: 128 },
];

// Generate the selected PNG presets and return their absolute output paths.
export async function generateIcons(options: GenerateIconsOptions): Promise<string[]> {
  const target = options.target ?? 'all';
  if (!['web', 'extension', 'all'].includes(target)) {
    throw new Error('target must be web, extension, or all.');
  }
  if (!options.svgPath.trim() || !options.outputDir.trim()) {
    throw new Error('svgPath and outputDir are required.');
  }
  const renderOptions: RenderOptions = {
    sourceSize: options.sourceSize ?? defaults.sourceSize,
    centerTolerance: options.centerTolerance ?? defaults.centerTolerance,
    iconCornerRadiusRatio:
      options.iconCornerRadiusRatio ?? defaults.iconCornerRadiusRatio,
    half: options.half ?? defaults.half,
    iconScale: options.iconScale ?? defaults.iconScale,
  };
  ensureOptions(renderOptions);
  const svg = await readFile(resolve(options.svgPath));
  await ensureCentered(svg, renderOptions);
  const iconsByTarget = {
    web: webIcons,
    extension: extensionIcons,
    all: [...webIcons, ...extensionIcons],
  };
  const icons = iconsByTarget[target];
  const outputDir = resolve(options.outputDir);
  await mkdir(outputDir, { recursive: true });
  return Promise.all(
    icons.map(async (icon) => {
      const destination = join(outputDir, icon.fileName);
      await renderIcon(svg, destination, icon, renderOptions);
      return destination;
    }),
  );
}
