// src/models/SupportFund.ts
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class SupportFund extends Model {}

SupportFund.init({
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  category: { 
    type: DataTypes.STRING, 
    allowNull: true,
    comment: '지원분야' 
  },
  title: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    comment: '지원사업명' 
  },
  period: { 
    type: DataTypes.STRING, 
    allowNull: true,
    comment: '신청기간' 
  },
  department: { 
    type: DataTypes.STRING, 
    allowNull: true,
    comment: '소관부처/지자체' 
  },
  detailUrl: { 
    type: DataTypes.TEXT, 
    allowNull: true,
    comment: '상세보기 URL 주소' 
  },
}, { 
  sequelize, 
  tableName: 'support_funds',
  timestamps: true // createdAt, updatedAt 자동 생성
});