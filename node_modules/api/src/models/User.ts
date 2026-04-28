import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class User extends Model {
  public id!: string;
  public employeeId!: string;
  public username!: string;
  public password!: string;
  public department?: string;
  public role?: string;
  public publicKey!: string;
  public encryptedPrivateKey?: string;
  public keySalt?: string;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    encryptedPrivateKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    keySalt: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  }
);

export default User;
