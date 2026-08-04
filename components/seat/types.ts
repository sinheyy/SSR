export type Occupant = {
  name: string;
  avatarUrl?: string;
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
