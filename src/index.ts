import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import './models/'; // 모델 임포트
import settingRoutes from './routes/settingRoutes';
import memberSettingRoutes from './routes/memberSettingRoutes';
import menuRoutes from './routes/menuRoutes';
import pageRoutes from './routes/pageRoutes';
import boardConfigRoutes from './routes/boardConfigRoutes';
import aiRoutes from './routes/aiRoutes';
import boardRoutes from './routes/boardRoutes';
import authRoutes from './routes/authRoutes';
import popupRoutes from './routes/popupRoutes';
import supportFundRoutes from './routes/supportFundRoutes';
import visitorRoutes from './routes/visitorRoutes';
import memberRoutes from './routes/memberRoutes';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 💡 1. CORS 설정을 가장 최상단으로 이동 (모든 요청에 대해 CORS 허용)
const corsOptions: cors.CorsOptions = {
  origin: [
    "http://localhost:3000",
    "http://113.131.151.103:3000",
    "http://113.131.151.103:8088",
    "http://www.syconsulting.co.kr",
    "http://syconsulting.co.kr",
    "https://www.syconsulting.co.kr",
    "https://syconsulting.co.kr",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};
app.use(cors(corsOptions));

// 💡 2. Body Parser 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 💡 3. 정적 파일 제공 (CORS와 Body 파싱이 적용된 후 실행)
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// 4. API 라우터 연결
app.use('/api/settings', settingRoutes);
app.use('/api/member-settings', memberSettingRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/board-configs', boardConfigRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/popups', popupRoutes);
app.use('/api/funds', supportFundRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/members', memberRoutes);

// DB 동기화 및 서버 실행
sequelize.sync({ alter: true }) // alter: true는 스키마 변경 시 테이블을 자동으로 수정해 줍니다.
  .then(() => {
    console.log('✅ 데이터베이스 연결 및 테이블 동기화 완료');
    app.listen(PORT, () => {
      console.log(`🚀 Node.js Backend Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ 데이터베이스 연결 실패:', error);
  });