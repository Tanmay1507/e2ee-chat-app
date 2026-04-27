import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class GroupMessage extends Model {
  public id!: string;
  public groupId!: string;
  public fromUsername!: string;
  public content!: string; // JSON string of EncryptedPayload
  public timestamp!: Date;
}

GroupMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    fromUsername: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'GroupMessage',
    tableName: 'group_messages',
  }
);

export default GroupMessage;
