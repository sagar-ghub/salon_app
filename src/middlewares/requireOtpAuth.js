const express = require("express");
const jwt = require("jsonwebtoken");

const knexdb = require("../db");
const config = require("../../config");
const { tables } = require("../../config");

module.exports =
  (role = [], permission = []) =>
  (req, res, next) => {
    if (
      // !req.headers.authorization ||
      !req.body.bearerToken
      // req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
      return res.status(401).json({ error: 1, msg: "Unauthorized access" });
    }

    // const token = req.headers.authorization.split(" ")[1];
    const token = req.body.bearerToken;

    jwt.verify(token, config.apiSecrect, async (err, payload) => {
      if (err) {
        return res.status(401).json({ error: 1, msg: "Unauthorized access" });
      }

      //FOR OTP

      const { otp } = payload;
      console.log(otp);
      try {
        if (otp?.toString().length != 4) {
          return res
            .status(401)
            .json({ error: 1, msg: "ENter otp of 4 digits" });
        }

        next();
      } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 1, msg: "Something went wrong" });
      }
    });
  };
