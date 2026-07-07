# Sportz

WebSocket 학습을 목적으로 간단하게 구현해본 프로젝트입니다. 실시간 스포츠 경기 정보와 실황 코멘터리(commentary)를 제공하는 백엔드 API 서버로, 경기 생성/조회와 코멘터리 등록/조회를 REST API로 제공하고, WebSocket을 통해 새 경기 생성 및 코멘터리 이벤트를 실시간으로 브로드캐스트합니다.

## 시스템 환경

- Node.js 22.x
- Express 5
- PostgreSQL (Drizzle ORM)
- WebSocket (`ws`)
- Arcjet (보안/요청 필터링 미들웨어)

## 폴더 구조

```
src/
├── index.js              # 서버 진입점 (Express + WebSocket)
├── arcjet.js             # Arcjet 보안 미들웨어
├── db/
│   ├── db.js             # DB 커넥션 설정
│   └── schema.js         # Drizzle 테이블 스키마 (matches, commentary)
├── routes/
│   ├── matches.js        # 경기 목록 조회/생성 API
│   └── commentary.js     # 코멘터리 목록 조회/생성 API
├── validation/           # Zod 스키마 (요청 검증)
├── utils/                # 유틸 함수 (경기 상태 계산 등)
└── ws/
    └── server.js         # WebSocket 서버, 브로드캐스트 로직

drizzle/                  # DB 마이그레이션 파일
drizzle.config.js         # Drizzle Kit 설정
```

## 환경 변수

`.env` 파일에 아래 값을 설정합니다.

```
DATABASE_URL=   # PostgreSQL 연결 문자열
PORT=8000
HOST=0.0.0.0
ARCJET_KEY=
ARCJET_ENV=development
API_URL=http://localhost:8000
BROADCAST=1
DELAY_MS=250
MATCH_COUNT=0
```

## 실행 방법

```bash
# 의존성 설치
npm install

# DB 마이그레이션 적용
npm run db:migrate

# 개발 서버 실행 (파일 변경 감지)
npm run dev

# 프로덕션 실행
npm start
```

서버가 실행되면 다음 주소로 접근할 수 있습니다.

- API: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws`

## 주요 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/matches` | 경기 목록 조회 |
| POST | `/matches` | 경기 생성 |
| GET | `/matches/:id/commentary` | 특정 경기의 코멘터리 목록 조회 |
| POST | `/matches/:id/commentary` | 코멘터리 등록 |

경기 생성 및 코멘터리 등록 시 WebSocket을 통해 연결된 클라이언트에게 실시간으로 이벤트가 브로드캐스트됩니다.

## 기타 스크립트

```bash
npm run db:generate  # Drizzle 마이그레이션 파일 생성
npm run db:studio    # Drizzle Studio 실행 (DB GUI)
npm run demo         # CRUD 데모 스크립트 실행
```
