# @pixpilot/svg-to-app-icons

Generate web app and Chrome extension PNG icons from one SVG using Sharp.
The CLI preserves the original script's inversion, black background, padding, rounded corners, and centering check.

## Generate icons

From the repository root:

```sh
pnpm generate:icons --svg ./brand.svg --output-dir ./generated-icons --target all
```

Use separate destinations for each target:

```sh
pnpm generate:icons --svg ./brand.svg --output-dir ./apps/web/public --target web
pnpm generate:icons --svg ./brand.svg --output-dir ./apps/chrome-extension/public/img --target extension
```

Read `favicon.svg` from a source directory, or choose another file within it:

```sh
pnpm generate:icons --svg-dir ./assets --output-dir ./generated-icons
pnpm generate:icons --svg-dir ./assets --svg brand.svg --output-dir ./generated-icons
```

## Configure rendering

| Flag                         | Default                                    | Accepted values / behavior                                                 |
| ---------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `--svg`, `-s`                | `favicon.svg` when `--svg-dir` is supplied | SVG file; relative to `--svg-dir`, otherwise the current working directory |
| `--svg-dir`                  | Current working directory                  | Directory containing the source SVG                                        |
| `--output-dir`, `-o`         | Required                                   | Output directory; created recursively                                      |
| `--target`, `-t`             | `all`                                      | `web`, `extension`, or `all`                                               |
| `--source-size`              | `1024`                                     | Positive integer; raster resolution for checking visible bounds            |
| `--center-tolerance`         | `2`                                        | Nonnegative number; allowed center offset in the bounds-check raster       |
| `--icon-corner-radius-ratio` | `0.18`                                     | Number from `0` to `0.5`; `0` gives square corners                         |
| `--half`                     | `2`                                        | Positive center-offset divisor; keep `2` for ordinary pixel units          |
| `--icon-scale`               | `0.85`                                     | Number greater than `0` and at most `1`; larger means less padding         |
| `--help`, `-h`               |                                            | Show usage                                                                 |

```sh
pnpm generate:icons --svg ./brand.svg --output-dir ./generated-icons --target web --source-size 1024 --center-tolerance 2 --icon-corner-radius-ratio 0.18 --half 2 --icon-scale 0.85
```

## Use the built CLI

From the repository root:

```sh
pnpm --filter @pixpilot/svg-to-app-icons build
node packages/svg-to-app-icons/dist/cli.js --svg ./brand.svg --output-dir ./generated-icons
```

The package exposes the `svg-to-app-icons` executable when installed.
It also exports a TypeScript API:

```ts
import { generateIcons } from '@pixpilot/svg-to-app-icons';

await generateIcons({
  svgPath: './brand.svg',
  outputDir: './generated-icons',
  target: 'web',
  iconScale: 0.85,
});
```

## Verify

Run `pnpm generate:icons --help` to inspect available flags.
Check that the selected output directory contains these PNGs:

| Target      | Files and sizes                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `web`       | `favicon-16.png` (16), `favicon-32.png` (32), `apple-touch-icon.png` (180), `icon-192.png` (192), `icon-512.png` (512) |
| `extension` | `logo-16.png` (16), `logo-32.png` (32), `logo-48.png` (48), `logo-128.png` (128)                                       |
| `all`       | All nine files, directly in `--output-dir`                                                                             |

Run package checks:

```sh
pnpm --filter @pixpilot/svg-to-app-icons typecheck
pnpm --filter @pixpilot/svg-to-app-icons lint
pnpm --filter @pixpilot/svg-to-app-icons test
```

## Gotchas

- Matching output filenames are overwritten. Regenerate after changing the SVG and commit the resulting assets when needed.
- Blank, invalid, or off-center SVGs fail before output files are created; adjust the SVG or increase `--center-tolerance`.
- `--svg-dir` selects the directory for one SVG; it does not batch-convert the directory.
- Text SVGs use fonts installed on the machine; convert text to paths for reproducible brand assets.
- `--half` changes the centering check's offset units; it does not move the artwork.
- Relative CLI paths are resolved from the working directory where the CLI runs. For the root pnpm script, use repository-root paths.
