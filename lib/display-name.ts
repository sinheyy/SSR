// 스터디룸에 표시되는 이름은 "4기_판교_2반_윤신혜" 형식을 쓴다.
// 랭킹판·좌석·관리자 화면에서 이 이름 하나로 사람을 식별하기 때문에
// 기수/지역/반 정보가 붙어있어야 누가 누군지 알아볼 수 있다.
//
// 그런데 슬랙 프로필에 이름만 적어둔 사람은 로그인할 때 "윤신혜"처럼
// 이름만 넘어온다. 그래서 자유 입력 대신 네 칸으로 나눠 받아서 형식을
// 자동으로 조립한다 — 자유 입력으로 두면 "4기 판교 2반"처럼 구분자가
// 제각각이 되어 결국 아무도 형식을 안 지키게 된다.

export type NameParts = {
  generation: string; // 기수 (숫자만)
  region: string; // 지역 (예: 판교)
  classNo: string; // 반 (숫자만)
  realName: string; // 실명
};

export const EMPTY_NAME_PARTS: NameParts = {
  generation: "",
  region: "",
  classNo: "",
  realName: "",
};

// 지역/실명에 "_"가 들어가면 다시 파싱할 때 경계가 모호해지므로 막는다.
const NAME_PATTERN = /^(\d{1,2})기_([^_]+)_(\d{1,2})반_([^_]+)$/;

export const REGION_MAX_LENGTH = 10;
export const REAL_NAME_MAX_LENGTH = 20;

// 이미 형식을 갖춘 이름이면 칸별로 쪼개서 폼에 채워준다.
// 형식에 안 맞으면(슬랙에서 이름만 넘어온 경우) null을 돌려주고,
// 호출부에서 실명 칸에만 기존 값을 넣어 나머지를 채우게 유도한다.
export function parseDisplayName(name: string): NameParts | null {
  const matched = NAME_PATTERN.exec(name.trim());
  if (!matched) return null;

  return {
    generation: matched[1],
    region: matched[2],
    classNo: matched[3],
    realName: matched[4],
  };
}

export function composeDisplayName(parts: NameParts): string {
  const generation = parts.generation.trim();
  const region = parts.region.trim();
  const classNo = parts.classNo.trim();
  const realName = parts.realName.trim();

  return `${generation}기_${region}_${classNo}반_${realName}`;
}

// 통과하면 null, 문제가 있으면 사용자에게 보여줄 메시지를 돌려준다.
// 서버 액션과 폼 양쪽에서 같은 규칙을 쓰기 위해 분리했다.
export function validateNameParts(parts: NameParts): string | null {
  const generation = parts.generation.trim();
  const region = parts.region.trim();
  const classNo = parts.classNo.trim();
  const realName = parts.realName.trim();

  if (!generation || !region || !classNo || !realName) {
    return "모든 칸을 채워주세요.";
  }
  if (!/^\d{1,2}$/.test(generation) || Number(generation) < 1) {
    return "기수는 1~99 사이의 숫자로 입력해주세요.";
  }
  if (!/^\d{1,2}$/.test(classNo) || Number(classNo) < 1) {
    return "반은 1~99 사이의 숫자로 입력해주세요.";
  }
  if (region.includes("_") || realName.includes("_")) {
    return "지역과 이름에는 밑줄(_)을 쓸 수 없습니다.";
  }
  if (region.length > REGION_MAX_LENGTH) {
    return `지역은 ${REGION_MAX_LENGTH}자 이내로 입력해주세요.`;
  }
  if (realName.length > REAL_NAME_MAX_LENGTH) {
    return `이름은 ${REAL_NAME_MAX_LENGTH}자 이내로 입력해주세요.`;
  }

  return null;
}
