import User from '../api/src/models/User';

async function check() {
  try {
    const users = await User.findAll();
    const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
    console.log('Departments found:', departments);
    
    for (const dept of departments) {
      const deptUsers = users.filter(u => u.department === dept).map(u => u.username);
      console.log(`Department: ${dept}, Users: ${deptUsers.join(', ')}`);
    }
  } catch (err) {
    console.error(err);
  }
}

check();
