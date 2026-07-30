import { Router, Request, Response } from 'express';
import { Menu } from '../models/Menu';
import { sequelize } from '../config/database'; // 트랜잭션 처리를 위해 추가

const router = Router();

// 1. 메뉴 전체 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const menus = await Menu.findAll({
      order: [
        ['parentId', 'ASC'],
        ['order', 'ASC'],
      ],
    });
    res.status(200).json({ success: true, data: menus });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. [신규] 드래그 앤 드롭 순서 일괄 변경
router.put('/reorder', async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();
  try {
    const { menus } = req.body; // { id, parentId, depth, order } 배열
    
    // 반복문을 돌며 각 메뉴의 순서와 부모 ID 업데이트
    for (const menu of menus) {
      await Menu.update(
        { parentId: menu.parentId, depth: menu.depth, order: menu.order },
        { where: { id: menu.id }, transaction }
      );
    }
    
    await transaction.commit();
    res.status(200).json({ success: true, message: '메뉴 순서가 변경되었습니다.' });
  } catch (error) {
    await transaction.rollback();
    console.error('메뉴 순서 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 3. 새 메뉴 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, parentId, depth, order, url } = req.body;
    const newMenu = await Menu.create({ name, parentId, depth, order, url });
    res.status(201).json({ success: true, data: newMenu, message: '메뉴가 추가되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 4. 기존 메뉴 수정 (인라인 수정용)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const menuId = Number(req.params.id);
    const { name, url } = req.body;
    
    await Menu.update({ name, url }, { where: { id: menuId } });
    const updatedMenu = await Menu.findByPk(menuId);
    
    res.status(200).json({ success: true, data: updatedMenu, message: '메뉴가 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 5. 메뉴 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const menuId = Number(req.params.id);
    const childMenus = await Menu.count({ where: { parentId: menuId } });
    
    if (childMenus > 0) {
      return res.status(400).json({ success: false, message: '하위 메뉴가 존재하여 삭제할 수 없습니다.' });
    }

    await Menu.destroy({ where: { id: menuId } });
    res.status(200).json({ success: true, message: '메뉴가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;