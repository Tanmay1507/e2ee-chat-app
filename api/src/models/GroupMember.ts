import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class GroupMember extends Model {
  public groupId!: string;
  public username!: string;
  public encryptedGroupKey!: string; // The group's AES key, encrypted with member's public key
}

GroupMember.init(
  {
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    encryptedGroupKey: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'GroupMember',
    tableName: 'group_members',
  }
);

export default GroupMember;
