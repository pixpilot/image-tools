import type { RenderOptions } from './types';

const MAX_CORNER_RADIUS_RATIO = 0.5;

// Validate rendering settings before reading the source or writing any files.
export function ensureOptions(options: RenderOptions): void {
  for (const [name, value] of Object.entries(options)) {
    if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
  }
  if (!Number.isInteger(options.sourceSize) || options.sourceSize < 1) {
    throw new Error('sourceSize must be a positive integer.');
  }
  if (options.centerTolerance < 0) {
    throw new Error('centerTolerance must be zero or greater.');
  }
  if (
    options.iconCornerRadiusRatio < 0 ||
    options.iconCornerRadiusRatio > MAX_CORNER_RADIUS_RATIO
  ) {
    throw new Error('iconCornerRadiusRatio must be between 0 and 0.5.');
  }
  if (options.half <= 0) throw new Error('half must be greater than zero.');
  if (options.iconScale <= 0 || options.iconScale > 1) {
    throw new Error('iconScale must be greater than zero and at most 1.');
  }
}
