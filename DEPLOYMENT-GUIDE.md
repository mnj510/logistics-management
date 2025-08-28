# 🚀 배포 가이드 - GitHub Pages + Supabase

물류 관리 시스템을 GitHub Pages와 Supabase를 사용하여 자동 배포하는 완전한 가이드입니다.

## 📋 준비사항

- GitHub 계정
- Supabase 계정 (무료)
- 웹 브라우저

---

## 1️⃣ GitHub 저장소 생성 및 코드 업로드

### 1.1 GitHub 저장소 생성

1. **GitHub 웹사이트 접속**
   - https://github.com 접속
   - 로그인

2. **새 저장소 생성**
   - 우측 상단 `+` 버튼 클릭 → `New repository` 선택
   - Repository name: `logistics-management` (원하는 이름으로 변경 가능)
   - Description: `물류 관리 시스템`
   - Public 선택 (GitHub Pages 무료 사용을 위해)
   - `Create repository` 버튼 클릭

### 1.2 로컬 코드를 GitHub에 업로드

**방법 1: GitHub 웹 인터페이스 사용 (초보자 추천)**

1. 생성된 저장소 페이지에서 `uploading an existing file` 클릭
2. 물류 관리 시스템 폴더의 모든 파일을 드래그 앤 드롭
3. Commit message: `Initial commit - 물류 관리 시스템`
4. `Commit changes` 버튼 클릭

**방법 2: Git 명령어 사용**

```bash
# 터미널에서 프로젝트 폴더로 이동
cd /Users/nj/Downloads/logistics-management

# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit - 물류 관리 시스템"

# GitHub 저장소와 연결 (YOUR_USERNAME을 실제 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/logistics-management.git

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

---

## 2️⃣ GitHub Pages 자동 배포 설정

### 2.1 GitHub Pages 활성화

1. **저장소 Settings 접속**
   - GitHub 저장소 페이지에서 `Settings` 탭 클릭

2. **Pages 설정**
   - 왼쪽 메뉴에서 `Pages` 클릭
   - Source: `Deploy from a branch` 선택
   - Branch: `gh-pages` 선택 (없으면 `main` 선택)
   - Folder: `/ (root)` 선택
   - `Save` 버튼 클릭

### 2.2 GitHub Actions 확인

1. **Actions 탭 확인**
   - 저장소 페이지에서 `Actions` 탭 클릭
   - 자동 배포 워크플로우가 실행되는지 확인

2. **배포 URL 확인**
   - 몇 분 후 `Settings` → `Pages`에서 배포 URL 확인
   - URL 형태: `https://YOUR_USERNAME.github.io/logistics-management`

---

## 3️⃣ Supabase 프로젝트 생성 및 설정

### 3.1 Supabase 계정 생성 및 프로젝트 생성

1. **Supabase 웹사이트 접속**
   - https://supabase.com 접속
   - `Start your project` 클릭

2. **GitHub으로 로그인**
   - `Sign in with GitHub` 선택
   - GitHub 계정으로 로그인

3. **새 프로젝트 생성**
   - `New Project` 버튼 클릭
   - Organization: 개인 계정 선택
   - Project name: `logistics-management`
   - Database Password: 안전한 비밀번호 생성 (기록해두세요!)
   - Region: `Northeast Asia (Seoul)` 선택 (한국 서버)
   - `Create new project` 버튼 클릭

### 3.2 데이터베이스 테이블 생성

1. **SQL Editor 접속**
   - Supabase 대시보드에서 왼쪽 메뉴의 `SQL Editor` 클릭

2. **스키마 실행**
   - `New query` 버튼 클릭
   - 프로젝트 폴더의 `supabase-schema.sql` 파일 내용을 복사하여 붙여넣기
   - `Run` 버튼 클릭하여 실행

3. **테이블 확인**
   - 왼쪽 메뉴의 `Table Editor` 클릭
   - 다음 테이블들이 생성되었는지 확인:
     - `attendance_records` (출퇴근 기록)
     - `inventory` (재고)
     - `transactions` (거래 내역)
     - `packing_records` (포장 기록)
     - `tasks` (업무 루틴)

### 3.3 API 키 및 URL 확인

1. **Project Settings 접속**
   - 왼쪽 메뉴 하단의 `Settings` 클릭
   - `API` 메뉴 선택

2. **필요한 정보 복사**
   - **Project URL**: `https://xxx.supabase.co` 형태
   - **anon public key**: `eyJ...` 형태의 긴 키
   - 이 정보들을 안전한 곳에 기록해두세요!

---

## 4️⃣ Supabase 설정 연결

### 4.1 config.js 파일 수정

1. **로컬 파일 수정**
   - `config.js` 파일 열기
   - 다음과 같이 수정:

```javascript
// Supabase 설정
window.SUPABASE_URL = 'https://your-project-id.supabase.co';  // 실제 Project URL로 변경
window.SUPABASE_ANON_KEY = 'your-anon-key-here';  // 실제 anon key로 변경
```

2. **GitHub에 업데이트**
   - 수정된 파일을 GitHub 저장소에 업로드
   - 방법 1: 웹에서 파일 편집
     - GitHub 저장소에서 `config.js` 파일 클릭
     - 연필 아이콘(Edit) 클릭
     - 내용 수정 후 `Commit changes` 클릭
   
   - 방법 2: Git 명령어 사용
     ```bash
     git add config.js
     git commit -m "Supabase 설정 추가"
     git push
     ```

### 4.2 자동 배포 확인

1. **GitHub Actions 확인**
   - 저장소의 `Actions` 탭에서 배포 진행상황 확인
   - 녹색 체크마크가 나타나면 배포 완료

2. **웹사이트 접속**
   - `https://YOUR_USERNAME.github.io/logistics-management` 접속
   - 개발자 도구(F12) → Console에서 "Supabase 연결됨" 메시지 확인

---

## 5️⃣ 테스트 및 확인

### 5.1 기능 테스트

1. **출퇴근 기록**
   - 출근/퇴근 버튼 테스트
   - Supabase Dashboard → Table Editor → `attendance_records`에서 데이터 확인

2. **재고 관리**
   - 상품 추가 테스트
   - `inventory` 테이블에서 데이터 확인

3. **다중 사용자 테스트**
   - 다른 브라우저나 시크릿 모드에서 같은 URL 접속
   - 한 브라우저에서 데이터 추가 후 다른 브라우저에서 새로고침하여 동기화 확인

### 5.2 문제 해결

**Supabase 연결 안됨**
- 개발자 도구 Console에서 오류 메시지 확인
- `config.js`의 URL과 키가 올바른지 확인
- Supabase 프로젝트가 활성 상태인지 확인

**GitHub Pages 배포 안됨**
- Actions 탭에서 오류 로그 확인
- 저장소가 Public인지 확인
- `gh-pages` 브랜치가 생성되었는지 확인

---

## 6️⃣ 추가 설정 (선택사항)

### 6.1 커스텀 도메인 설정

1. **도메인 구입** (예: 가비아, 후이즈 등)
2. **GitHub Pages 설정**
   - Settings → Pages → Custom domain에 도메인 입력
3. **DNS 설정**
   - 도메인 관리 페이지에서 CNAME 레코드 추가
   - 값: `YOUR_USERNAME.github.io`

### 6.2 HTTPS 강제 설정

1. **GitHub Pages 설정**
   - Settings → Pages → `Enforce HTTPS` 체크

### 6.3 Supabase 보안 강화

1. **RLS 정책 세밀화**
   - 필요에 따라 사용자별 데이터 접근 제한
2. **API 키 환경변수 관리**
   - GitHub Secrets를 통한 키 관리 (고급 사용자)

---

## 🎉 완료!

이제 물류 관리 시스템이 다음과 같이 배포되었습니다:

- **웹사이트**: `https://YOUR_USERNAME.github.io/logistics-management`
- **데이터베이스**: Supabase 클라우드
- **자동 배포**: 코드 변경 시 자동으로 업데이트

### 📱 사용법

1. 웹사이트 접속
2. 관리자 모드: 비밀번호 `0455`
3. 모든 기능이 실시간으로 동기화됨
4. 여러 사용자가 동시에 사용 가능

### 🔧 유지보수

- **코드 수정**: GitHub 저장소에서 파일 수정 → 자동 배포
- **데이터 백업**: Supabase Dashboard에서 데이터 내보내기
- **사용량 모니터링**: Supabase Dashboard에서 사용량 확인

---

## 🆘 도움이 필요하다면

1. **GitHub Issues**: 저장소에서 이슈 생성
2. **Supabase 문서**: https://supabase.com/docs
3. **GitHub Pages 문서**: https://docs.github.com/en/pages

축하합니다! 🎊 물류 관리 시스템이 성공적으로 배포되었습니다.
