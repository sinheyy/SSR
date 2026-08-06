export type Occupant = {
  userId: string;
  name: string;
  avatarUrl?: string;
  sittingSince: string;
  mood: string | null;
  avatarColor: string | null;
  customItems?: { image: string; x: number; y: number }[];
};

export type SeatData = {
  id: string;
  position: number;
  occupant: Occupant | null;
};

export type TableData = {
  id: string;
  name: string;
  capacity: 4 | 6;
  seats: SeatData[];
};
