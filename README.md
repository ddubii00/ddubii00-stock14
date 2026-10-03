# stock14 주도주

네이버 테마·업종·거래대금과 주달 테마 데이터를 활용하는 한국 주식 주도주 대시보드입니다.

## 기능

- 주도섹터: 거래대금 50점, 평균 상승률 30점, 상승 종목 비율 20점으로 선정한 상위 6개 섹터
- 코스피·코스닥 거래대금 상위 각 100종목을 결합한 조건 검색
- 테마·업종 구성종목 상세, 네이버 종목 차트·뉴스 연결
- 주달 테마 평균 등락률 교차 확인
- 최근 4주 캘린더: 실제 수집 날짜의 섹터 및 대금상위 상세
- 반응형 화면, 다크모드, 키보드 상세창 탐색

## 데이터

페이지를 열면 새 데이터를 수집하고 2분마다 갱신을 시도합니다. 서버는 1분 동안 수집 결과를 캐시합니다. 원본 제공 시세에는 정규장과 시간외 거래가 포함될 수 있습니다. 테마는 수집된 상승률 상위 100개, 업종은 최대 100개를 대상으로 합니다. 같은 종목이 여러 테마에 포함되면 섹터별 대금 합계가 중복되므로 점수는 절대적인 자금 유입액을 의미하지 않습니다.

수집 기록은 Cloudflare D1의 날짜별 스냅샷에 저장합니다. 수집 이전 날짜의 과거 기록은 생성하지 않습니다. 앱이 닫혀 있을 때 자동 수집하지 않습니다. 연결 실패 시 기준 시각이 표시된 마지막 자료로 대체합니다. 원본의 공개 데이터 경로 변경 시 수집기를 수정해야 합니다. 실제 수집한 첫 자료는 `lib/data/raw.json`에 있습니다.

## 개발

Node.js 22.13 이상에서 `npm ci`, `npm run dev`로 실행합니다. `npm run build`로 Workers 실행 파일을 생성합니다. Cloudflare D1의 논리 바인딩은 `DB`이며 마이그레이션은 `drizzle/0000_flat_matthew_murdock.sql`입니다. 프로젝트 식별자는 `.openai/hosting.json`에 있습니다.

로컬 날짜 기록 확인은 빌드 후 다음 명령을 실행합니다.

```
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flat_matthew_murdock.sql
```

## 원본

- https://stock.naver.com/market/stock/kr/theme/1
- https://stock.naver.com/market/stock/kr/industry/1
- https://stock.naver.com/market/stock/kr/stocklist/priceTop
- https://www.judal.co.kr/?view=themeList
