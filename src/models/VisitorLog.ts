import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class VisitorLog extends Model {}
VisitorLog.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  ipAddress: { type: DataTypes.STRING, allowNull: false },
  userAgent: { type: DataTypes.STRING },
  visitDate: { type: DataTypes.DATEONLY, allowNull: false, comment: '일별 통계를 위한 날짜' },
  pageUrl: { type: DataTypes.STRING, comment: '접속한 페이지 URL' },
}, { sequelize, tableName: 'visitor_logs', timestamps: true });