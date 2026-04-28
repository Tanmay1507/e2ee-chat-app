import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Notice extends Model {
  public id!: string;
  public groupId!: string;
  public fromUsername!: string;
  public content!: string; // JSON string of EncryptedPayload (contains heading, description, attachment)
  public timestamp!: Date;
}

Notice.init(
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
      type: DataTypes.TEXT('medium'),
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Notice',
    tableName: 'notices',
    timestamps: false, // We use our own timestamp field
  }
);

export default Notice;
