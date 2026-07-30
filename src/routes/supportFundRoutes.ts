import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Op } from 'sequelize'; // 데이터베이스 검색 연산자 임포트
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

        const category = $(tds[1]).text().trim();
        const titleAnchor = $(tds[2]).find('a');
        const title = titleAnchor.text().trim();
        const period = $(tds[3]).text().trim();
        const department = $(tds[4]).text().trim();
        
        // 💡 [수정됨] 보내주신 HTML 태그(href 속성) 기반으로 심플하게 URL 추출
        let detailUrl = '';
        const hrefAttr = titleAnchor.attr('href') || '';
        
        if (hrefAttr) {
          // 1. 주소가 http로 시작하지 않으면 앞에 baseUrl을 붙여줍니다.
          detailUrl = hrefAttr.startsWith('http') ? hrefAttr : baseUrl + hrefAttr;
          
          // 2. 주소 파라미터의 HTML 엔티티(&amp;)를 실제 앰퍼샌드(&) 기호로 변환합니다.
          detailUrl = detailUrl.replace(/&amp;/g, '&');
        }

        if (title) {
          results.push({ category, title, period, department, detailUrl });
        }
      });

      // 서버 부하를 막기 위해 0.5초 대기
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // DB 초기화 후 새로 인서트 (덮어쓰기)
    await SupportFund.destroy({ truncate: true });
    await SupportFund.bulkCreate(results);

    console.log('크롤링 및 DB 저장 완료!');
    res.json({
      success: true,
      message: `총 ${results.length}개의 데이터 수집 및 저장 완료`,
    });
  } catch (error) {
    console.error('크롤링 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류 발생' });
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
      const category = $(element).find('.top span.flag').not('.day').text().trim() || '창업지원';

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