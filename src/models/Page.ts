import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Page extends Model {}
Page.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, comment: '페이지 고유 PK' },
  menuId: { type: DataTypes.INTEGER, allowNull: true, comment: '연결된 메뉴 ID' },
  title: { type: DataTypes.STRING, allowNull: false, comment: '페이지 제목' },
  contentBlocks: { type: DataTypes.JSON, comment: '페이지 컨텐츠 (Block 데이터)' }, 
  sliderData: { type: DataTypes.JSON, comment: '메인 슬라이더 (이미지, 동영상 URL 배열)' },
  pageMeta: { type: DataTypes.JSON, comment: '페이지 헤더 메타 (bgImage, bgTitle)' },
}, { 
  sequelize, 
  tableName: 'pages',
  paranoid: true,
  comment: '각 메뉴별 커스텀 페이지 컨텐츠 관리 테이블' 
});