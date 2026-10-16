declare module "mind-ar/dist/mindar-image-three.prod.js" {
  import type {
    Group,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
  } from "three";

  interface MindARThreeOptions {
    container: HTMLElement;
    imageTargetSrc: string;
    maxTrack?: number;
    uiError?: string;
    uiLoading?: string;
    uiScanning?: string;
  }

  interface MindARAnchor {
    group: Group;
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions);
    readonly camera: PerspectiveCamera;
    readonly renderer: WebGLRenderer;
    readonly scene: Scene;
    addAnchor(index: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}
