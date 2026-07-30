// src/models/index.ts
import { SiteSetting } from './SiteSetting';
import { Menu } from './Menu';
import { Page } from './Page';
import { BoardConfig } from './BoardConfig';
import { Post } from './Post';
import { Comment } from './Comment';
import { MemberSetting } from './MemberSetting';
import { Member } from './Member';
import { VisitorLog } from './VisitorLog';
import { SupportFund } from './SupportFund';

// --- 테이블 간의 관계(Relation) 정의 ---

// 1. 메뉴-메뉴 (자기참조)
Menu.hasMany(Menu, { as: 'subMenus', foreignKey: 'parentId', onDelete: 'CASCADE' });
Menu.belongsTo(Menu, { as: 'parentMenu', foreignKey: 'parentId' });

// 2. 메뉴-페이지 (메뉴 삭제 시 연결된 페이지 설정도 논리 삭제)
Menu.hasOne(Page, { foreignKey: 'menuId', onDelete: 'CASCADE' });
Page.belongsTo(Menu, { foreignKey: 'menuId' });

// 3. 메뉴-게시판설정 (메뉴 삭제 시 게시판도 종속적으로 논리 삭제)
Menu.hasOne(BoardConfig, { foreignKey: 'menuId', onDelete: 'CASCADE' });
BoardConfig.belongsTo(Menu, { foreignKey: 'menuId' });

// 4. 게시판설정-게시물 (게시판 삭제 시 안에 든 글들도 삭제)
BoardConfig.hasMany(Post, { foreignKey: 'boardConfigId', onDelete: 'CASCADE' });
Post.belongsTo(BoardConfig, { foreignKey: 'boardConfigId' });

// 5. 게시물-댓글 (글 삭제 시 댓글도 삭제)
Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE' }); 
Comment.belongsTo(Post, { foreignKey: 'postId' });
 
// (선택) 회원-게시물 관계 설정
Member.hasMany(Post, { foreignKey: 'memberId' });
Post.belongsTo(Member, { foreignKey: 'memberId' });

export { Menu, Page, BoardConfig, Post, Comment, SiteSetting, Member,MemberSetting,VisitorLog,SupportFund };