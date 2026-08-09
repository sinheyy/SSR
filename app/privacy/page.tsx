export const metadata = {
  title: "개인정보 처리방침 | SKALA 스터디룸",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
        SKALA 스터디룸 개인정보 처리방침
      </h1>
      <p className="mb-8 text-xs text-zinc-500 dark:text-zinc-400">
        시행일자: 2026-08-10
      </p>

      <p className="mb-6">
        SKALA 스터디룸(이하 &quot;서비스&quot;)은 개인정보 보호법 제30조에 따라
        정보주체의 개인정보를 보호하고 관련 고충을 신속하게 처리할 수 있도록
        다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          1. 개인정보의 처리 목적
        </h2>
        <ul className="list-disc pl-5">
          <li>Slack 계정을 통한 회원 식별·인증 및 로그인 서비스 제공</li>
          <li>문의하기(1:1 문의) 접수, 확인 및 답변</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          2. 처리하는 개인정보의 항목
        </h2>
        <ul className="list-disc pl-5">
          <li>
            Slack 로그인 시: Slack 사용자 ID, 이름, 이메일, 프로필 이미지
            (Slack이 제공하는 범위 내에서, 로그인 및 서비스 이용 목적으로만
            사용하며 그 외 목적으로 이용하지 않습니다)
          </li>
          <li>
            문의하기 작성 시: 문의 유형, 제목, 문의 내용, 작성자 계정 정보
            (이름)
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          3. 개인정보의 처리 및 보유 기간
        </h2>
        <p>
          회원 탈퇴 시까지 보유하며, 탈퇴 시 지체 없이 파기합니다. 단, 관계
          법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 절차 종료
          시까지 보유할 수 있습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          4. 개인정보의 파기절차 및 파기방법
        </h2>
        <p>
          보유기간 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때는
          지체 없이 파기합니다. 전자적 파일 형태로 저장된 개인정보는 기록을
          재생할 수 없는 방법으로 삭제합니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          5. 개인정보의 안전성 확보조치
        </h2>
        <p>
          Supabase Row Level Security(RLS)를 적용해 본인의 데이터는 본인만
          접근·수정할 수 있도록 제한하며, 문의 내용은 작성자 본인과 관리자만
          열람할 수 있습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          6. 정보주체의 권리·행사방법
        </h2>
        <p>
          정보주체는 자신의 개인정보에 대해 언제든지 열람·정정·삭제·처리정지를
          요구할 수 있습니다. 아래 개인정보 보호책임자에게 서면, 이메일 등을
          통해 요청하실 수 있습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          7. 개인정보 보호책임자
        </h2>
        <p>
          이름: 윤신혜
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">
          8. 처리방침의 변경
        </h2>
        <p>
          이 처리방침은 시행일로부터 적용되며, 변경 시 공지사항을 통해 사전
          고지합니다.
        </p>
      </section>
    </div>
  );
}
