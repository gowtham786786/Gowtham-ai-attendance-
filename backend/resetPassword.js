const { auth } = require('./config/firebase-admin');

async function resetPassword() {
  const email = '2300032792ird@gmail.com';
  const newPassword = '12345678';
  
  try {
    const userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, {
      password: newPassword
    });
    console.log(`Password for ${email} has been successfully reset to: ${newPassword}`);
  } catch (error) {
    console.error('Error resetting password:', error);
  }
}

resetPassword();
