# luplmemo

할일을 집중 타이머에 올리고, 완료하면 자동 체크되는 작은 메모 앱입니다. 데이터는 브라우저에 먼저 저장되고, Supabase 로그인 후 모든 기기에서 동기화됩니다.

## 사용 방법

1. 앱을 엽니다.
2. 이메일과 비밀번호로 가입 또는 로그인합니다.
3. 다른 폰이나 컴퓨터에서도 같은 이메일과 비밀번호로 로그인하면 같은 기록을 볼 수 있습니다.

할일 입력칸에 한 줄을 적고 `Enter`를 누르면 바로 할일로 추가됩니다. 여러 줄을 한 번에 붙여넣으면 빈 줄은 건너뛰고 각각 별도의 할일로 만들어집니다.

할일 목록의 각 항목에서 `AI`를 누르면 그 할일에 대해 `일 따오기`, `돈 관리`, `일정 조율`, `내부 업무` 중 하나를 고르고, 마감과 미루면 생기는 영향까지 버튼으로 답한 뒤 우선순위를 자동 배정합니다. 로그인하지 않아도 로컬 기준으로 정리되며, Supabase Edge Function이 연결된 로그인 상태에서는 AI 결과를 우선 사용합니다. 아직 AI 배정이 없는 할일은 목록 아래에 표시됩니다.

Supabase Project URL과 anon/public key는 앱 코드에 들어 있습니다. `service_role` key는 절대 브라우저나 GitHub에 넣지 않습니다.

## Supabase 초기 설정

Supabase 프로젝트를 새로 만들 때는 SQL Editor에서 `supabase/schema.sql` 내용을 한 번 실행합니다.

AI 우선순위를 쓰려면 Supabase Edge Function `prioritize-todos`를 배포하고, Supabase Dashboard의 Edge Function Secrets에 `OPENAI_API_KEY`를 추가합니다. OpenAI 키는 브라우저 코드나 GitHub에 넣지 않습니다. 선택 사항으로 `OPENAI_MODEL`을 넣으면 기본 모델을 바꿀 수 있으며, 기본값은 `gpt-5-mini`입니다.

## 로컬 실행

```powershell
python server.py 4177
```

그다음 `http://localhost:4177/`로 접속합니다.

## 배포

정적 파일 앱이므로 GitHub Pages, Netlify, Vercel 등에 올릴 수 있습니다.
