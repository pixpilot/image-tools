export type IconTarget = 'web' | 'extension' | 'all';

export interface IconDefinition {
  fileName: string;
  size: number;
}

export interface GenerateIconsOptions {
  svgPath: string;
  outputDir: string;
  target?: IconTarget;
  sourceSize?: number;
  centerTolerance?: number;
  iconCornerRadiusRatio?: number;
  half?: number;
  iconScale?: number;
}

export interface RenderOptions {
  sourceSize: number;
  centerTolerance: number;
  iconCornerRadiusRatio: number;
  half: number;
  iconScale: number;
}
