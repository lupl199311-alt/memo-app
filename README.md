# 티메모

할일을 집중 타이머에 올리고, 완료하면 자동 체크되는 작은 메모 앱입니다. 데이터는 브라우저에 먼저 저장되고, Supabase를 연결하면 로그인한 사용자 기준으로 모든 기기에서 동기화됩니다.

## Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. Project Settings > API에서 Project URL과 anon/public key를 복사합니다.
4. 앱을 열고 Supabase URL, anon/public key, 이메일, 비밀번호를 입력한 뒤 가입/로그인합니다.

`service_role` key는 절대 브라우저나 GitHub에 넣지 마세요. 이 앱은 공개 가능한 anon/public key와 Supabase Auth, RLS 정책만 사용합니다.

## 로컬 실행

```powershell
python server.py 4177
```

그다음 `http://localhost:4177/`로 접속합니다.

## 배포

정적 파일 앱이므로 GitHub Pages, Netlify, Vercel 등에 올릴 수 있습니다. Supabase URL과 anon/public key는 앱 첫 화면에서 입력하고 브라우저에 저장합니다.
