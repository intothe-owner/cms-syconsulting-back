import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class SiteSetting extends Model {}

SiteSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    siteName: { type: DataTypes.STRING, allowNull: false, comment: '사이트명' },
    metaKeywords: { type: DataTypes.STRING, comment: '메타태그 키워드' },
    metaDescription: { type: DataTypes.TEXT, comment: '메타태그 설명' },
    companyName: { type: DataTypes.STRING, comment: '회사명' },
    address: { type: DataTypes.STRING, comment: '회사 주소' },
    contactNumber: { type: DataTypes.STRING, comment: '연락처' },
    
    // PC/모바일 디스플레이 모드
    displayMode: {
      type: DataTypes.ENUM('RESPONSIVE', 'PC_ONLY', 'MOBILE_ONLY', 'ADAPTIVE'),
      defaultValue: 'RESPONSIVE',
      comment: '화면 표시 모드'
    },

    // 추가된 요구사항: 로고 및 파비콘
    logoUrl: { type: DataTypes.STRING, comment: '로고 이미지 경로' },
    faviconUrl: { type: DataTypes.STRING, comment: '파비콘 이미지 경로' },

    // 추가된 요구사항: 테마 설정 (밤낮 자동 포함)
    themeMode: {
      type: DataTypes.ENUM('LIGHT', 'DARK', 'AUTO_TIME', 'MENUAL'),
      defaultValue: 'LIGHT',
      comment: '테마 모드 (라이트/다크/밤낮자동)'
    },
    nightModeStartTime: { 
      type: DataTypes.TIME, 
      defaultValue: '18:00:00',
      comment: '야간 모드 시작 시간' 
    },
    nightModeEndTime: { 
      type: DataTypes.TIME, 
      defaultValue: '06:00:00',
      comment: '야간 모드 종료(주간 시작) 시간' 
    },
  },
  {
    sequelize,
    tableName: 'site_settings',
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);