import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Menu extends Model {}
Menu.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, comment: '메뉴 고유 PK' },
  name: { type: DataTypes.STRING, allowNull: false, comment: '메뉴명' },
  parentId: { type: DataTypes.INTEGER, allowNull: true, comment: '상위 메뉴 ID (null이면 1차 메뉴)' },
  depth: { type: DataTypes.INTEGER, defaultValue: 1, comment: '메뉴 뎁스 (1, 2, 3)' },
  order: { type: DataTypes.INTEGER, defaultValue: 0, comment: '출력 순서' },
  url: { type: DataTypes.STRING, comment: '연결 URL' },
}, { 
  sequelize, 
  tableName: 'menus',
  paranoid: true, // Soft Delete 활성화 (deletedAt 컬럼 자동 생성)
  comment: '사이트 메뉴 구조 및 계층 관리 테이블' 
});