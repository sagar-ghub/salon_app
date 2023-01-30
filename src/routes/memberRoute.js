const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const knexdb = require("../db/index");
const {
  apiSecrect,
  tables,
  userRole,
  webTokenExpires,
  otpTokenExpires,
} = require("../../config");
const { generateOtp, sanatizeMemberData } = require("../util");
const requireAuth = require("../middlewares/requireAuth");
const requireOtpAuth = require("../middlewares/requireOtpAuth");

const router = express.Router();

router.get("/", requireAuth(), (req, res) => {
  const user = req.user;
  // console.log(user);
  return res
    .status(200)
    .json({ error: 0, msg: "success", user: sanatizeMemberData(user) });
});

// router.post(
//   "/signin",
//   body("username").not().isEmpty().trim().escape().isAlphanumeric(),
//   body("password").isLength({ min: 6 }),
//   async (req, res) => {
//     const validationErrors = validationResult(req);

//     if (!validationErrors.isEmpty()) {
//       return res.status(422).json({
//         status: 422,
//         error: 1,
//         msg: "Please enter valid username and password",
//       });
//     }

//     const { mobile } = req.body;
//     try {
//       let results = await knexdb
//         .select("*", knexdb.raw("INET6_NTOA(last_ip) as last_ip_address"))
//         .from(tables.user)
//         .where("member_no", username)
//         .where("member_active", 1);
//       if (results.length !== 1) {
//         return res
//           .status(400)
//           .json({ status: 400, error: 1, msg: "invalid credentials" });
//       }

//       results[0] = formatUserData(results[0]);
//     } catch (error) {
//       console.log(error);
//       return res
//         .status(500)
//         .json({ status: 500, error: 1, msg: "internal server error" });
//     }
//   }
// );

router.post(
  "/requestotp",
  body("phone")
    .not()
    .isEmpty()
    .isLength({
      min: 10,
      max: 10,
    })
    .trim()
    .escape()
    .isMobilePhone(),
  async (req, res) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        error: 1,
        msg: "Please enter valid mobile number",
      });
    }
    const { phone } = req.body;
    try {
      let results = await knexdb
        .select("*")
        .from(tables.user)
        .where("user_phone", phone);

      if (results.length !== 1) {
        return res
          .status(400)
          .json({ status: 400, error: 1, msg: "User is not registered" });
      }

      let otp = generateOtp();
      let otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);
      let user = results[0];

      let token = jwt.sign({ otp: otp, type: "otp" }, apiSecrect, {
        expiresIn: otpTokenExpires,
        algorithm: "HS256",
      });

      await knexdb(tables.user)
        .where("user_phone", phone)
        .update({ user_otp: otp });

      //Send otp to user via sms

      return res
        .status(200)
        .json({ status: 200, error: 0, msg: "success", otp, token });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ status: 500, error: 1, msg: "internal server error" });
    }
  }
);

router.post(
  "/verifyotp",
  requireOtpAuth(),
  body("phone")
    .not()
    .isEmpty()
    .isLength({
      min: 10,
      max: 10,
    })
    .trim()

    .isMobilePhone(),
  body("otp")
    .not()
    .isEmpty()
    .isLength({
      min: 4,
      max: 4,
    })
    .trim(),

  async (req, res) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        error: 1,
        msg: "Please enter valid mobile number",
      });
    }
    const { phone, otp } = req.body;

    try {
      let results = await knexdb
        .select("*")
        .from(tables.user)
        .where("user_phone", phone);

      if (results.length !== 1) {
        return res
          .status(400)
          .json({ status: 400, msg: "User is not registered" });
      }

      let user = results[0];
      if (user.user_otp != otp) {
        return res.status(400).json({ status: 400, msg: "Invalid OTP" });
      }

      // if (user.user_otp_expiry < new Date()) {
      //   return res.status(400).json({ error: 1, msg: "OTP expired" });
      // }

      let token = jwt.sign({ id: user.user_id }, apiSecrect, {
        expiresIn: webTokenExpires,
        algorithm: "HS256",
      });
      await knexdb(tables.user).where("user_id", user.user_id).update({
        api_token: token,
        updated_by: user.user_id,
        updated_at: new Date(),
      });

      return res.status(200).json({
        status: 200,
        msg: "success",
        token,
        user: sanatizeMemberData(user),
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ status: 500, msg: "internal server error" });
    }
  }
);

router.post(
  "/signup",
  body("name").not().isEmpty().trim().escape(),
  body("state").not().isEmpty().trim().escape(),
  body("city").not().isEmpty().trim().escape(),
  body("pincode").not().isEmpty().isNumeric().isLength({ min: 6, max: 6 }),
  body("phone").not().isEmpty().trim().escape().isMobilePhone(),

  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        msg: "err",
        validationErrors: validationErrors.array({ onlyFirstError: true }),
      });
    }
    const { name, phone, dob, state, gender, city, pincode } = req.body;
    try {
      let results = await knexdb
        .select("*")
        .from(tables.user)
        .where("user_phone", phone);

      if (results.length !== 0) {
        return res
          .status(400)
          .json({ error: 1, msg: "Mobile number already exists" });
      }
      console.log(phone);
      let api_token = "";
      let userDetails = await knexdb(tables.user).insert({
        user_name: name,
        user_phone: phone,
        user_state: state,
        user_gender: gender,
        user_city: city,
        user_pincode: pincode,
        user_dob: dob,
        user_type: userRole.customer,
        user_otp: generateOtp(),
      });

      api_token = jwt.sign({ userId: userDetails[0] }, apiSecrect, {
        algorithm: "HS256",
      });
      await knexdb(tables.user).where("user_id", userDetails[0]).update({
        api_token: api_token,
        created_by: userDetails[0],
        updated_by: userDetails[0],
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res
        .status(201)
        .json({ status: 201, msg: "successfully registered" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);

//Create services for a SALON

router.post(
  "/createservice",
  requireAuth(),
  body("name").not().isEmpty().trim().escape(),
  body("description").not().isEmpty().trim().escape(),
  body("price").not().isEmpty().trim().escape(),
  body("duration").not().isEmpty().trim().escape(),
  body("category").not().isEmpty().trim().escape(),
  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        error: 1,
        msg: "err",
        validationErrors: validationErrors.array({ onlyFirstError: true }),
      });
    }
    const { name, description, price, duration, category } = req.body;
    try {
      let results = await knexdb
        .select("*")
        .from(tables.services)
        .where("service_name", name);

      if (results.length !== 0) {
        return res
          .status(400)
          .json({ error: 1, msg: "Service name already exists" });
      }
      let serviceObj = {
        service_name: name,
        user_id: req.user.user_id,
        service_description: description,
        service_price: price,
        service_duration: duration,
        service_category: category,
        created_by: req.user.user_id,
      };
      let serviceDetails = await knexdb(tables.service).insert(serviceObj);

      return res.status(201).json({ error: 0, msg: "successfully created" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 1, msg: "Try again later" });
    }
  }
);

module.exports = router;
