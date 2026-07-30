import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

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
// 🛡️ 파일 필터링 설정
// ==========================================
// 이미지, 동영상, 오디오 파일 모두 허용하는 필터
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (
    file.mimetype.startsWith('image/') || 
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')
  ) {
    cb(null, true);
  } else {
    cb(new Error('이미지, 동영상, 오디오 파일만 업로드 가능합니다.'));
  }
};

// ==========================================
// 📦 S3 스토리지 설정 적용된 upload 객체
// ==========================================
export const upload = multer({ 
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME as string,
    contentType: multerS3.AUTO_CONTENT_TYPE, // S3에서 파일 타입을 자동으로 인식하여 브라우저에서 바로 열리게 함
    key: (req, file, cb) => {
      // 한글 파일명 깨짐 방지 및 중복 방지를 위해 타임스탬프와 난수 추가
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = path.extname(originalName);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      
      // S3 버킷 내의 'uploads' 폴더 안에 저장 (예: uploads/file-163...123.jpg)
      cb(null, `uploads/${file.fieldname}-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter,
  // 동영상 업로드를 고려하여 용량 제한을 50MB(52,428,800 바이트)로 설정
  // 서비스 정책에 따라 100MB(100 * 1024 * 1024) 등으로 조절해서 사용하세요.
  limits: { fileSize: 50 * 1024 * 1024 } 
});