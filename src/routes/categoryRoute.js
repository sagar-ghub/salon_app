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

router.post(
  "/createcategory",
  requireAuth(),
  body("category_name").not().isEmpty().trim(),
  body("category_description").not().isEmpty().trim(),
  body("category_gender").not().isEmpty().trim().isNumeric({
    min: 1,
    max: 1,
  }),
  async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(422).json({
        status: 422,
        msg: "err",
        validationErrors: validationErrors.array({ onlyFirstError: true }),
      });
    }
    const { category_name, category_description, category_gender } = req.body;
    const { user_id } = req.user;
    const file = req.files?.category_photo;
    try {
      let categoryDetails;
      if (!file) throw new Error("No file found");
      await file.mv(
        "public/images/category/" + file.name,
        async function (err) {
          if (err) {
            console.log(err);
            throw err;
          }

          let categoryObj = {
            category_name,
            category_description,
            category_photo: file.name,
            category_gender,
            created_by: user_id,
          };
          categoryDetails = await knexdb(tables.category).insert(categoryObj);
          return categoryDetails;
        }
      );
      return res.status(201).json({
        status: 201,
        msg: "successfully added",
        data: categoryDetails?.[0],
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ status: 500, msg: "Try again later" });
    }
  }
);

router.get("/", requireAuth(), async (req, res) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      msg: "err",
      validationErrors: validationErrors.array({ onlyFirstError: true }),
    });
  }

  try {
    let results = await knexdb.select("*").from(tables.category);

    if (results.length == 0) {
      return res
        .status(400)
        .json({ error: 1, msg: "No Category exists for given id" });
    }

    return res.status(201).json({
      status: 201,
      msg: "success",
      data: results,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: 500, msg: "Try again later" });
  }
});

module.exports = router;
