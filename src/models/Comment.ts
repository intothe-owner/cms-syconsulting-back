import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Comment extends Model {}
Comment.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, comment: '댓글 고유 PK' },
  postId: { type: DataTypes.INTEGER, allowNull: false, comment: '소속된 게시물 ID' },
  memberId: { type: DataTypes.INTEGER, allowNull: true, comment: '작성자 회원 ID (비회원 null)' },
  writerName: { type: DataTypes.STRING, allowNull: false, comment: '댓글 작성자명' },
  password: { type: DataTypes.STRING, allowNull: true, comment: '비회원 댓글 비밀번호' },
  content: { type: DataTypes.TEXT, allowNull: false, comment: '댓글 본문 내용' },
  parentId: { type: DataTypes.INTEGER, allowNull: true, comment: '대댓글 작성을 위한 상위 댓글 ID' },
}, { 
  sequelize, 
  tableName: 'comments',
  paranoid: true,
  comment: '게시물에 달리는 댓글 및 대댓글 관리 테이블' 
});