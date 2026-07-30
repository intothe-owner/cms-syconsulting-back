import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Op } from 'sequelize'; // 데이터베이스 검색 연산자 임포트
import puppeteer from 'puppeteer';
import { SupportFund } from '../models/SupportFund';

const router = Router();

// ==========================================
// 1. 크롤링 API (POST /api/funds/scrape)
// ==========================================
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    const results: any = [];
    const maxPage = 10;
    const baseUrl = 'https://www.bizinfo.go.kr';

    console.log('크롤링을 시작합니다...');

    for (let page = 1; page <= maxPage; page++) {
      console.log(`${page}페이지 수집 중...`);
      const url = `${baseUrl}/sii/siia/selectSIIA200View.do?null=&rows=15&cpage=${page}`;

      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      $('div.table_Type_1 table tbody tr').each((_, element) => {
        const tds = $(element).find('td');
        if (tds.length < 5) return; // 빈 결과물 방어 로직

        const category = '기업마당';
        const titleAnchor = $(tds[2]).find('a');
        const title = titleAnchor.text().trim();
        const period = $(tds[3]).text().trim();
        const department = $(tds[4]).text().trim();

        let detailUrl = '';
        const hrefAttr = titleAnchor.attr('href') || '';

        if (hrefAttr) {
          detailUrl = hrefAttr.startsWith('http') ? hrefAttr : baseUrl + hrefAttr;
          detailUrl = detailUrl.replace(/&amp;/g, '&');
        }

        if (title) {
          results.push({ category, title, period, department, detailUrl });
        }
      });

      // 서버 부하를 막기 위해 0.5초 대기
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 💡 [수정됨] bulkCreate 대신 제목(title) 기준으로 Update or Insert 처리
    let newCount = 0;
    let updateCount = 0;

    for (const item of results) {
      // 1. DB에 동일한 제목의 공고가 있는지 찾습니다.
      const existingFund = await SupportFund.findOne({ where: { title: item.title } });

      if (existingFund) {
        // 2-A. 이미 있다면 최신 정보(기간, URL 등)로 업데이트합니다.
        await existingFund.update(item);
        updateCount++;
      } else {
        // 2-B. 없다면 새 공고로 DB에 추가합니다.
        await SupportFund.create(item);
        newCount++;
      }
    }

    console.log(`크롤링 및 DB 저장 완료! (신규: ${newCount}개, 갱신: ${updateCount}개)`);
    res.json({
      success: true,
      message: `데이터 갱신 완료 (신규 추가: ${newCount}개 / 기존 업데이트: ${updateCount}개)`,
    });
  } catch (error) {
    console.error('크롤링 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류 발생' });
  }
});
router.post('/scrape/sbiz24', async (req: Request, res: Response) => {
  try {
    const maxPage = 10;
    const baseUrl = 'https://www.sbiz24.kr';
    const results: any[] = [];

    console.log('소상공인24 크롤링을 시작합니다. (가상 브라우저 구동 중...)');

    // 헤드리스 브라우저 실행 (화면에 창이 보이지 않게 백그라운드에서 실행)
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // 👈 (핵심) 리눅스 공유 메모리 제한 해제
        '--disable-gpu'            // 👈 서버 환경에서는 GPU가 없으므로 비활성화
      ]
    });
    const page = await browser.newPage();

    for (let i = 1; i <= maxPage; i++) {
      console.log(`소상공인24 - ${i}페이지 수집 중...`);
      const targetUrl = `${baseUrl}/#/combinePbancList?page=${i}`;

      // 해당 페이지로 이동 후, 네트워크 요청이 거의 끝날 때까지 대기
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });

      // 페이지 내부의 DOM에 접근하여 데이터 추출
      const pageData = await page.evaluate((currentBaseUrl) => {
        const scraped: any[] = [];

        // 💡 임시 선택자: 실제 sbiz24.kr의 HTML 구조(class)에 맞춰 수정이 필요합니다.
        // table > tbody > tr 또는 ul > li 구조를 탐색합니다.
        const items = document.querySelectorAll('.pbanc-list-wrap li, table tbody tr');

        items.forEach((el) => {
          const titleEl = el.querySelector('a, .title, .tit');
          if (!titleEl) return;

          const title = titleEl.textContent?.trim() || '';

          let detailUrl = '';
          const aTag = el.querySelector('a');
          if (aTag) {
            detailUrl = aTag.href;
          }

          // 상태, 등록일, 주관기관 파싱 (클래스명은 실제 웹사이트 참고 필요)
          const category = '소상공인정책자금';
          const period = el.querySelector('.c_aplyPd')?.textContent?.trim() || '';
          const department = el.querySelector('.agency, .dept')?.textContent?.trim() || '소상공인시장진흥공단';

          scraped.push({ category, title, period, department, detailUrl });
        });

        return scraped;
      }, baseUrl);

      results.push(...pageData);

      // 서버 블락 방지를 위한 1초 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await browser.close();

    // 기존 데이터 밑에 추가 (Bulk Insert)
    if (results.length > 0) {
      await SupportFund.bulkCreate(results);
    }

    console.log(`소상공인24 크롤링 완료! ${results.length}개 저장.`);
    res.json({
      success: true,
      message: `소상공인24 공고 ${results.length}개 수집 및 기존 DB에 추가 완료`,
    });

  } catch (error) {
    console.error('소상공인24 크롤링 에러:', error);
    res.status(500).json({ success: false, message: '크롤링 중 오류 발생' });
  }
});
router.post('/scrape/k-startup', async (req: Request, res: Response) => {
  try {
    const results: any = [];
    const baseUrl = 'https://www.k-startup.go.kr';

    // K-Startup 진행중인 공고 1페이지 주소
    const targetUrl = `${baseUrl}/web/contents/bizpbanc-ongoing.do`;

    console.log('K-Startup 1페이지 크롤링을 시작합니다...');

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // 제공된 HTML 기준: id가 bizPbancList인 곳 내부의 li.notice 반복
    $('#bizPbancList ul li.notice').each((_, element) => {

      // 1. 공고 제목
      const title = $(element).find('.middle p.tit').text().trim();
      if (!title) return; // 제목이 없으면 건너뛰기

      // 2. 카테고리 (D-day를 나타내는 span.day가 아닌 첫 번째 flag 스팬)
      const category = 'K-Startup';

      // 3. 상세 URL 파싱
      let detailUrl = '';
      const hrefAttr = $(element).find('.middle a').attr('href') || '';
      const match = hrefAttr.match(/go_view\(([0-9]+)\)/);
      if (match && match[1]) {
        detailUrl = `${baseUrl}/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=${match[1]}`;
      }

      // 4. 부처 및 기관명, 신청기간 파싱
      const bottomLists = $(element).find('.bottom span.list');

      let department = '';
      let startDate = '';
      let endDate = '';
      let period = '';

      bottomLists.each((index, el) => {
        const text = $(el).text().trim();
        if (index === 1) department = text;
        if (text.startsWith('시작일자')) startDate = text.replace('시작일자', '').trim();
        if (text.startsWith('마감일자')) endDate = text.replace('마감일자', '').trim();
      });

      if (startDate || endDate) {
        period = `${startDate} ~ ${endDate}`;
      }

      results.push({ category, title, period, department, detailUrl });
    });

    let insertedCount = 0;

    // 💡 중복 방지 로직 추가
    if (results.length > 0) {
      // 1. 크롤링한 데이터의 제목들만 배열로 추출
      const scrapedTitles = results.map((item: any) => item.title);

      // 2. DB에서 해당 제목들과 일치하는 기존 데이터 조회
      const existingData = await SupportFund.findAll({
        where: {
          title: {
            [Op.in]: scrapedTitles
          }
        },
        attributes: ['title'] // 중복 확인용이므로 제목만 가져옵니다.
      });

      // 3. 기존에 존재하는 제목들을 Set 객체로 만들어 검색 속도 최적화
      const existingTitles = new Set(existingData.map((item: any) => item.title));

      // 4. 기존 DB에 없는 새로운 데이터만 필터링
      const newResults = results.filter((item: any) => !existingTitles.has(item.title));

      // 5. 새로운 데이터가 있을 때만 DB에 Insert
      if (newResults.length > 0) {
        await SupportFund.bulkCreate(newResults);
        insertedCount = newResults.length;
      }
    }

    console.log(`K-Startup 크롤링 완료! ${insertedCount}개 신규 저장.`);
    res.json({
      success: true,
      message: `K-Startup 공고 ${insertedCount}개 신규 수집 및 기존 DB에 추가 완료`,
    });
  } catch (error) {
    console.error('K-Startup 크롤링 에러:', error);
    res.status(500).json({ success: false, message: 'K-Startup 서버 통신 오류 발생' });
  }
});

// ==========================================
// 2. 조회, 검색 및 페이징 API (GET /api/funds)
// ==========================================
router.get('/', async (req: Request, res: Response) => {
  try {
    // 프론트엔드에서 넘어온 쿼리 파라미터 받기 (기본값 설정)
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = (page - 1) * limit;

    const category = req.query.category as string;
    const department = req.query.department as string;
    const title = req.query.title as string;

    // 검색 조건(where) 객체 동적 생성
    const where: any = {};

    if (category) {
      where.category = { [Op.like]: `%${category}%` }; // 지원분야 부분 일치
    }

    // 부처 단독 검색
    if (department) {
      where.department = { [Op.like]: `%${department}%` };
    }

    // 💡 제목 검색 시 '제목 또는 부처'에 검색어가 포함되도록 Op.or 적용
    if (title) {
      where[Op.or] = [
        { title: { [Op.like]: `%${title}%` } },
        { department: { [Op.like]: `%${title}%` } }
      ];
    }

    console.log(where);

    // 조건에 맞는 데이터와 총 개수를 한 번에 가져옴
    const { count, rows: funds } = await SupportFund.findAndCountAll({
      where,
      order: [['id', 'DESC']], // 최신순 정렬
      limit,
      offset,
    });

    res.json({
      success: true,
      data: funds,
      pagination: {
        totalItems: count,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('조회 에러:', error);
    res.status(500).json({ success: false, message: '조회 실패' });
  }
});

export default router;