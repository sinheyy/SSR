export const FEEDBACK_TYPES = [
  "버그 신고",
  "기능 제안",
  "사용 문의",
  "기타",
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export function isFeedbackType(value: string): value is FeedbackType {
  return (FEEDBACK_TYPES as readonly string[]).includes(value);
}

export type FeedbackItem = {
  id: string;
  userId: string;
  userName: string;
  type: FeedbackType;
  title: string;
  content: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
};
