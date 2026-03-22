# [PROJECT: CHAIN-BREAK] — 게임 디자인 문서 (GDD)

> 이 문서는 개발자가 코딩할 때 참조해야 할 **'기술적 진실'**입니다. 모든 수치는 기본값이며 플레이테스트를 통해 조정됩니다.

**컨셉:** 액션 로그라이크 퍼즐 (Action Roguelike Puzzle)
**타겟 플랫폼:** 데스크톱 웹 브라우저 (마우스 클릭 기반)
**핵심 가치:** 콤보 폭발의 시각적 쾌감 + 선택에 따른 빌드 다변화(Trade-off) + 매판 성장의 체감

---

## 0. 게임 상태 머신 (Game State Machine)

```
[MENU] → [DUNGEON_ENTRY] → [COMBAT] ⇄ [AUGMENT_SELECT] → [RESULT] → [META_UPGRADE] → [MENU]
```

| 상태           | 설명                             | 전환 조건                                                  |
| -------------- | -------------------------------- | ---------------------------------------------------------- |
| MENU           | 메인 화면, 영구 스탯 확인        | Start 버튼 클릭                                            |
| DUNGEON_ENTRY  | 난이도/속성 비율 표시 (1초 연출) | 자동 전환                                                  |
| COMBAT         | 타일 폭발 + 하강 루프            | 에너지 50 누적 시 AUGMENT_SELECT / 게이지 0 도달 시 RESULT |
| AUGMENT_SELECT | 증강 3택 UI (일시정지)           | 선택 완료                                                  |
| RESULT         | 점수/재화 정산 화면              | Continue 클릭                                              |
| META_UPGRADE   | 영구 스탯 업그레이드 화면        | 완료 후 MENU                                               |

---

## 1. 게임 루프 (Core Game Loop)

**진입 (Entry):** 던전(Level) 진입 시 난이도 팩터(= 현재 층수 × 0.15)와 속성(색상) 비율 결정.

**전투 (Combat Phase):** 타일을 클릭하여 같은 색상의 인접 타일을 연쇄 폭발시켜 에너지를 수집. 상단에서 타일이 지속적으로 하강하며 압박(생존 요소).

- 타일 하강 간격: 기본 `2000ms`, 난이도 팩터에 따라 `2000 / (1 + difficultyFactor)` ms
- 한 번에 하강하는 행 수: 1행
- 에너지 획득 공식: `destroyedTileCount × tilePower × (1 + comboCount × 0.1)`

**성장 (Augment Phase):** 에너지 **50 누적**마다 증강 선택 트리거. 3개의 랜덤 증강 중 1개 선택. [이점/페널티] 구조로 전략적 고민 강요.

**종료 (End):** 생존 게이지(HP)가 0이 되면 던전 종료. 타일이 최하단 행을 넘어 화면 아래로 넘치면 게이지가 초당 5씩 감소. 수집한 재화(= 총 획득 에너지 × 0.1, 소수점 버림)로 영구 스탯 업그레이드.

- 생존 게이지(HP): 기본 `100`
- 게이지 자연 회복: 없음

---

## 2. 데이터 구조 (Production Schema)

```typescript
// 유저의 영구적 성장치 (던전 밖 스탯) — localStorage에 JSON 저장
interface PlayerProfile {
  id: string;
  currency: number; // 영구 재화 (에너지 환산)
  persistentStats: {
    attackPower: number; // 기본 대미지 계수 (기본값: 1.0, 업그레이드 단위: +0.1)
    comboBonus: number; // 콤보 시 획득 에너지 배율 (기본값: 0.1, 업그레이드 단위: +0.05)
    luck: number; // 희귀 증강 출현 확률 보정 (기본값: 0, 업그레이드 단위: +0.02)
    maxHP: number; // 생존 게이지 상한 (기본값: 100, 업그레이드 단위: +10)
  };
}

// 던전 내 타일 객체
interface Tile {
  id: string;
  type: "basic" | "power" | "volatile";
  // basic: 기본 타일 (power=1)
  // power: 폭발 시 십자 1칸 추가 폭발 (power=2), 출현 확률 10%
  // volatile: 폭발 시 에너지 3배, 단 놓치면(하단 도달) HP -10 (power=1), 출현 확률 5%
  color: "R" | "G" | "B" | "Y";
  power: number;
}

// 증강체 인터페이스 (Trade-off 구조)
interface Augment {
  id: string;
  name: string;
  description: string; // UI에 표시할 한줄 설명
  rarity: "common" | "rare" | "legendary";
  // 출현 확률 — common: 70%, rare: 25%, legendary: 5% (luck 보정 전)
  benefit: { stat: string; value: number };
  penalty: { stat: string; value: number };
}

// 던전 런타임 상태
interface DungeonState {
  floor: number; // 현재 층수 (1부터 시작, 상한 없음)
  hp: number; // 생존 게이지
  energy: number; // 현재 에너지 (증강 트리거 판정용)
  totalEnergy: number; // 누적 에너지 (재화 환산용)
  comboCount: number; // 현재 연쇄 콤보 수
  augments: Augment[]; // 이번 런에서 획득한 증강 목록
  grid: (Tile | null)[][]; // 20×10 격자
  dropInterval: number; // 현재 타일 하강 간격 (ms)
}
```

**저장소:** `PlayerProfile`은 `localStorage`에 `chain-break-profile` 키로 JSON 직렬화하여 저장. 던전 중 상태는 저장하지 않음(로그라이크 원칙: 죽으면 끝).

---

## 3. 게임 밸런싱: [리스크/보상 행렬]

증강체는 단순히 강해지는 것이 아니라 **'플레이 패턴의 변화'**를 만들어야 합니다.

**Trade-off 로직:** 모든 선택지는 **'하나를 얻으면 하나를 포기'**하게 설계합니다.

| 증강 이름 | 이점                   | 페널티                      | 등급      |
| --------- | ---------------------- | --------------------------- | --------- |
| 과부하    | 폭발 범위 +1칸 (십자)  | 최대 HP -20                 | common    |
| 가속기    | 에너지 획득량 ×1.5     | 타일 하강 속도 ×1.3         | common    |
| 도박꾼    | 콤보 보너스 ×2         | 3콤보 미만 시 에너지 획득 0 | rare      |
| 순수주의  | 단색 폭발 시 에너지 ×3 | 색상 종류 1개 추가 (5색)    | rare      |
| 폭주      | 모든 타일 power +2     | HP가 초당 1씩 감소          | legendary |

> 위 5종은 Phase 1 테스트용. 플레이테스트 후 5종 추가하여 총 10종 완성.

**밸런싱 원칙 (v1 단순 규칙):**

- 증강 3개 제시 시, 등급 구성은 확률 테이블에 따라 독립 추첨
- ~~데이터 보정 알고리즘~~ → v1에서는 구현하지 않음. 유저 테스트 데이터 수집 후 v2에서 검토

---

## 4. 난이도 스케일링

| 파라미터           | 공식                               | 예시 (층수 10)  |
| ------------------ | ---------------------------------- | --------------- |
| 하강 간격          | `2000 / (1 + floor × 0.15)` ms     | 800ms           |
| 색상 비율          | 균등 분배 (각 25%)                 | R25 G25 B25 Y25 |
| power 타일 출현    | `0.10 + floor × 0.005` (상한 0.25) | 15%             |
| volatile 타일 출현 | `0.05 + floor × 0.003` (상한 0.15) | 8%              |

---

## 5. 시각적 연출 및 타격감 (Juiciness)

프로덕션 레벨에서는 수치가 비주얼로 치환되어야 합니다.

**Impulse(충격량):** 타일 폭발 대미지가 높을수록 화면의 shakeIntensity를 `Math.log(totalDamage + 1) × 2` (px)로 설정. 지속 시간 `150ms`, ease-out.

**Combo Flow:** 콤보 숫자가 올라갈수록 효과음의 pitch를 `1.0 + comboCount × 0.05` (상한 2.0)로 높여 아드레날린 분출 유도.

**Particle System:** 타일이 사라질 때 해당 색상의 파티클 `8~12개`가 폭발 지점으로부터 반지름 `30~60px` 범위로 튕겨 나감. 수명 `300ms`, 알파 fade-out.

---

## 6. 로드맵 (Technical Implementation)

### Phase 1: 코어 메커닉 (`number[][]` → `Tile[][]`) — 재미 검증

- [ ] `types.ts` 생성 — 위 인터페이스 정의
- [ ] `grid.ts` — `createGrid()`, `applyGravity()`, `spawnRow()` 구현
- [ ] `solver.ts` — 색상 기반 연쇄 폭발(`triggerExplosion`)으로 리팩터링
- [ ] 콤보 카운터 + 에너지 계산 로직
- [ ] 기본 하강 루프 (setInterval 기반)

> **🎯 검증 질문: "타일을 클릭해서 연쇄 폭발시키는 것이 재미있는가?"**
> 이 시점에서 5명에게 플레이시키고 반응 확인. 재미없으면 폭발 메커닉 자체를 재설계.

### Phase 2: 생존 루프 + 증강 시스템

- [ ] 생존 게이지(HP) UI 및 로직
- [ ] 타일 오버플로우 → HP 감소 로직
- [ ] 게임 상태 머신 구현 (zustand store)
- [ ] 증강 선택 UI (3택 모달)
- [ ] 증강 5종 데이터 적용

> **🎯 검증 질문: "증강을 고르는 순간이 고민되는가? 한 판 더 하고 싶은가?"**
> NO → 증강 설계 재검토. YES → Phase 3 진행.

### Phase 3: 연출 + 영구 성장

- [ ] requestAnimationFrame 렌더링 루프 전환
- [ ] 화면 흔들림(camera shake) 효과
- [ ] 파티클 시스템
- [ ] 콤보 숫자 팝업 애니메이션
- [ ] PlayerProfile 저장/불러오기 (localStorage)
- [ ] META_UPGRADE 화면

> **🎯 검증 질문: "폭발이 시각적으로 기분 좋은가? 성장이 체감되는가?"**

### Phase 4: 폴리싱 + 밸런싱

- [ ] 증강 5종 추가 (총 10종)
- [ ] 사운드 효과 (Web Audio API — 폭발음, 콤보 pitch 스케일링)
- [ ] 난이도 커브 튜닝 (층수별 플레이 데이터 기반)
- [ ] 성능 프로파일링 (60fps 유지 확인, 20×10 격자 기준)

> **🎯 검증 질문: "10분 이상 플레이하고 싶은가?"**
