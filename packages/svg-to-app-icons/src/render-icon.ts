import type { IconDefinition, RenderOptions } from './types';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';

// Render an inverted SVG on black with centered padding and transparent rounded corners.
export async function renderIcon(
  svg: Buffer,
  destination: string,
  { size }: IconDefinition,
  { iconScale, iconCornerRadiusRatio }: RenderOptions,
): Promise<void> {
  const scaledSize = Math.max(1, Math.round(size * iconScale));
  const renderedIcon = await sharp(svg)
    .resize(scaledSize, scaledSize, { fit: 'fill' })
    .negate({ alpha: false })
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="100%" height="100%" rx="${size * iconCornerRadiusRatio}" fill="#fff"/>` +
      '</svg>',
  );

  await sharp({
    create: { width: size, height: size, channels: 4, background: '#000000' },
  })
    .composite([
      { input: renderedIcon, gravity: 'centre' },
      { input: mask, blend: 'dest-in' },
    ])
    .png()
    .toFile(destination);
}
