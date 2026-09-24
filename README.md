# Stockscope frontend

국내 주식 분석 웹서비스의 React 프론트엔드 초기 화면입니다. 현재 표시되는 종목, 상태, 차트 모양은 UI 확인용 목업이며 실제 시세, 투자 추천, 분석 결과가 아닙니다.

## 요구 환경

- Node.js 20.19 이상 또는 22.12 이상
- npm 10 이상

## 실행

```bash
npm install
copy .env.example .env
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다. `VITE_API_BASE_URL`을 지정하지 않으면 `/api`를 사용하고, 개발 서버는 `/api` 요청을 `http://localhost:8080`으로 전달합니다.

실제 백엔드 연결 전에는 `VITE_USE_MOCKS=true`를 유지하세요. 실제 API를 확인할 때는 `VITE_USE_MOCKS=false`로 변경합니다.

## 구현된 종목 조회

- `public/stocks/stock_master.txt`의 전체 종목을 이름 또는 코드로 검색
- KOSPI/KOSDAQ 구분과 종목 종류 표시
- 선택한 종목을 브라우저에 최근 검색으로 최대 8개 저장
- 검색 결과 또는 최근 검색 선택 시 `/analysis/{stockCode}`로 이동
- 상세 페이지에서도 같은 종목 검색 사용
- DAY/WEEK 선택 시 가격 데이터 재조회
- 최신 여부, 기준일, 마지막 수집 시각 표시
- 수집 실패와 데이터 부족 상태를 각각 표시

실제 가격 API 계약은 다음과 같습니다.

```text
GET /api/v1/stocks/{stockCode}/prices?period=DAY
GET /api/v1/stocks/{stockCode}/prices?period=WEEK
```

`VITE_USE_MOCKS=true`에서는 차트 동작 확인을 위한 상대값 샘플이 표시됩니다. 실제 시세가 아닙니다.

## 백테스트 백데이터 검증

다른 화면의 Mock 설정과 무관하게 `/backtest` 페이지는 다음 WAS API를 직접 호출합니다.

```text
GET  /api/v1/backdata/trs
POST /api/v1/backdata/validation-runs/kiwoom
POST /api/v1/backdata/validation-runs/kiwoom/batch
```

- `ka10081` 일봉 데이터 단일 검증
- `ka10081`, `ka10086`, `ka10059` 핵심 3종 교차검증
- QUICK, BACKTEST_READY, AUDIT 검증 프로필 지원
- 유효·격리 레코드와 검증 이슈, 연속조회 상태 표시

## 엔진 연결 스크리너

`/screener`는 `VITE_USE_MOCKS`와 무관하게 실제 WAS API를 사용합니다. 서버 오류를 샘플 데이터로 대체하지 않습니다.

- 진입: 스윙은 새벽 배치를 볼 수 있도록 최신 완료 결과를 우선 조회합니다. 기존 진행 중인 실행은 상태 확인을 유지합니다. 단타는 마지막 실행 복원 동작을 유지합니다. 화면 진입 자체는 키움 수집을 시작하지 않습니다.
- **엔진 실행 → 시장·선택 종목 코드 입력 → 분석 시작**: `POST /api/v1/screener/runs`.
- 종목 코드를 비워 두면 선택 시장 전체를 분석합니다. 첫 검증은 `005930` 등 소수 종목을 권장합니다.
- READY/RUNNING은 2.5초 간격으로 `GET /api/v1/screener/runs/{id}` 조회. 완료 후 현재 페이지 한 번만 조회합니다.
- **결과 조회**는 현재 실행, **최신 완료 결과**는 해당 모드·주기의 최신 완료 실행을 선택합니다.
- **실패·중단 재개**는 `POST /api/v1/screener/runs/{id}/resume`. 실제 활성 실행이면 서버가 409로 거절하며, 서버 재시작 뒤 남은 READY/RUNNING도 명시적으로 재개할 수 있습니다.
- 요청 응답이 불확실한 경우 동일 조건의 재시도는 보관한 `Idempotency-Key`를 재사용합니다. 실행 ID와 미확인 요청 키는 브라우저에 모드·봉 주기별로 저장됩니다. 브라우저 저장소 사용 불가 시 해당 세션에만 유지됩니다.
- `POST /api/v1/screener/search`는 읽기 전용입니다. 첫 20개만 표시하며 필터·정렬·페이지 변경은 DB 조회로 처리합니다. 페이지 이동은 같은 runId로 고정합니다. Stage 카드 건수는 현재 Stage만 제외한 필터 집계, 상단 최근 전환/나의 관찰은 실행 전체 집계입니다. 검색은 300ms debounce와 이전 요청 취소를 적용합니다.
- 목록 content는 경량 summary입니다. 종목 상세 클릭 시 `GET /api/v1/screener/runs/{id}/stocks/{code}`로 EMA·이력을 읽으며 실패하면 상세만 재시도합니다.
- 거래대금은 서버의 백만원을 억원으로 변환하며, 미제공/null은 0이 아닙니다. Stage와 전환은 서버 판정을 그대로 사용하고 EMA는 표시할 때만 반올림합니다.
- 실패·제외·경계·표본 부족·조회 범위 부족, 유지기간 하한값(`+`), 52주 부분 이력은 별도로 표시합니다.
- 관찰종목 별표는 여전히 이 브라우저에 모드별로 저장되며 서버 관심종목 API와 별개입니다.

WAS의 `database/oracle/ddl/09_screener_summary_README.md`에 따라 목록 테이블 DDL과 기존 결과 backfill을 적용한 후 화면과 백엔드를 함께 배포해야 합니다. 기존 08 테이블은 다시 생성하지 않습니다. 최신 WAS는 DB 저장소만 사용하며 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`는 기존 연결 설정을 유지합니다.
실계정 수집은 자동 검증에서 호출하지 않습니다. 테스트에서는 실제 응답 구조의 고정 fixture로 등록·조회·실패·재개·서버 페이지 조회·상세 지연 조회를 검증합니다.

## 종합분석

메뉴 **종합분석** (`/unified-analysis`)은 새 통합 엔진으로 시장 전체를 분석합니다.
시장 선택·실행 진행률·실행 이력·실패 재개·중단 정리와 스테이지·점수·신호·손익비 조건 검색을 지원합니다.
상세는 선택 실행의 저장 결과를 조회하며 자동 재분석하지 않습니다. `/unified-analysis/stock`에서는 한 종목을 즉시 분석할 수 있습니다.
종합분석 상세와 개별 결과에는 실제 가격 차트(분·일·주·월봉, 거래량, 보조지표)가 표시됩니다. 차트는 조회 시점 데이터이고 진입·목표·손절선은 해당 분석의 가격일 기준입니다. 저장된 평가 종가를 최신 현재가로 표시하지 않습니다.
Mock 설정과 무관하게 `/api/v1/unified-analysis/runs`를 호출합니다.
사용 전 WAS의 `database/oracle/ddl/11_unified_analysis.sql` 적용과 새 백엔드 반영이 필요합니다.

## 검증 명령

```bash
npm run test
npm run lint
npm run build
```
