import Message from '../src/models/Message';
import sequelize from '../src/config/db';

const check = async () => {
  try {
    await sequelize.authenticate();
    const count = await Message.count();
    console.log(`Total messages in DB: ${count}`);
    
    const latest = await Message.findAll({
      order: [['timestamp', 'DESC']],
      limit: 5
    });
    
    console.log('Latest 5 messages:');
    latest.forEach(m => {
      console.log(`ID: ${m.id}, From: ${m.from}, To: ${m.to}, Time: ${m.timestamp}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking messages:', error);
    process.exit(1);
  }
};

check();
