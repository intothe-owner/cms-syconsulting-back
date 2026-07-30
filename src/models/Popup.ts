// src/models/Popup.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Popup extends Model {}

Popup.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false, comment: '팝업 제목' },
  type: { 
    type: DataTypes.ENUM('LAYER', 'WINDOW'), 
    defaultValue: 'LAYER', 
    comment: '팝업 타입 (레이어 팝업 / 새 창 윈도우 팝업)' 
  },
  positionX: { 
    type: DataTypes.ENUM('LEFT', 'CENTER', 'RIGHT'), 
    defaultValue: 'CENTER', 
    comment: '가로 위치' 
  },
  positionY: { 
    type: DataTypes.ENUM('TOP', 'CENTER', 'BOTTOM'), 
    defaultValue: 'CENTER', 
    comment: '세로 위치' 
  },
  startDate: { type: DataTypes.DATE, allowNull: false, comment: '노출 시작 일시' },
  endDate: { type: DataTypes.DATE, allowNull: false, comment: '노출 종료 일시' },
  content: { type: DataTypes.TEXT('long'), comment: '에디터 HTML 내용' },
  attachmentUrl: { type: DataTypes.STRING, comment: '첨부파일/이미지 URL' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '사용 여부' },
}, {
  sequelize,
  tableName: 'popups',
  timestamps: true,
});