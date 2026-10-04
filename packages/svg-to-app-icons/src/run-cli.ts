import { resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { generateIcons } from './generate-icons';

const help = `Usage: svg-to-app-icons --svg <file.svg> --output-dir <directory> [options]

  --svg, -s <path>                 Source SVG file (relative to --svg-dir if supplied)
  --svg-dir <directory>            Source directory; defaults to favicon.svg inside it
  --output-dir, -o <directory>     Required destination for generated PNGs
  --target, -t <web|extension|all>  Icon preset (default: all)
  --source-size <integer>          Bounds-check raster size (default: 1024)
  --center-tolerance <number>      Allowed center offset (default: 2)
  --icon-corner-radius-ratio <n>   Corner radius / icon size, 0..0.5 (default: 0.18)
  --half <number>                  Center offset divisor, >0 (default: 2)
  --icon-scale <number>            Scale, >0..1; larger = less padding (default: 0.85)
  --help, -h                      Show this help

Existing PNGs with matching filenames are overwritten.
`;

// Parse CLI flags and report errors with a nonzero exit status.
export async function runCli(args: string[]): Promise<void> {
  try {
    const { values } = parseArgs({
      args,
      options: {
        svg: { type: 'string', short: 's' },
        'svg-dir': { type: 'string' },
        'output-dir': { type: 'string', short: 'o' },
        target: { type: 'string', short: 't', default: 'all' },
        'source-size': { type: 'string', default: '1024' },
        'center-tolerance': { type: 'string', default: '2' },
        'icon-corner-radius-ratio': { type: 'string', default: '0.18' },
        half: { type: 'string', default: '2' },
        'icon-scale': { type: 'string', default: '0.85' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.help) {
      process.stdout.write(help);
      return;
    }
    if ((values.svg?.trim() ?? '') === '' && (values['svg-dir']?.trim() ?? '') === '') {
      throw new Error('Provide --svg <file.svg> or --svg-dir <directory>.');
    }
    const outputDir = values['output-dir'];
    if (outputDir === undefined || outputDir.trim() === '')
      throw new Error('Provide --output-dir <directory>.');
    const { target } = values;
    if (target !== 'web' && target !== 'extension' && target !== 'all') {
      throw new Error('--target must be web, extension, or all.');
    }
    const svgPath = resolve(values['svg-dir'] ?? '.', values.svg ?? 'favicon.svg');
    const files = await generateIcons({
      svgPath,
      outputDir,
      target,
      sourceSize: Number(values['source-size']),
      centerTolerance: Number(values['center-tolerance']),
      iconCornerRadiusRatio: Number(values['icon-corner-radius-ratio']),
      half: Number(values.half),
      iconScale: Number(values['icon-scale']),
    });
    process.stdout.write(
      `Generated ${files.length} ${target} icon assets from ${svgPath} in ${resolve(outputDir)}.\n`,
    );
  } catch (error) {
    console.error(
      `svg-to-app-icons: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
