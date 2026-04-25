import User from '../src/models/User';
import sequelize from '../src/config/db';

const check = async () => {
  try {
    await sequelize.authenticate();
    const all = await User.findAll();
    console.log(`Total users: ${all.length}`);
    all.forEach(u => {
      console.log(`Username: "${u.username}", EmployeeId: "${u.employeeId}"`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

check();
