import type { Buffer } from 'node:buffer';
import type { RenderOptions } from './types';
import sharp from 'sharp';

// Check the source's visible pixel bounds against the requested center tolerance.
export async function ensureCentered(
  svg: Buffer,
  { sourceSize, centerTolerance, half }: RenderOptions,
): Promise<void> {
  const source = sharp(svg);
  if ((await source.metadata()).format !== 'svg') {
    throw new Error('The source must be an SVG image.');
  }
  const { data, info } = await source
    .resize(sourceSize, sourceSize, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
      if (alpha !== undefined && alpha !== 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < 0) throw new Error('The source SVG has no visible pixels.');
  const horizontalOffset = (left + right + 1 - sourceSize) / half;
  const verticalOffset = (top + bottom + 1 - sourceSize) / half;
  if (
    Math.abs(horizontalOffset) > centerTolerance ||
    Math.abs(verticalOffset) > centerTolerance
  ) {
    throw new Error(
      `The source SVG is not centered (x: ${horizontalOffset}px, y: ${verticalOffset}px).`,
    );
  }
}
