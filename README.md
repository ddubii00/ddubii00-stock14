# stock14 주도주

네이버 테마·업종·거래대금과 주달 테마 데이터를 활용하는 한국 주식 주도주 대시보드입니다.

## 기능

- 주도섹터: 거래대금 50점, 평균 상승률 30점, 상승 종목 비율 20점으로 선정한 상위 6개 섹터
- 코스피·코스닥 거래대금 상위 각 100종목을 결합한 조건 검색
- 테마·업종 구성종목 상세, 네이버 종목 차트·뉴스 연결
- 네이버 업종·테마 메뉴: 업종·테마·그룹사 전체 순위, 일간·주간·월간 전환, 기간별 상승률 TOP 기업과 구성 기업 표
- 네이버 메뉴는 1분 자동 갱신, 기존 거래대금 패널과 필터 공유
- 상승률·거래대금·시장 필터를 로그인 계정별 D1에 저장해 다른 컴퓨터에서도 복원
- 주달 테마 평균 등락률 교차 확인
- 최근 4주 캘린더: 실제 수집 날짜의 섹터 및 대금상위 상세
- 반응형 화면, 다크모드, 키보드 상세창 탐색

## 데이터

페이지를 열면 새 데이터를 수집하고 기본 2분마다 갱신을 시도합니다. ‘30초 업데이트’를 켜면 30초마다 갱신하며 이 토글은 브라우저에 저장합니다. 시장 수집 결과의 서버 캐시는 30초입니다. 원본 제공 시세에는 정규장과 시간외 거래가 포함될 수 있습니다. 주도섹터 메뉴는 수집된 상승률 상위 100개 테마와 최대 100개 업종을 대상으로 합니다. 같은 종목이 여러 테마에 포함되면 섹터별 대금 합계가 중복되므로 점수는 절대적인 자금 유입액을 의미하지 않습니다.

네이버 메뉴는 네이버 공식 화면이 사용하는 `/api/stockSecurity/rankings/v2/domestic/{industries|themes|groups}`의 `period=daily|weekly|monthly` 응답을 사용합니다. 커서 페이지를 끝까지 수집하며 네이버 원본 순위를 그대로 표시합니다. 기간별 상승률 TOP 기업도 같은 응답에서 가져옵니다. 구성 기업 표는 `/api/domestic/market/{upjong|theme|group}/{id}/stocklist`의 최신 일간 시세입니다. 네이버처럼 주간·월간을 선택해도 이 표의 현재가·거래대금은 최신 일간 값이며 화면에 기준을 표시합니다. 새 메뉴의 순위 및 선택한 분류의 구성 기업은 열려 있는 동안 1분마다 갱신합니다. 캐시는 최대 55초이며 중복 수집을 합칩니다. 연결 실패 시 마지막 자료의 수집 시각과 오류를 표시합니다.

필터는 Sites에서 인증한 사용자 ID를 기준으로 `ranking_preferences` 테이블에 저장합니다. 새 화면을 열거나 창으로 돌아오면 서버에서 복원하며, 최초 복원 전에는 기본값으로 덮어쓰지 않습니다. 계정 간 저장값은 분리됩니다. 로컬 개발은 starter의 모의 인증을 사용합니다.

수집 기록은 Cloudflare D1의 날짜별 스냅샷에 저장합니다. 수집 이전 날짜의 과거 기록은 생성하지 않습니다. 앱이 닫혀 있을 때 자동 수집하지 않습니다. 연결 실패 시 기준 시각이 표시된 마지막 자료로 대체합니다. 원본의 공개 데이터 경로 변경 시 수집기를 수정해야 합니다. 실제 수집한 첫 자료는 `lib/data/raw.json`에 있습니다.

## 개발

Node.js 22.13 이상에서 `npm ci`, `npm run dev`로 실행합니다. `npm run build`로 Workers 실행 파일을 생성합니다. Cloudflare D1의 논리 바인딩은 `DB`이며 마이그레이션은 `drizzle/`에 있습니다. `0000`은 수집 기록, `0001`은 계정별 필터 설정입니다. 적용한 마이그레이션을 다시 실행하지 않습니다. 프로젝트 식별자는 `.openai/hosting.json`에 있습니다.

로컬 날짜 기록 확인은 빌드 후 다음 명령을 실행합니다.

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flat_matthew_murdock.sql
```

## 원본

- https://stock.naver.com/market/stock/kr/theme/1
- https://stock.naver.com/market/stock/kr/industry/1
- https://stock.naver.com/market/stock/kr/stocklist/priceTop
- https://www.judal.co.kr/?view=themeList
