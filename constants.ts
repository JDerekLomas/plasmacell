
export const COLORS = {
  MEMBRANE: '#a2c2e8',   // Pale Blue/Glass
  NUCLEUS: '#2E1A47',    // Indigo
  CHROMATIN: '#150a26',  // Very Dark Indigo/Black
  RER: '#40E0D0',        // Teal/Turquoise
  GOLGI: '#FFD700',      // Gold
  MITOCHONDRIA: '#FF6347', // Tomato Red
  LYSOSOME: '#4ade80',   // Bright Green
  CYTOPLASM: '#1a202c',  // Dark background filler
  CENTRIOLE: '#f472b6',  // Pink
  FREE_RIBOSOME: '#cbd5e1', // Light Slate
  ANTIBODY: '#fbbf24',   // Amber/Gold
  MICROTUBULE: '#475569' // Slate 600
};

export const DIMENSIONS = {
  CELL_RADIUS: 7.0,
  CELL_SCALE: [1.5, 1.0, 1.0] as [number, number, number], // Elongated (Ovoid)
  NUCLEUS_RADIUS: 2.4,
  NUCLEUS_OFFSET: [5.5, 0, 0] as [number, number, number], // Pushed to the side
  GOLGI_POS: [1.8, 0, 0] as [number, number, number], // In the "Hof" near nucleus
};

export interface BioInfo {
  title: string;
  description: string;
  function: string;
}

export const INFO_CONTENT: Record<string, BioInfo> = {
  "Cell": {
    title: "The Antibody Factory",
    description: "Meet the Plasma Cell. It's not just a generic cell; it's a specialized biological machine designed for one thing: Speed. While other cells have varied jobs, this one has transformed into a high-speed factory.",
    function: "Produces and fires thousands of antibodies per second into the bloodstream to hunt down invaders."
  },
  "Antibodies": {
    title: "The Product (Antibodies)",
    description: "Look at the swarm of Y-shaped molecules surrounding the cell! These are antibodies (Immunoglobulins). Notice they are all identical? That's because this cell is programmed to make only ONE specific type of antibody that targets ONE specific germ.",
    function: "Lock onto viruses and bacteria, tagging them for destruction by the immune system."
  },
  "Nucleus": {
    title: "The CEO's Office (Nucleus)",
    description: "See how the nucleus is pushed off to the side? That's because the factory floor (RER) needs so much space! This dark sphere holds the master blueprints.",
    function: "Protects the DNA instructions needed to build the specific antibody this cell produces."
  },
  "RER": {
    title: "The Assembly Line (Rough ER)",
    description: "This massive maze of teal tubes takes up almost the whole cell. It's 'Rough' because it's covered in millions of tiny ribosomes (dots). It's the main factory floor.",
    function: "Reads instructions from the nucleus and assembles raw amino acids into antibody protein chains."
  },
  "Golgi": {
    title: "Shipping & Packaging (Golgi)",
    description: "Located in the clear zone near the nucleus (the 'Hof'). The Golgi takes the raw antibodies from the RER, polishes them, and packs them into bubbles.",
    function: "Modifies proteins and packages them into vesicles for export."
  },
  "Mitochondria": {
    title: "Power Plants (Mitochondria)",
    description: "Running a factory 24/7 takes a lot of energy. These red, bean-shaped engines are everywhere, burning fuel to keep the lights on.",
    function: "Generate ATP energy to power the intense protein synthesis."
  },
  "Vesicles": {
    title: "Delivery Trucks (Vesicles)",
    description: "Watch these bubbles streaming from the gold Golgi to the outer wall. They travel along microtubule tracks before fusing with the membrane to release their cargo.",
    function: "Transport the final product to the cell membrane to be released."
  },
  "Lysosomes": {
    title: "Janitors (Lysosomes)",
    description: "Every factory creates waste. These green spheres contain acid to melt down broken parts or recycling.",
    function: "Clean up waste and recycle old organelles."
  },
  "Centrioles": {
    title: "Logistics Managers (Centrioles)",
    description: "A pair of barrel structures near the center. They organize the 'roads' (microtubules) that the delivery trucks drive on.",
    function: "Organize the cytoskeleton to guide traffic inside the cell."
  },
  "Ribosomes": {
    title: "The Workers (Free Ribosomes)",
    description: "While the RER ribosomes build product for export, these free-floating specks build tools for the factory itself.",
    function: "Build proteins that stay inside the cell to keep it alive."
  },
  "Microtubules": {
    title: "The Roads (Microtubules)",
    description: "These thin tubes act as highways. Vesicles latch onto them and are motored towards the cell surface.",
    function: "Provide structural support and transport tracks for organelles."
  }
};
