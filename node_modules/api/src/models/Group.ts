import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Group extends Model {
  public id!: string;
  public name!: string;
  public description!: string | null;
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
    description: {
      type: DataTypes.STRING,
      allowNull: true,
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
