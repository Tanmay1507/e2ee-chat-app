import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize('sqlite::memory:', { logging: console.log });

const User = sequelize.define('User', {
  username: DataTypes.STRING,
  publicKey: DataTypes.TEXT
});

async function test() {
  await sequelize.sync();
  
  const user = await User.create({ username: 'test', publicKey: 'abc' });
  console.log("--- First save ---");
  user.publicKey = 'abc';
  await user.save(); // Should NOT run UPDATE
  
  console.log("--- Second save ---");
  user.publicKey = 'def';
  await user.save(); // Should run UPDATE

  console.log("--- Third save ---");
  user.publicKey = 'def ';
  await user.save(); // Should run UPDATE
}

test();
