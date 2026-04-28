import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Message extends Model {
  public id!: string;
  public from!: string;
  public to!: string;
  public content!: string; // JSON string of EncryptedPayload
  public timestamp!: Date;
  public status!: 'sent' | 'delivered' | 'read';
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    from: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    to: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT('medium'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read'),
      defaultValue: 'sent',
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
  }
);

export default Message;
