const config = {
  webSecrect: process.env.WEB_SECRECT || "sO4NikHYPufZeQUZtwxfWJrqQg5pyQDM",
  webTokenExpires: parseInt(process.env.WEB_TOKEN_EXPIRES) || 30000,
  otpTokenExpires: process.env.OTP_TOKEN_EXPIRES || "300s",
  saltRounds: 10,
  apiSecrect: process.env.API_SECRECT || "Xn7GjOXy2NYaMGTQoAFTS75wXuXBmA6J",
  db_host: process.env.DB_HOST,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASS,
  db_port: process.env.DB_PORT || "3306",
  db_database: process.env.DB_DATBASE,
  otp_expire_time: 300,
  otp_resend_time: 120,
  business_wallet_id: process.env.BUSINESS_WALLET_ID || "1",
  cash_deposit_charges: parseInt(process.env.CASH_DEPOSIT_CHARGES) || 2,
  email_host: process.env.EMAIL_HOST || "smtp.sendgrid.net",
  email_user: process.env.EMAIL_USER || "",
  email_pass: process.env.EMAIL_PASS || "",
  email_port: 587,
  max_order_reprocess: 4,
  userRole: {
    admin: 1,
    staff: 2,
    customer: 3,
  },
  tables: {
    user: "rck_user",
    service: "rck_service",
    product: "rck_product",
    location: "rck_location",
    shop: "rck_shop",
    customer: "rck_customer",
    category: "rck_category",
    cart: "rck_cart",
  },
  debugLog: true,
  rkitConfig: {
    userid: "12345678",
    token: "123456789",
  },
  justrechargeConfig: {
    mobileNo: "",
    SUID: "",
    SUPD: "",
  },
  tuktukConfig: {
    mobileNo: "",
    APIKey: "",
  },
  non_OP_ID_inludes: [
    "",
    "N/A",
    "NA",
    "MANUAL SUCCESS",
    "AUTO",
    "SUCCESS",
    "SUCESS",
    "SUCCES",
    "REQ TO GET",
    "MSG",
    "UL",
    "-",
    "Fail",
    "Mobile",
    "Transaction Number",
    "&",
    "recharge pending",
    "N/A",
    "Success",
    "DP",
    "req to get",
    "N/A&  N.A",
    "response",
    "status",
    "PENDING",
    "Null",
  ],
};

module.exports = config;
