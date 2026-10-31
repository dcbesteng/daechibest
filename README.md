# 대치베스트어학원 홈페이지

프레임워크 없이 HTML · CSS · JavaScript만으로 만든 정적 사이트입니다. GitHub Pages에 그대로 올리면 동작합니다.

## 파일 구성

```
index.html        메인
about.html        학원소개 (인사말 · 학원시스템 · 입시로드맵)
test.html         입학테스트 안내 + 신청 폼
elementary.html   초등부 (정규 · 클리닉 · 시간표 · 관리시스템)
middle.html       중등부 (정규 · 내신 · 시간표 · 관리시스템)
high.html         고등부 (정규 · 내신 · 시간표 · 관리시스템)
info.html         입시정보 (교육정보 · 설명회 소식 · 성공 후기 · FAQ)
privacy.html      개인정보처리방침
css/site.css      전체 스타일
js/config.js      전화번호 · 주소 · 운영시간 · 공지 · 폼 전송 기본값 (관리자 설정이 있으면 그것이 우선)
js/site.js        머리글(메가 메뉴) · 바닥글 · 모바일 메뉴 · 신청 폼 동작 · 저장된 데이터 적용
js/admin.js       관리자 모드 (화면 편집 · 설정 · 비밀번호 변경)
data/site.json    관리자 모드로 저장한 문구·설정·비밀번호 해시
img/logo.svg      임시 로고 (실제 로고로 교체)
```

머리글과 바닥글은 `js/site.js`가 모든 페이지에 자동으로 넣습니다. 메뉴 이름이나 순서를 바꾸려면 `js/site.js` 맨 위의 `MENU` 배열만 고치면 됩니다.

## 0. 관리자 모드로 수정하기 (가장 쉬운 방법)

홈페이지 맨 아래 작은 **관리자** 글자를 누르거나, 주소 뒤에 `?admin`을 붙여 엽니다. (예: `https://dcbesteng.github.io/daechibest/?admin`)

1. **비밀번호** 입력 (처음 비밀번호는 `best2026` — 첫 로그인 때 안전한 비밀번호로 바꾸는 창이 뜹니다: 12자 이상, 영문·숫자·기호)
2. **GitHub 토큰** 입력 — 사이트 전체에서 딱 한 번. 비밀번호로 암호화되어 보관되므로 이후에는 어느 기기에서든 비밀번호만 넣으면 됩니다. 만드는 법은 로그인 창의 "토큰 만드는 방법"에 있습니다.
   - github.com → 프로필 → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
   - Repository access: *Only select repositories → daechibest* / Permissions: *Contents → Read and write*
3. 화면의 글자를 클릭해 바로 고칩니다. 링크 주소는 **더블클릭**, 표·목록 항목은 **＋ / ✕** 버튼으로 추가·삭제.
4. 아래 **저장하기** → 1~2분 뒤 사이트에 반영됩니다.
5. **설정** 버튼에서 전화번호·주소·운영시간·상단 공지·로고·신청 폼 주소를 바꿉니다.

수정한 내용은 `data/site.json`에 저장되며, HTML 파일은 그대로 둡니다. 비밀번호는 해시로만, 토큰은 비밀번호로 암호화된 형태로만 저장됩니다. 그래서 **비밀번호가 곧 열쇠**입니다 — 짧거나 쉬운 비밀번호는 쓰지 마세요. 토큰이 만료되거나 바뀌면 "비밀번호 변경 → GitHub 토큰 다시 등록"에서 새 토큰을 넣습니다.

## 1. 먼저 채울 것

1. `js/config.js` — 전화번호, 주소, 운영시간, 상단 공지, 사업자 정보
2. 각 페이지의 `[대괄호]` 자리표시 — 운영 연차, 수업 횟수, 시간표, 강사진, 후기 등
3. `img/logo.svg` — 실제 로고 파일로 교체 (PNG면 `js/site.js`의 `img/logo.svg`를 파일명에 맞게 수정)

## 2. 신청 폼 받는 방법 (둘 중 하나)

- **폼 서비스 사용(권장)**: [Formspree](https://formspree.io) 같은 서비스에서 무료 폼을 만들고 받은 주소를 `js/config.js`의 `formEndpoint`에 넣습니다. 신청 내용이 이메일로 옵니다.
- **이메일 방식**: `formEndpoint`를 비워 두고 `formEmail`에 받을 주소를 넣으면, 신청 버튼을 눌렀을 때 내용이 채워진 이메일 작성 화면이 열립니다.

## 3. 지도 넣기

네이버 지도 또는 카카오맵에서 학원을 검색 → "공유" → "퍼가기(HTML)" → `<iframe src="...">`의 주소만 복사해 `js/config.js`의 `mapEmbedUrl`에 넣습니다.

## 4. GitHub Pages에 올리기

1. GitHub에서 새 저장소를 만듭니다 (예: `daechibest`).
2. 이 폴더의 파일을 전부 올립니다 (웹에서 드래그 앤 드롭 가능).
3. 저장소 **Settings → Pages → Branch: main / (root) → Save**
4. 1~2분 뒤 `https://<계정명>.github.io/daechibest/` 에서 열립니다.

자체 도메인(예: `daechibest.co.kr`)을 쓰려면 Settings → Pages → Custom domain에 입력하고, 도메인 업체에서 CNAME을 `<계정명>.github.io`로 설정합니다.

## 5. 수정 후 반영

파일을 고쳐 저장소에 다시 올리면 자동으로 반영됩니다. 휴대폰에서 옛 화면이 보이면 새로고침하거나, `css/site.css?v=2`처럼 각 HTML의 CSS/JS 주소 뒤에 버전 숫자를 붙여 올립니다.

## 로컬에서 미리 보기

폴더에서 아래 명령을 실행하고 브라우저에서 `http://localhost:8000` 을 엽니다.

```
python3 -m http.server 8000
```
