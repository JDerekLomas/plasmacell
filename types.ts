export interface CellState {
  activeFeature: string | null;
}

export interface OrganelleProps {
  onSelect: (feature: string) => void;
  activeFeature: string | null;
}
