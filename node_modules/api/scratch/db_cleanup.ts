import User from '../src/models/User';
import Message from '../src/models/Message';
import sequelize from '../src/config/db';

const cleanup = async () => {
  try {
    await sequelize.authenticate();
    console.log('Cleaning up database usernames...');

    // 1. Cleanup Users
    const users = await User.findAll();
    for (const user of users) {
      const trimmed = user.username.trim().toLowerCase();
      if (user.username !== trimmed) {
        console.log(`Updating user: "${user.username}" -> "${trimmed}"`);
        user.username = trimmed;
        await user.save();
      }
    }

    // 2. Cleanup Messages
    const messages = await Message.findAll();
    for (const msg of messages) {
      const trimmedFrom = msg.from.trim().toLowerCase();
      const trimmedTo = msg.to.trim().toLowerCase();
      if (msg.from !== trimmedFrom || msg.to !== trimmedTo) {
        console.log(`Updating message ${msg.id}: from "${msg.from}" -> "${trimmedFrom}", to "${msg.to}" -> "${trimmedTo}"`);
        msg.from = trimmedFrom;
        msg.to = trimmedTo;
        await msg.save();
      }
    }

    console.log('✅ Database cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

cleanup();
