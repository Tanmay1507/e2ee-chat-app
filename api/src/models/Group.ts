import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Group extends Model {
  public id!: string;
  public name!: string;
  public creatorUsername!: string;
}

Group.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    creatorUsername: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Group',
    tableName: 'groups',
  }
);

export default Group;
