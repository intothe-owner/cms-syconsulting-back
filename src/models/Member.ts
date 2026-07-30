import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Member extends Model {}
Member.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  loginId: { type: DataTypes.STRING, unique: false, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  nickname: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  mobile: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  dob: { type: DataTypes.DATEONLY },
  level: { type: DataTypes.INTEGER, defaultValue: 1, comment: '회원 권한 레벨 (예: 10=최고관리자)' },
  snsProvider: { 
    type: DataTypes.ENUM('LOCAL', 'KAKAO', 'NAVER', 'GOOGLE'), 
    defaultValue: 'LOCAL', 
    comment: '가입 경로 (로컬가입 또는 SNS 플랫폼)' 
  },
  snsId: { type: DataTypes.STRING, comment: 'SNS 플랫폼에서 제공하는 고유 식별자(ID)' },
}, { sequelize, tableName: 'members' });