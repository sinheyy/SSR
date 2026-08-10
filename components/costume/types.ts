export type WornItem = {
  source: "custom" | "catalog";
  item_id: string;
  x: number;
  y: number;
  scale?: number; // 기본 1
  rotation?: number; // 도(degree), 기본 0
};
