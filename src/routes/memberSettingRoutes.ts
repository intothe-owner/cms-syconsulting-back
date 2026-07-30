import { Router, Request, Response } from 'express';
import { MemberSetting } from '../models/MemberSetting';

const router = Router();

// GET /api/member-settings - 회원 설정 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const [setting] = await MemberSetting.findOrCreate({
      where: { id: 1 },
      defaults: {
        memberSystemMode: 'ALL',
        useEmailAsLoginId: true,
        useEmail: true,
        useName: true,
        useNickname: true,
        useMobile: true,
        defaultLevel: 1,
        levelNames: {
          0: "차단/대기",
          1: "일반회원",
          2: "정회원",
          3: "우수회원",
          4: "VIP회원",
          5: "특별회원",
          6: "부관리자",
          7: "운영자",
          8: "부서장",
          9: "관리자",
          10: "최고관리자"
        },
        useKakaoLogin: false,
        useNaverLogin: false,
        useGoogleLogin: false,
      }
    });
    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    console.error('회원 설정 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// PUT /api/member-settings - 회원 설정 업데이트
router.put('/', async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    
    const formattedData: any = {};
    for (const key in updateData) {
      const val = updateData[key];
      if (val === 'true') formattedData[key] = true;
      else if (val === 'false') formattedData[key] = false;
      else formattedData[key] = val;
    }

    await MemberSetting.update(formattedData, { where: { id: 1 } });
    
    const updatedSetting = await MemberSetting.findByPk(1);
    res.status(200).json({ success: true, data: updatedSetting, message: '저장되었습니다.' });
  } catch (error) {
    console.error('회원 설정 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;