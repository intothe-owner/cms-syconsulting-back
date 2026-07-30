// src/routes/pageRoutes.ts
import { Router, Request, Response } from 'express';
import { Page,Menu } from '../models';
import { upload } from '../middlewares/upload'; // multer 미들웨어 임포트

const router = Router();

// 1. 전체 페이지 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const pages = await Page.findAll({
      order: [['createdAt', 'DESC']],
    });
    
    res.status(200).json({ success: true, data: pages });
  } catch (error) {
    console.error('페이지 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. 특정 페이지 상세 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const param = req.params.id;

    
    // 💡 param이 "0"인 경우(메인 페이지) 처리
    if (param === "0") {
      const page = await Page.findOne({ where: { menuId: null } });
      if (!page) {
        return res.status(404).json({ success: false, message: '페이지 콘텐츠를 찾을 수 없습니다.' });
      }
      return res.status(200).json({ success: true, data: page });
    }

    let menuIds: number[] = [];

    // 1. 숫자인지 문자열(url 슬러그)인지 판별하여 메뉴 검색
    if (!isNaN(Number(param))) {
      const menu = await Menu.findByPk(Number(param));
      if (menu) menuIds.push((menu as any).id);
    } else {
      const searchUrl = `/${param}`;
      //const searchUrl = `/page?id=${param}`;
      console.log(searchUrl);
      const menus = await Menu.findAll({ where: { url: searchUrl } });
      menuIds = menus.map((m: any) => m.id);
    }
    console.log(menuIds);

    if (menuIds.length === 0) {
      return res.status(404).json({ success: false, message: '메뉴를 찾을 수 없습니다.' });
    }

    // 3. Page 테이블에서 menuId 배열 중 하나라도 일치하는 컨텐츠 조회
    const page = await Page.findOne({ where: { menuId: menuIds } });
    
    if (!page) {
      return res.status(404).json({ success: false, message: '페이지 콘텐츠를 찾을 수 없습니다.' });
    }
    
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    console.error('페이지 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});
//게시판
router.get('/boards/:id', async (req: Request, res: Response) => {
  try {
    const param = req.params.id;

    
    // 💡 param이 "0"인 경우(메인 페이지) 처리
    if (param === "0") {
      const page = await Page.findOne({ where: { menuId: null } });
      if (!page) {
        return res.status(404).json({ success: false, message: '페이지 콘텐츠를 찾을 수 없습니다.' });
      }
      return res.status(200).json({ success: true, data: page });
    }

    let menuIds: number[] = [];

    // 1. 숫자인지 문자열(url 슬러그)인지 판별하여 메뉴 검색
    if (!isNaN(Number(param))) {
      const menu = await Menu.findByPk(Number(param));
      if (menu) menuIds.push((menu as any).id);
    } else {
      const searchUrl = `/boards/${param}`;
      //const searchUrl = `/page?id=${param}`;
      console.log(searchUrl);
      const menus = await Menu.findAll({ where: { url: searchUrl } });
      menuIds = menus.map((m: any) => m.id);
    }
    console.log(menuIds);

    if (menuIds.length === 0) {
      return res.status(404).json({ success: false, message: '메뉴를 찾을 수 없습니다.' });
    }

    // 3. Page 테이블에서 menuId 배열 중 하나라도 일치하는 컨텐츠 조회
    const page = await Page.findOne({ where: { menuId: menuIds } });
    
    if (!page) {
      return res.status(404).json({ success: false, message: '페이지 콘텐츠를 찾을 수 없습니다.' });
    }
    
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    console.error('페이지 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// JSON 데이터와 파일을 매핑해주는 헬퍼 함수
const processFileData = (files: any, blocks: any[], slides: any[], pageMeta: any) => {
  if (files && Array.isArray(files)) {
    files.forEach((file: any) => {
      const fieldName = file.fieldname;
      
      // 💡 핵심 변경 사항: localhost 주소 대신 S3에서 제공하는 location URL을 바로 사용합니다.
      const fileUrl = file.location; 

      // 1. 슬라이드 파일인 경우
      if (fieldName.startsWith('slide_file_')) {
        const idx = parseInt(fieldName.replace('slide_file_', ''), 10);
        if (slides[idx]) slides[idx].mediaUrl = fileUrl;
      } 
      // 2. 블록 엘리먼트 파일인 경우
      else if (fieldName.startsWith('element_file_')) {
        const elId = fieldName.replace('element_file_', '');
        blocks.forEach((container: any) => {
          container.columns.forEach((col: any) => {
            col.elements.forEach((el: any) => {
              if (el.id === elId) {
                el.content = fileUrl; // 업로드된 S3 경로로 치환
              }
            });
          });
        });
      }
      // 3. 테이블 셀 내부 이미지 파일인 경우
      else if (fieldName.startsWith('table_file_')) {
        const match = fieldName.match(/^table_file_(.+)_(.+)$/);
        if (match) {
          const elId = match[1];
          const cellKey = match[2];
          blocks.forEach((container: any) => {
            container.columns.forEach((col: any) => {
              col.elements.forEach((el: any) => {
                if (el.id === elId && el.type === 'TABLE' && el.tableData && el.tableData.cells && el.tableData.cells[cellKey]) {
                  // 임시 blob URL을 실제 S3 서버 URL로 교체
                  el.tableData.cells[cellKey].content = el.tableData.cells[cellKey].content.replace(/src="blob:[^"]+"/, `src="${fileUrl}"`);
                }
              });
            });
          });
        }
      }
      // 4. 메타 배경 파일인 경우
      else if (fieldName === 'meta_bg_file') {
        pageMeta.bgImage = fileUrl;
      }
    });
  }
};

// 3. 새 페이지 생성 (multer 추가 및 매핑 로직)
router.post('/', upload.any(), async (req: Request, res: Response) => {
  try {
    let { menuId, title, contentBlocks, sliderData,pageMeta } = req.body;

    // FormData로 넘어온 데이터는 문자열이므로 파싱 필요
    let parsedBlocks = typeof contentBlocks === 'string' ? JSON.parse(contentBlocks) : (contentBlocks || []);
    let parsedSlides = typeof sliderData === 'string' ? JSON.parse(sliderData) : (sliderData || []);
    let parsedMeta = typeof pageMeta === 'string' ? JSON.parse(pageMeta) : (pageMeta || {});

    // 업로드된 파일 매핑 처리
    processFileData(req.files, parsedBlocks, parsedSlides,parsedMeta);

    const newPage = await Page.create({ 
      menuId: menuId ? Number(menuId) : null, 
      title, 
      contentBlocks: parsedBlocks, 
      sliderData: parsedSlides,
      pageMeta: parsedMeta
    });
    res.status(201).json({ success: true, data: newPage, message: '페이지가 생성되었습니다.' });
  } catch (error) {
    console.error('페이지 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 4. 기존 페이지 수정 (multer 추가 및 매핑 로직)
router.put('/:id', upload.any(), async (req: Request, res: Response) => {
  try {
    const pageId = Number(req.params.id);
    let { menuId, title, contentBlocks, sliderData,pageMeta } = req.body;
    

    let parsedBlocks = typeof contentBlocks === 'string' ? JSON.parse(contentBlocks) : (contentBlocks || []);
    let parsedSlides = typeof sliderData === 'string' ? JSON.parse(sliderData) : (sliderData || []);
    let parsedMeta = typeof pageMeta === 'string' ? JSON.parse(pageMeta) : (pageMeta || {});

    // 업로드된 파일 매핑 처리
    processFileData(req.files, parsedBlocks, parsedSlides,parsedMeta);
    
    await Page.update(
      { 
        menuId: menuId ? Number(menuId) : null, 
        title, 
        contentBlocks: parsedBlocks, 
        sliderData: parsedSlides,
        pageMeta: parsedMeta // 👈 이 부분을 추가해야 DB에 반영됩니다.
      }, 
      { where: { id: pageId } }
    );
    
    const updatedPage = await Page.findByPk(pageId);
    res.status(200).json({ success: true, data: updatedPage, message: '페이지가 수정되었습니다.' });
  } catch (error) {
    console.error('페이지 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 5. 페이지 삭제 (Soft Delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pageId = Number(req.params.id);
    await Page.destroy({ where: { id: pageId } });
    res.status(200).json({ success: true, message: '페이지가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

export default router;