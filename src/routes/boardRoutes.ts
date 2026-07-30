import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import { Post, Comment, BoardConfig } from '../models';
import { checkLevel } from '../middlewares/authMiddleware';
import dotenv from 'dotenv';

dotenv.config();
const router = Router();

// ==========================================
// ☁️ AWS S3 클라이언트 설정
// ==========================================
const s3 = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// ==========================================
// 📁 Multer S3 업로드 설정
// ==========================================
// 파일 확장자 필터링 (exe, apk 차단)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.exe' || ext === '.apk') {
    return cb(new Error('보안상 실행 파일(.exe, .apk)은 업로드할 수 없습니다.'));
  }
  cb(null, true);
};

export const upload = multer({ 
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME as string,
    contentType: multerS3.AUTO_CONTENT_TYPE, // S3에서 파일 타입을 자동으로 인식하도록 설정
    key: (req, file, cb) => {
      // 한글 파일명 깨짐 방지
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      // S3 버킷 내 저장될 경로 및 파일명 (uploads/폴더 하위에 저장)
      cb(null, `uploads/${uniqueSuffix}${path.extname(originalName)}`);
    }
  }),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB 제한
});


// ==========================================
// 공통 함수: 파라미터로 게시판 설정 찾기
// ==========================================
const findBoardConfig = async (param: string) => {
  return await BoardConfig.findOne({
    where: {
      [Op.or]: [
        { tableName: param },
        ...(isNaN(Number(param)) ? [] : [{ id: Number(param) }]) 
      ]
    }
  });
};

// ==========================================
// 1. 게시글 (Post) 라우터
// ==========================================

// 1-1. 게시글 목록 조회
router.get('/:boardId/posts', checkLevel, async (req: Request, res: Response) => {
  try {
    const boardIdParam = req.params.boardId as string; 
    const boardConfig = await findBoardConfig(boardIdParam);
    
    if (!boardConfig) {
      return res.status(404).json({ success: false, message: '게시판 설정을 찾을 수 없습니다.' });
    }
    if (req.user.level < boardConfig.getDataValue('readLevel')) {
      return res.status(403).json({ success: false, message: '이 게시판의 목록을 볼 수 있는 권한이 없습니다.' });
    }
    
    const configId = boardConfig.get('id') as number; 
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const posts = await Post.findAndCountAll({
      where: { boardConfigId: configId }, 
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.status(200).json({ 
      success: true, 
      data: posts.rows, 
      totalCount: posts.count,
      totalPages: Math.ceil(posts.count / limit),
      currentPage: page 
    });
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 1-2. 게시글 작성
router.post('/:boardId/posts', checkLevel, upload.array('attachments'), async (req: Request, res: Response) => {
  try {
    const boardIdParam = req.params.boardId as string;
    const boardConfig = await findBoardConfig(boardIdParam);
    
    if (!boardConfig) {
      return res.status(404).json({ success: false, message: '게시판 설정을 찾을 수 없습니다.' });
    }
    if (req.user.level < boardConfig.getDataValue('writeLevel')) {
      return res.status(403).json({ success: false, message: '이 게시판에 글을 쓸 수 있는 권한이 없습니다.' });
    }

    const configId = boardConfig.get('id') as number;
    const { writerName, title, content, memberId, password, isNotice, extraData } = req.body;

    // 💡 S3 업로드된 파일 정보 파싱
    // multer-s3를 사용하면 file 객체 안에 저장된 S3 URL인 'location' 속성이 생깁니다.
    const files = req.files as Express.Multer.File[];
    let uploadedMediaUrls: string[] = [];
    let thumbnailUrl: string | null = null;

    if (files && files.length > 0) {
      // (file as any).location 에 S3 경로가 담겨 있습니다.
      uploadedMediaUrls = files.map((file: any) => file.location);
      
      const firstImage = files.find(file => /\.(jpeg|jpg|gif|png|webp)$/i.test(file.originalname));
      if (firstImage) {
        thumbnailUrl = (firstImage as any).location;
      }
    }

    const newPost = await Post.create({
      boardConfigId: configId,
      writerName,
      title,
      content,
      memberId: memberId || null,
      password: password || null,
      isNotice: isNotice === 'true' || isNotice === true,
      extraData: extraData || null,
      mediaUrls: uploadedMediaUrls.length > 0 ? JSON.stringify(uploadedMediaUrls) : null,
      thumbnailUrl,
    });

    res.status(201).json({ success: true, data: newPost, message: '게시글이 성공적으로 작성되었습니다.' });
  } catch (error: any) {
    console.error('게시글 작성 오류:', error);
    if (error.message.includes('보안상')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 1-3. 게시글 상세 조회
router.get('/posts/:postId', checkLevel, async (req: Request, res: Response) => {
  // (기존 코드와 동일하므로 생략 없이 유지합니다)
  try {
    const postId = Number(req.params.postId);
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }

    const boardConfig = await BoardConfig.findByPk(post.getDataValue('boardConfigId'));
    if (boardConfig && req.user.level < boardConfig.getDataValue('readLevel')) {
      return res.status(403).json({ success: false, message: '이 게시글을 읽을 수 있는 권한이 없습니다.' });
    }

    await post.increment('hitCount', { by: 1 }); 
    await post.reload();

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 1-4. 게시글 수정
router.put('/posts/:postId', checkLevel, upload.array('attachments'), async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.postId);
    const post = await Post.findByPk(postId);
    
    if (!post) return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });

    const isAuthor = req.user.id && req.user.id === post.getDataValue('memberId');
    const isAdmin = req.user.level === 10;
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: '게시글을 수정할 권한이 없습니다.' });
    }

    const updateData: any = req.body;
    const files = req.files as Express.Multer.File[];
    
    // 💡 수정 시 파일이 첨부되었을 경우 S3 URL 적용
    if (files && files.length > 0) {
      const uploadedMediaUrls = files.map((file: any) => file.location);
      const firstImage = files.find(file => /\.(jpeg|jpg|gif|png|webp)$/i.test(file.originalname));
      
      updateData.mediaUrls = JSON.stringify(uploadedMediaUrls);
      updateData.thumbnailUrl = firstImage ? (firstImage as any).location : null;
    }

    await Post.update(updateData, { where: { id: postId } });
    const updatedPost = await Post.findByPk(postId);
    res.status(200).json({ success: true, data: updatedPost, message: '게시글이 수정되었습니다.' });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 나머지 라우터(댓글 작성/조회/수정/삭제 및 게시글 삭제) 코드는 로컬 파일 I/O와 무관하므로 그대로 사용하시면 됩니다.

export default router;