const db = require("../models");
const User = db.user;
const Role = db.role;
const nodemailer = require("../config/email.config");

let jwt = require("jsonwebtoken");
let bcrypt = require("bcryptjs");

exports.signup = (req, res) => {
  const user = new User({
    fullname: req.body.fullname,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8),
    phone_number: req.body.phone_number,
  });

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (req.body.roles) {
      Role.find(
        {
          name: { $in: req.body.roles },
        },
        (err, roles) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }

          user.roles = roles.map((role) => role._id);
          user.save((err) => {
            if (err) {
              res.status(500).send({ message: err });
              return;
            }

            res.send({ message: "User was registered successfully!" });
          });
          nodemailer.sendConfirmationEmail(
            user.fullname,
            user.email);
        }
      );
    } else {
      Role.findOne({ name: "user" }, (err, role) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        user.roles = [role._id];
        user.save((err) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }

        res.send({ user, message: "User was registered successfully!" });
        });
        nodemailer.sendConfirmationEmail(
          user.fullname,
          user.email );
      });
    }
  });
};

exports.signin = (req, res) => {
  User.findOne({
    email: req.body.email,
  })
    .populate("roles", "-__v")
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      let passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!",
        });
      }

      let token = jwt.sign({ id: user.id }, process.env.TOKEN_SECRET, {
        expiresIn: 86400, // 24 hours
      });

      let authorities = [];

      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
      }
      res.status(200).send({
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        phone_number: user.phone_number,
        roles: authorities,
        accessToken: token,
      });
    });
};
