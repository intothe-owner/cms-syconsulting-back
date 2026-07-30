import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Post extends Model {}
Post.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, comment: '게시물 고유 PK' },
  boardConfigId: { type: DataTypes.INTEGER, allowNull: false, comment: '소속된 게시판 설정 ID' },
  memberId: { type: DataTypes.INTEGER, allowNull: true, comment: '작성자 회원 ID (비회원인 경우 null)' },
  writerName: { type: DataTypes.STRING, allowNull: false, comment: '작성자 이름 또는 닉네임' },
  password: { type: DataTypes.STRING, allowNull: true, comment: '비회원 글 수정/삭제용 비밀번호 (해시)' },
  isNotice: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '공지사항 여부' },
  title: { type: DataTypes.STRING, allowNull: false, comment: '게시물 제목' },
  content: { type: DataTypes.TEXT('long'), allowNull: false, comment: '게시물 본문 내용 (HTML 또는 텍스트)' },
  hitCount: { type: DataTypes.INTEGER, defaultValue: 0, comment: '조회수' },
  extraData: { type: DataTypes.JSON, comment: '필드 추가 기능을 위한 동적 데이터 (JSON)' },
  mediaUrls: { type: DataTypes.JSON, comment: '갤러리/일반 첨부파일 및 동영상 URL 배열' },
  thumbnailUrl: { type: DataTypes.STRING, comment: '리스트 노출용 썸네일 이미지 URL' },
}, { 
  sequelize, 
  tableName: 'posts',
  paranoid: true, // 글 삭제 시 휴지통 기능(Soft Delete)
  comment: '사용자가 작성한 게시물 데이터 테이블' 
});