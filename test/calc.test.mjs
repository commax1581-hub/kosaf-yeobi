/**
 * KOSAF 여비 계산 로직 단위 테스트
 * ─────────────────────────────────────────────
 * 실행: node test/calc.test.mjs
 *
 * 목적: 교통비(연료비·통행료·주차료·운임)의 법인카드/개인지급 분리 산출이
 *       규정대로 정확한지 자동 검증. 코드 수정 후 회귀(regression) 방지용.
 *
 * ⚠️ 이 파일의 함수는 RouteB5.jsx / RouteC.jsx의 로직을 복제한 것입니다.
 *    앱 코드를 수정하면 이 파일도 함께 갱신해야 합니다.
 */

/* ── 연비표 (RouteB2/B5와 동일 기준, 여비규칙 별표) ── */
const FUEL_TYPES = [
  { key: "gasoline", label: "휘발유",      rate: 11.97 },
  { key: "diesel",   label: "경유",        rate: 12.52 },
  { key: "lpg",      label: "LPG",         rate: 8.83  },
  { key: "hybrid",   label: "하이브리드",  rate: 15.37 },
  { key: "plugin",   label: "플러그인",    rate: 10.61 },
  { key: "ev",       label: "전기",        rate: 2.84  },
  { key: "hydrogen", label: "수소",        rate: 94.9  },
];
const calcFuel = t => {
  const ft = FUEL_TYPES.find(f => f.key === t.fuelType);
  if (!ft || !t.distance || !t.fuelPrice) return 0;
  return Math.round(parseFloat(t.distance) * parseFloat(t.fuelPrice) / ft.rate);
};

/* ── B5 segTransport (RouteB5.jsx 복제) ── */
const segTransport = t => {
  const I = n => parseInt(n) || 0;
  let corp = 0, personal = 0;
  if (t.type === "gov") {
    if (t.hasParking && t.parking) (t.parkingCard === "corp" ? corp += I(t.parking) : personal += I(t.parking));
  } else if (t.type === "car") {
    if (t.carMode === "public") {
      personal += I(t.pubFare);
    } else {
      personal += calcFuel(t);
      if (t.hasToll && t.toll)       (t.tollCard === "corp"    ? corp += I(t.toll)    : personal += I(t.toll));
      if (t.hasParking && t.parking) (t.parkingCard === "corp" ? corp += I(t.parking) : personal += I(t.parking));
    }
  } else {
    if (t.cardType === "corp") corp += I(t.fare);
    else if (t.cardType !== "gov") personal += I(t.fare);
  }
  return { corp, personal };
};

/* ── 일비·식비 계산 (RouteB5 calcAmounts 복제) ── */
const MEAL_UNIT = 8333;
const calcDay = d => (d.dayDeduct ? 12500 : 25000);
const calcMeal = d => Math.max(0, 25000 - [d.b, d.l, d.d].filter(Boolean).length * MEAL_UNIT);

/* ───────────────────────── 테스트 러너 ───────────────────────── */
let pass = 0, fail = 0;
const failures = [];
function eq(name, got, want) {
  if (got === want) { pass++; }
  else { fail++; failures.push(`❌ ${name}\n     기대값: ${want}  실제값: ${got}`); }
}

/* ── 1. 연료비 계산 ── */
eq("연료비 휘발유 124km×1704원÷11.97", calcFuel({fuelType:"gasoline",distance:"124",fuelPrice:"1704"}), 17652);
eq("연료비 경유 300km×1600원÷12.52",   calcFuel({fuelType:"diesel",distance:"300",fuelPrice:"1600"}), 38339);
eq("연료비 전기 100km×300원÷2.84",      calcFuel({fuelType:"ev",distance:"100",fuelPrice:"300"}), 10563);
eq("연료비 입력 누락 시 0",             calcFuel({fuelType:"gasoline",distance:"",fuelPrice:"1700"}), 0);

/* ── 2. 자가용 연료비 + 통행료 + 주차료 (전부 개인) ── */
{
  const r = segTransport({type:"car",carMode:"fuel",fuelType:"gasoline",distance:"100",fuelPrice:"1700",
    hasToll:true,toll:"5000",tollCard:"personal",hasParking:true,parking:"3000",parkingCard:"personal"});
  const fuel = calcFuel({fuelType:"gasoline",distance:"100",fuelPrice:"1700"});
  eq("자가용(개인) 법인카드분", r.corp, 0);
  eq("자가용(개인) 개인지급분", r.personal, fuel + 5000 + 3000);
}

/* ── 3. 통행료 법인카드 / 주차료 개인 (혼합) ── */
{
  const r = segTransport({type:"car",carMode:"fuel",fuelType:"gasoline",distance:"100",fuelPrice:"1700",
    hasToll:true,toll:"5000",tollCard:"corp",hasParking:true,parking:"3000",parkingCard:"personal"});
  const fuel = calcFuel({fuelType:"gasoline",distance:"100",fuelPrice:"1700"});
  eq("혼합 법인카드분(통행료)", r.corp, 5000);
  eq("혼합 개인지급분(연료비+주차료)", r.personal, fuel + 3000);
}

/* ── 4. 대중교통준용 (통행료·주차료 미지급) ── */
{
  const r = segTransport({type:"car",carMode:"public",pubFare:"30000",
    hasToll:true,toll:"5000",hasParking:true,parking:"3000"});
  eq("대중교통준용 개인지급", r.personal, 30000);
  eq("대중교통준용 법인카드", r.corp, 0);
}

/* ── 5. 일반 교통수단 (KTX) ── */
eq("KTX 개인카드", segTransport({type:"ktx",fare:"25000",cardType:"personal"}).personal, 25000);
eq("KTX 법인카드 → 개인0", segTransport({type:"ktx",fare:"25000",cardType:"corp"}).personal, 0);
eq("KTX 법인카드 → 법인25000", segTransport({type:"ktx",fare:"25000",cardType:"corp"}).corp, 25000);

/* ── 6. 관용차 (운임 미지급, 주차료만) ── */
{
  const r = segTransport({type:"gov",hasParking:true,parking:"4000",parkingCard:"personal"});
  eq("관용차 운임 미지급(개인=주차료만)", r.personal, 4000);
  eq("관용차 법인카드분", r.corp, 0);
}

/* ── 7. 일비 ── */
eq("일비 일반 25000", calcDay({dayDeduct:false}), 25000);
eq("일비 관용차감액 12500", calcDay({dayDeduct:true}), 12500);

/* ── 8. 식비 (식사 제공 차감) ── */
eq("식비 제공없음 25000",    calcMeal({b:false,l:false,d:false}), 25000);
eq("식비 1식제공 차감",      calcMeal({b:true,l:false,d:false}), 25000 - 8333);
eq("식비 3식제공 → 0 이상",  calcMeal({b:true,l:true,d:true}), Math.max(0, 25000 - 3*8333));

/* ───────────────────────── 결과 출력 ───────────────────────── */
console.log("─".repeat(50));
console.log(`KOSAF 여비 계산 로직 테스트 결과`);
console.log("─".repeat(50));
if (failures.length) { console.log(failures.join("\n")); console.log("─".repeat(50)); }
console.log(`✅ 통과: ${pass}개   ❌ 실패: ${fail}개`);
console.log("─".repeat(50));
process.exit(fail > 0 ? 1 : 0);
