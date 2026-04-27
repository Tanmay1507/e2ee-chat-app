
const sequelize = require('./api/src/config/db').default;
const Group = require('./api/src/models/Group').default;
const GroupMember = require('./api/src/models/GroupMember').default;
const GroupMessage = require('./api/src/models/GroupMessage').default;

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Connected');
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('Tables:', tables);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
