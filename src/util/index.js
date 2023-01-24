const generateOtp = () => {
  let otp = Math.floor(Math.random() * 10000);

  return otp;
};

const sanatizeMemberData = (memberData) => {
  delete memberData.user_otp;
  delete memberData.user_otp_expiry;
  delete memberData.is_delete;
  delete memberData.is_user_active;
  return memberData;
};

module.exports = { generateOtp, sanatizeMemberData };
