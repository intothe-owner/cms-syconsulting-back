import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class MemberSetting extends Model {}
MemberSetting.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, comment: '회원 설정 고유 PK' },
  memberSystemMode: { 
    type: DataTypes.ENUM('ALL', 'LOGIN_ONLY', 'NONE'), 
    defaultValue: 'ALL', 
    comment: '운영 모드 (ALL: 가입/로그인 모두 사용, LOGIN_ONLY: 가입 차단/로그인만, NONE: 모두 차단/비회원제)' 
  },
  // 로그인 및 기본 정보 설정
  useEmailAsLoginId: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '아이디와 이메일 통합 여부' },
  useEmail: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '이메일 사용여부' },
  useName: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '이름 사용여부' },
  useNickname: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '닉네임 사용여부' },
  usePhone: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '전화번호 사용여부' },
  useMobile: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '휴대폰번호 사용여부' },
  useAddress: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '주소 사용여부' },
  useDob: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '생년월일 사용여부' },

  // --- 💡 [신규 추가] 가입 승인 제도 설정 ---
  useApproval: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '관리자/이메일 가입 승인제 사용 여부' },
  approvalType: { 
    type: DataTypes.ENUM('DOCUMENT', 'EMAIL'), 
    defaultValue: 'DOCUMENT', 
    comment: '승인 방식 (DOCUMENT: 증빙서류 업로드, EMAIL: 이메일 인증)' 
  },
  approvalNotice: { type: DataTypes.TEXT, comment: '가입 페이지에 표시할 승인 안내 및 서류 제출 가이드 텍스트' },

  // 회원 권한 설정 (0 ~ 10 레벨)
  defaultLevel: { type: DataTypes.INTEGER, defaultValue: 1, comment: '신규 가입 회원 기본 권한 레벨' },
  levelNames: { type: DataTypes.JSON, comment: '권한 레벨(0~10)별 명칭 관리 (JSON 형태)' },

  // --- SNS 로그인 설정 ---
  useKakaoLogin: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '카카오 로그인 활성화 여부' },
  kakaoClientId: { type: DataTypes.STRING, comment: '카카오 REST API 키' },
  kakaoClientSecret: { type: DataTypes.STRING, comment: '카카오 Client Secret' },
  
  useNaverLogin: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '네이버 로그인 활성화 여부' },
  naverClientId: { type: DataTypes.STRING, comment: '네이버 Client ID' },
  naverClientSecret: { type: DataTypes.STRING, comment: '네이버 Client Secret' },
  
  useGoogleLogin: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '구글 로그인 활성화 여부' },
  googleClientId: { type: DataTypes.STRING, comment: '구글 Client ID' },
  googleClientSecret: { type: DataTypes.STRING, comment: '구글 Client Secret' },
}, { 
  sequelize, 
  tableName: 'member_settings',
  comment: '회원가입 항목, 승인 제도, 0~10 권한 및 SNS 로그인 설정 테이블'
});