// src/types/amap.d.ts
declare module 'AMap' {
  export class Map {
    constructor(container: string | HTMLElement, options?: MapOptions);
    setCenter(center: [number, number]): void;
    add(overlays: any): void;
  }

  export interface MapOptions {
    zoom?: number;
    center?: [number, number];
  }

  export class Marker {
    constructor(options?: MarkerOptions);
    setPosition(position: [number, number]): void;
    setLabel(label: LabelOptions): void;
  }

  export interface MarkerOptions {
    position?: [number, number];
    title?: string;
    label?: LabelOptions;
  }

  export interface LabelOptions {
    content: string;
    offset?: Pixel;
  }

  export class Pixel {
    constructor(x: number, y: number);
  }
}
