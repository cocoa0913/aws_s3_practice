# 스와이프 벽돌깨기 (Swipe Brick Breaker)

React + Vite 기반의 스와이프 벽돌깨기 웹 게임입니다. 게임 오버 시 이름과 점수를 기록하여 로컬 랭킹(TOP 10)을 관리합니다.

> **수업 과제**
> - 과제 1: GitHub Actions 를 활용한 CI/CD 환경 구축 (실습 4)
> - 과제 2: AWS Amplify 서비스를 활용한 호스팅 (실습 5)

---

## 1. 시스템 소개

| 항목 | 내용 |
| --- | --- |
| 프로젝트명 | 스와이프 벽돌깨기 (Swipe Brick Breaker) |
| 프레임워크 | React 18 + Vite 5 |
| 언어 | JavaScript (JSX) |
| 데이터 저장 | 브라우저 `localStorage` (랭킹 TOP 10) |
| 호스팅 | AWS Amplify (정적 호스팅) |
| CI/CD | GitHub Actions |

## 2. 주요 기능

- **스와이프 발사**: 발사대에서 위쪽으로 드래그한 방향으로 보유한 모든 공이 순차 발사됩니다.
- **라운드 진행**: 공이 모두 회수되면 위에서 새 줄의 벽돌이 한 칸 내려옵니다.
- **체력 증가**: 라운드가 진행될수록 새로 등장하는 벽돌의 체력이 점점 커집니다.
- **공 추가 픽업(+)**: 파란 동그라미 픽업에 닿으면 다음 라운드 공 개수가 1 증가합니다.
- **게임 오버**: 벽돌이 빨간 점선(게임 오버 라인) 아래로 내려오면 종료.
- **랭킹 시스템**: 게임 오버 시 이름 + 점수를 입력해 `localStorage` 에 TOP 10 저장.
- **반응형 UI**: 모바일/PC 모두 지원 (포인터 이벤트로 마우스·터치 동시 처리).

## 3. 폴더 구조

```
.
├─ index.html
├─ package.json
├─ vite.config.js
├─ src/
│  ├─ main.jsx           # React 엔트리
│  ├─ App.jsx            # 화면 라우팅 (홈 / 플레이 / 게임오버 / 랭킹)
│  ├─ BrickBreaker.jsx   # 캔버스 게임 컴포넌트
│  ├─ storage.js         # localStorage 랭킹 유틸
│  └─ styles.css         # 전역 스타일
└─ .github/workflows/
   └─ deploy.yml             # GitHub Actions 워크플로
```

## 4. 로컬 실행 방법

```bash
npm install
npm run dev      # http://localhost:5173 에서 실행
npm run build    # dist/ 로 정적 빌드
npm run preview  # 빌드 결과 미리보기
```

## 5. GitHub Actions CI/CD 환경

- 워크플로 파일: `.github/workflows/deploy.yml`
- 트리거: `main` 브랜치로의 `push` 및 `pull_request`
- 단계:
  1. 저장소 체크아웃
  2. Node.js 20 설치 및 의존성 설치 (`npm ci`)
  3. 빌드 검증 (`npm run build`)
  4. 빌드 산출물(`dist/`) 아티팩트 업로드

### Secrets 등록 (AWS Academy 사용 시)

GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에서 등록합니다.

| Secret 이름 | 설명 |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | AWS Academy 콘솔에서 발급받은 Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Academy 콘솔에서 발급받은 Secret Key |
| `AWS_SESSION_TOKEN` | AWS Academy 의 임시 세션 토큰 (4시간 유효) |
| `AWS_REGION` | 사용하는 리전 (예: `us-east-1`) |

> AWS Academy 의 자격증명은 약 4시간마다 만료되므로, 만료 시 위 Secret 값을 다시 갱신해야 합니다.

## 6. AWS 호스팅

- **AWS Amplify** 콘솔에서 본 GitHub 저장소를 연결하여 자동 빌드/배포가 이루어집니다.
- 빌드 명령: `npm run build`
- 출력 디렉토리: `dist`

### 배포 URL (세션 4시간만 유효)
- 🌐 **CI/CD URL**: http://mybucket-20263584.s3-website-us-east-1.amazonaws.com/
- 🌐 **AWS Amplify URL**: https://main.d3771mk5m08r6l.amplifyapp.com/

## 7. 시연 영상 (YouTube)

- 🎬 **GitHub Actions CI/CD 구축 시연**: https://youtu.be/nUUmJ2R9pFA
- 🎬 **AWS Amplify 호스팅 시연**: https://youtu.be/J8nkTG-k2Fk

## 8. 게임 룰 요약

1. 화면 하단의 발사대에서 위쪽으로 드래그하여 발사 방향을 설정합니다.
2. 손을 떼면 보유한 모든 공이 그 방향으로 순차 발사됩니다.
3. 벽돌에 부딪히면 체력이 1씩 깎이며 0이 되면 사라지고 점수가 올라갑니다.
4. 공이 전부 바닥으로 돌아오면 한 라운드가 종료되고, 새 줄의 벽돌이 위에서 한 칸 내려옵니다.
5. 파란 + 픽업에 닿으면 다음 라운드부터 공이 1개 더 늘어납니다.
6. 벽돌이 화면 하단의 빨간 점선을 넘어가면 게임 오버, 점수가 랭킹에 등록됩니다.
