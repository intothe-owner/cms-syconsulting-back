import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Member } from '../models/Member';
import { checkLevel } from '../middlewares/authMiddleware';
import { Op } from 'sequelize';
const router = Router();
// 1. 회원 목록 조회 (관리자 전용: Level 9 이상)
router.get('/', checkLevel, async (req: Request, res: Response) => {
  try {
    if (req.user.level < 9) {
      return res.status(403).json({ success: false, message: '회원 목록을 볼 권한이 없습니다.' });
    }
    
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // 💡 프론트엔드에서 넘어온 검색 파라미터 받기
    const searchType = req.query.searchType as string;
    const keyword = req.query.keyword as string;

    const where: any = {};
    
    // 💡 키워드가 존재할 경우 검색 조건 추가
    if (keyword) {
      if (searchType === 'loginId') {
        where.loginId = { [Op.like]: `%${keyword}%` };
      } else if (searchType === 'name') {
        where.name = { [Op.like]: `%${keyword}%` };
      }
    }

    const { count, rows: members } = await Member.findAndCountAll({
      where, // 💡 완성된 where 조건 객체 삽입
      attributes: { exclude: ['password'] }, 
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({ 
      success: true, 
      data: members,
      pagination: {
        totalItems: count,
        currentPage: page,
        itemsPerPage: limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('회원 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. 회원 정보 수정 (본인 또는 관리자)
router.put('/:id', checkLevel, async (req: Request, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    const { name, nickname, phone, mobile, address, level, password } = req.body;

    // 권한 검증: 수정 대상이 '나' 자신이거나, 내 레벨이 9(관리자) 이상인지 확인
    if (req.user.id !== targetId && req.user.level < 9) {
      return res.status(403).json({ success: false, message: '회원 정보를 수정할 권한이 없습니다.' });
    }

    // 수정할 항목 구성 (빈 값이 넘어가면 기존 값 유지)
    const updateData: any = {};
    if (name) updateData.name = name;
    if (nickname) updateData.nickname = nickname;
    if (phone) updateData.phone = phone;
    if (mobile) updateData.mobile = mobile;
    if (address) updateData.address = address;

    // 💡 회원의 권한(Level) 등급 변경은 '관리자(Level >= 9)'만 가능하도록 통제
    if (level !== undefined && req.user.level >= 9) {
      updateData.level = level;
    }

    // 💡 비밀번호 변경을 요청한 경우 새롭게 해싱
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const [updatedRows] = await Member.update(updateData, { where: { id: targetId } });
    
    if (updatedRows === 0) {
      return res.status(404).json({ success: false, message: '회원을 찾을 수 없거나 변경된 내용이 없습니다.' });
    }

    res.status(200).json({ success: true, message: '회원 정보가 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('회원 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 3. 회원 삭제 (관리자 전용)
router.delete('/:id', checkLevel, async (req: Request, res: Response) => {
  try {
    // 관리자(Level 9 이상)만 회원 삭제 가능
    if (req.user.level < 9) {
      return res.status(403).json({ success: false, message: '회원을 삭제할 권한이 없습니다.' });
    }

    const targetId = Number(req.params.id);
    const member = await Member.findByPk(targetId);

    if (!member) {
      return res.status(404).json({ success: false, message: '삭제할 회원을 찾을 수 없습니다.' });
    }

    // 💡 최고관리자(Level 10) 계정은 실수로 삭제되지 않도록 보호
    if (member.getDataValue('level') === 10) {
       return res.status(403).json({ success: false, message: '최고관리자 계정은 삭제할 수 없습니다.' });
    }

    await Member.destroy({ where: { id: targetId } });
    res.status(200).json({ success: true, message: '회원이 삭제되었습니다.' });
  } catch (error) {
    console.error('회원 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;