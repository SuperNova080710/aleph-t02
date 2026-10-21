# 30초 게임 루프 및 PC 입력·일시정지 안정화

## 목표
T02-C03~C17, C22: 한 판의 시작·조작·성공·실패·재시작과 PC 경계 안정성을 구현합니다.

## 구현
- [x] 상태와 UI 분리, 30초 생존 성공 / 충돌 실패
- [x] 핵심 입력 1건당 24px 이동 처리 1회 (경계에서는 좌표 제한)
- [x] 포커스/탭 이탈 자동 일시정지, 명시적인 수동 재개
- [x] 재시작 시 시간·점수·버그·입력 수 초기화
- [x] 1366×768, 1920×1080 및 모바일 레이아웃 검사
- [x] 성공·실패·재시작·10회 연속 입력 브라우저 테스트
- [ ] 10분 연속 실행 결과: docs/evidence/soak.json 확인

## 근거
src/engine.js, src/app.js, tests/engine.test.mjs, tests/browser.mjs, tests/soak.mjs

## 원격 이슈 생성 상태
GitHub Issues 쓰기 요청이 `403 Resource not accessible by integration`으로 거절되어 본문을 보관합니다. 원격 생성 전에는 이슈 번호가 없습니다.
