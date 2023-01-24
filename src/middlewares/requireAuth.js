const express = require("express");
const jwt = require("jsonwebtoken");

const knexdb = require("../db");
const config = require("../../config");
const { tables } = require("../../config");

module.exports =
  (role = [], permission = []) =>
  (req, res, next) => {
    if (
      !req.headers.authorization ||
      req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
      return res.status(401).json({ error: 1, msg: "Unauthorized access" });
    }

    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, config.apiSecrect, async (err, payload) => {
      if (err) {
        return res.status(401).json({ error: 1, msg: "Unauthorized access" });
      }

      const { id } = payload;
      try {
        let results = await knexdb
          .select("*")
          .from(tables.user)
          .where("user_id", id)
          .where("is_delete", 0)
          .where("is_user_active", 1);
        if (results.length === 0) {
          return res.status(401).json({ error: 1, msg: "User not found" });
        }
        req.user = results[0];
        next();
      } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 1, msg: "Something went wrong" });
      }
    });
  };
