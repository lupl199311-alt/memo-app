# luplmemo

할일을 집중 타이머에 올리고, 완료하면 자동 체크되는 작은 메모 앱입니다. 데이터는 브라우저에 먼저 저장되고, Supabase 로그인 후 모든 기기에서 동기화됩니다.

## 사용 방법

1. 앱을 엽니다.
2. 이메일과 비밀번호로 가입 또는 로그인합니다.
3. 다른 폰이나 컴퓨터에서도 같은 이메일과 비밀번호로 로그인하면 같은 기록을 볼 수 있습니다.

할일 입력칸에는 여러 줄을 한 번에 붙여넣을 수 있습니다. 한 줄에 하나씩 적고 `추가`를 누르면 빈 줄은 건너뛰고 각각 별도의 할일로 만들어집니다.

Supabase Project URL과 anon/public key는 앱 코드에 들어 있습니다. `service_role` key는 절대 브라우저나 GitHub에 넣지 않습니다.

## Supabase 초기 설정

Supabase 프로젝트를 새로 만들 때는 SQL Editor에서 `supabase/schema.sql` 내용을 한 번 실행합니다.

## 로컬 실행

```powershell
python server.py 4177
```

그다음 `http://localhost:4177/`로 접속합니다.

## 배포

정적 파일 앱이므로 GitHub Pages, Netlify, Vercel 등에 올릴 수 있습니다.
