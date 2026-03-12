// src/declarations.d.ts

// Declare a basic structure for VANTA to satisfy TypeScript
// If you use more features, you might need to extend this.
interface VantaNet {
  destroy: () => void;
  // Add other properties/methods you use from VANTA.NET here if needed
  // For example: setOptions: (options: object) => void;
}
declare module '*.css';
interface Window {
  // Use a more specific type for VANTA if you know its structure
  // Otherwise, if no @types package exists, you might keep `any` but it's less safe.
  VANTA: {
    NET: (options: object) => VantaNet;
    current?: VantaNet; // VANTA often attaches its current instance here
    // Add other VANTA effects here if you use them, e.g., FOG, BIRDS
  };
  // Keep `any` for THREE for now if you're not deeply integrating it
  // For full Three.js usage, consider installing @types/three.

  requestIdleCallback?: (
    callback: (deadline: RequestIdleCallbackDeadline) => void,
    options?: RequestIdleCallbackOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

// Define the types for requestIdleCallback's arguments
interface RequestIdleCallbackDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

interface RequestIdleCallbackOptions {
  timeout: number;
}

// Allow importing any CSS file
declare module '*.css';

// Explicitly declare Swiper’s CSS entry points
declare module 'swiper/css';
declare module 'swiper/css/navigation';
declare module 'swiper/css/pagination';
declare module 'swiper/css/scrollbar';
declare module 'swiper/css/effect-fade';
declare module 'swiper/css/effect-cube';
declare module 'swiper/css/effect-coverflow';
declare module 'swiper/css/effect-flip';

// Explicitly declare the canvas-confetti module
declare module 'canvas-confetti' {
  interface Confetti {
    (
      options?: {
        particleCount?: number;
        spread?: number;
        startVelocity?: number;
        origin?: { x?: number; y?: number };
        colors?: string[];
        scalar?: number;
        shapes?: (string | 'circle' | 'square')[];
      }
    ): void;
    create: (
      canvas: HTMLCanvasElement,
      options?: { resize?: boolean; useManual?: () => void }
    ) => Confetti;
  }

  const confetti: Confetti;
  export = confetti;
}
