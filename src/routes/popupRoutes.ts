// src/routes/popupRoutes.ts
import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Popup } from '../models/Popup';
import { upload } from '../middlewares/upload'; // 기존 multer 미들웨어 경로에 맞게 수정

const router = Router();

// 1. 관리자용: 전체 팝업 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const popups = await Popup.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, data: popups });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. 프론트엔드용: 현재 활성화된(기간 내에 있는) 팝업만 조회
router.get('/active', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const activePopups = await Popup.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: now }, // 시작일이 지금보다 과거이거나 같음
        endDate: { [Op.gte]: now }    // 종료일이 지금보다 미래이거나 같음
      }
    });
    res.status(200).json({ success: true, data: activePopups });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 3. 팝업 생성 (파일 업로드 포함)
router.post('/', upload.single('attachment'), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    
    if (req.file) {
      // 💡 로컬 하드코딩 주소 대신 S3 고유 URL(location)을 저장합니다.
      data.attachmentUrl = (req.file as any).location;
    }
    
    // Boolean 형변환
    data.isActive = data.isActive === 'true';

    const popup = await Popup.create(data);
    res.status(201).json({ success: true, data: popup });
  } catch (error) {
    console.error('팝업 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 4. 팝업 수정
router.put('/:id', upload.single('attachment'), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    
    if (req.file) {
      // 💡 로컬 주소 대신 S3에 업로드된 파일의 고유 URL(location)을 할당합니다.
      // TypeScript 환경이므로 타입 에러 방지를 위해 (req.file as any)로 처리합니다.
      data.attachmentUrl = (req.file as any).location;
    }
    
    if (data.isActive !== undefined) data.isActive = data.isActive === 'true';

    await Popup.update(data, { where: { id: req.params.id } });
    const updatedPopup = await Popup.findByPk(req.params.id as string);
    res.status(200).json({ success: true, data: updatedPopup });
  } catch (error) {
    console.error('팝업 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 5. 팝업 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Popup.destroy({ where: { id: req.params.id } });
    res.status(200).json({ success: true, message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;