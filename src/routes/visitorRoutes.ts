import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { VisitorLog } from '../models/VisitorLog';
import { sequelize } from '../config/database';

const router = Router();

// 1. 방문 기록 저장 (프론트엔드 라우터 이동 시 호출)
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { pageUrl } = req.body;
    
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown_ip';
    const userAgent = req.headers['user-agent'] || 'unknown_agent';
    
    // 한국 시간(KST) 기준 날짜 (YYYY-MM-DD)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const visitDate = new Date(now.getTime() + kstOffset).toISOString().split('T')[0];

    // 무분별한 카운트 방지: 동일 IP, 동일 날짜, 동일 페이지는 하루 1회만 기록 (순방문자 기준)
    const [log, created] = await VisitorLog.findOrCreate({
      where: { ipAddress, visitDate, pageUrl },
      defaults: { userAgent }
    });

    res.status(200).json({ success: true, message: '방문이 기록되었습니다.', created });
  } catch (error) {
    console.error('방문 기록 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. 페이지별 전체 통계 (방문수 많은 순)
router.get('/stats/page', async (req: Request, res: Response) => {
  try {
    const stats = await VisitorLog.findAll({
      attributes: [
        'pageUrl',
        [sequelize.fn('COUNT', sequelize.col('id')), 'visitCount']
      ],
      group: ['pageUrl'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('페이지 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 3. 💡 [신규] 년/월/일/시간별 통계 조회
router.get('/stats/time', async (req: Request, res: Response) => {
  try {
    // 쿼리 파라미터 받기 (기본값: 일별)
    // type: 'yearly', 'monthly', 'daily', 'hourly'
    const { type = 'daily', startDate, endDate, pageUrl } = req.query;

    const where: any = {};
    
    // 1) 기간 필터링 적용
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(`${startDate} 00:00:00`), new Date(`${endDate} 23:59:59`)]
      };
    }

    // 2) 특정 페이지 필터링 (선택 사항)
    if (pageUrl) {
      where.pageUrl = pageUrl;
    }

    // 3) type에 따른 MySQL 날짜 포맷팅 설정
    // createdAt(생성일시)를 기준으로 그룹화합니다.
    let formatStr = '%Y-%m-%d'; 
    if (type === 'yearly') formatStr = '%Y';                // 예: 2026
    else if (type === 'monthly') formatStr = '%Y-%m';       // 예: 2026-07
    else if (type === 'hourly') formatStr = '%Y-%m-%d %H:00'; // 예: 2026-07-29 14:00

    const stats = await VisitorLog.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), formatStr), 'timePeriod'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'visitCount']
      ],
      where,
      group: ['timePeriod'],
      order: [['timePeriod', 'ASC']] // 과거 시간부터 오름차순 정렬
    });

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('시간별 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;