// 나리 영수증Bot - 데이터 사전

// 로마자 → 한국이름 매핑
const NAME_MAP = {
    'LEE WONCHUL': '이원철',
    'AN SOHEE': '안소희',
    'AHN SOHEE': '안소희',
    'LEE MINYOUNG': '이민영',
    'HWANG JUNGYEON': '황정연',
    'CHA SANGEON': '차상건',
    'CHA SANGGEON': '차상건',
    'LEE MINZI': '이민지',
    'LEE MINJI': '이민지',
    'JEONG DABIN': '정다빈',
    'JUNG DABIN': '정다빈',
    'KO TAEWON': '고태원',
    'SON TAECHANG': '손태창',
    'SON TAE CAHNG': '손태창',
    'SON TAECAHNG': '손태창',
    'KIM YEONMI': '김연미',
    'JEON SEONGCHEOL': '전성철',
    'JEON SEONGC HEOL': '전성철',
    'MYUN GHOON': '명훈',
    'MYUNG HOON': '명훈',
    'JEONG JINSEUNG': '정진성',
    'JUNG JINSUNG': '정진성',
    'JOO SOOJIN': '주수진',
    'JU SUJIN': '주수진',
    'YUN LUHA': '윤루하',
    'YOON RUHA': '윤루하',
    'KIM SOOKYOUNG': '김수경',
    'KIM SUGYEONG': '김수경',
    'PARK GUNYOUNG': '박건영',
    'PARK GEONYOUNG': '박건영',
    'CHOL JAYUN': '철자윤',
    'CHEOL JAYOON': '철자윤',
    'NAM EUNYOUNG': '남은영',
    'KIM JIWON': '김지원',
    'HAN SANGGEUN': '한상근',
    'KIM MOONJUNG': '김문정',
    'SON SUNHYE': '손선혜',
    'KIM SUJIN': '김수진',
    'YOO SOONBONG': '유순봉',
    'KIM JINYOUNG': '김진영',
    'LEE BEOMJAE': '이범재',
    'JEON INSUNG': '전인성',
    'SEO EUNYOUNG': '서은영',
    'PARK SOYOUNG': '박소영',
    'GIL MINJI': '길민지',
    'DH E&T': 'DH E&T',
};

// 택시 종류 번역
const TAXI_TYPE_MAP = {
    'ジャンボタクシー': '점보 택시',
    'ジャンポタクシー': '점보 택시', // 오타 대응
    '普通タクシー': '일반 택시',
};

// 서비스 상세 번역 (우선순위 순서)
const SERVICE_DETAIL_MAP = [
    { ja: 'ゴルフ送迎', ko: '골프 송영' },
    { ja: '送迎', ko: '송영' },
    { ja: '高速料金', ko: '고속도로 요금' },
];

// 令和 → 서력 변환 오프셋
const REIWA_OFFSET = 2018;

// Excel 날짜 기준점 (1899-12-30)
const EXCEL_EPOCH = new Date(1899, 11, 30);

// 레벤슈타인 거리 계산
function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// 이름 찾기 (정확 매칭 → 퍼지 매칭)
function findKoreanName(romanizedName) {
    let clean = romanizedName.replace(/様$/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

    // 내장 사전 정확 매칭
    if (NAME_MAP[clean]) return { name: NAME_MAP[clean], confidence: 'exact' };

    // 사용자 사전 (localStorage)
    const userMap = JSON.parse(localStorage.getItem('user_name_map') || '{}');
    if (userMap[clean]) return { name: userMap[clean], confidence: 'user' };

    // 퍼지 매칭 (거리 ≤ 2)
    const allMaps = { ...NAME_MAP, ...userMap };
    let bestMatch = null;
    let bestDist = Infinity;
    for (const [key, value] of Object.entries(allMaps)) {
        const dist = levenshtein(clean, key);
        if (dist <= 2 && dist < bestDist) {
            bestDist = dist;
            bestMatch = { name: value, confidence: 'fuzzy', matchedKey: key };
        }
    }
    if (bestMatch) return bestMatch;

    return { name: null, confidence: 'unknown' };
}

// 서비스 설명 번역 (일본어 → 한국어)
function translateService(japaneseService) {
    // 고속도로 요금 특수 처리
    if (japaneseService.includes('高速料金')) {
        const countMatch = japaneseService.match(/(\d+)\s*[回件]/);
        if (countMatch) return '고속도로 요금 ' + countMatch[1] + '회';
        return '고속도로 요금';
    }

    let taxiType = '';
    for (const [ja, ko] of Object.entries(TAXI_TYPE_MAP)) {
        if (japaneseService.includes(ja)) {
            taxiType = ko;
            break;
        }
    }

    // 시간 대절
    const hourMatch = japaneseService.match(/(\d+)\s*時間\s*貸切/);
    if (hourMatch) return (taxiType ? taxiType + ' ' : '') + hourMatch[1] + '시간 대절';

    // 골프 송영 (송영보다 먼저 체크)
    if (japaneseService.includes('ゴルフ送迎')) return (taxiType ? taxiType + ' ' : '') + '골프 송영';

    // 송영
    if (japaneseService.includes('送迎')) return (taxiType ? taxiType + ' ' : '') + '송영';

    return taxiType || japaneseService;
}

// 令和 날짜 → Excel 시리얼 넘버
function reiwaToExcelSerial(reiwaYear, month, day) {
    const gregorianYear = REIWA_OFFSET + reiwaYear;
    const date = new Date(gregorianYear, month - 1, day);
    return Math.floor((date - EXCEL_EPOCH) / 86400000);
}

// 令和 날짜 → Date 객체
function reiwaToDate(reiwaYear, month, day) {
    return new Date(REIWA_OFFSET + reiwaYear, month - 1, day);
}

// Gemini OCR 프롬프트
const OCR_PROMPT = `당신은 일본 택시 청구서(御請求書) OCR 전문가입니다.
이 이미지는 三井交通(미쯔이택시)의 청구서입니다.

테이블의 모든 행을 추출해주세요. 각 행에서:
- month: 월 (정수)
- day: 일 (정수)
- service_description: 品名/利用区間 (일본어 원문 그대로)
- customer_name: 고객명 (로마자, 様 제외)
- vehicle_count: 台数 (정수, 없으면 1)
- amount: 金額 (엔, 정수)

또한 추출:
- reiwa_year: 令和 연도 숫자 (예: 令和8年이면 8)
- total: 합계 금액

JSON 형식으로 반환:
{
  "reiwa_year": 8,
  "rows": [
    {
      "month": 1,
      "day": 1,
      "service_description": "ジャンボタクシー（8時間貸切）",
      "customer_name": "LEE WONCHUL",
      "vehicle_count": 1,
      "amount": 39000
    }
  ],
  "total": 968520
}

주의사항:
- 高速料金(고속도로 요금) 행도 반드시 포함
- 고객명에서 様는 제거
- 금액에 콤마 없이 숫자만
- 台数가 비어있으면 1로 설정
- 한 고객이 여러 행에 나올 수 있음 (각각 별도 행으로)`;
