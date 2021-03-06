const CONSTANTS = require("../config/constants");
const SECRETS = require("../secret");
const bodyParser = require('body-parser');
const manager = require("../helpers/manager");

module.exports = function(app, db) {
    
    /**
     * Log into server
     * 
     * Method: POST
     * 
     * res {
     *      error
     *      status
     * }
     */
    app.post(CONSTANTS.ROUTES.LOGIN, bodyParser.urlencoded({ extended: true }), function(req, res, next) {
        let email = req.body.email;
        let password = req.body.password;
        manager.findUserByEmail(db, email, function(err, user) {
            // internal error
            if (err) manager.handleError(err, res); 
            else {
                // user not found
                if (!user) {
                    console.log("User not found");
                    res.status(404).json({ error: "User not found" });
                }
                // password incorrect
                else if (user.password !== password) {
                    res.status(401).json({
                        error: "Password incorrect",
                        user: ""
                    });
                // all good
                } else {
                    res.status(200).json({
                        error: "",
                        user: user
                    });
                }
            }
        });
    });

    /**
     * Register new user
     * 
     * Method: POST
     * 
     * res {
     *      error
     *      status
     * }
     */
    app.post(CONSTANTS.ROUTES.REGISTER, bodyParser.urlencoded({ extended: true }), function(req, res, next) {
        let email = req.body.email;
        let password = req.body.password;
        manager.findUserByEmail(db, email, function(err, user) {
            // internal error
            if (err) manager.handleError(err, res);
            else {
                // user exists
                if (user) {
                    console.log("User exists");
                    res.status(403).json({ error: "User already exists" });
                } else {
                    manager.createUser(db, email, password, function(err, createdUser) {
                        if (err) manager.handleError(err, res);
                        else {
                            if (!createdUser) {
                                res.status(500).json({ error: "Unknown error" });
                            } else {
                                manager.sendVerificationEmail(createdUser, null);
                                res.status(200).json({
                                    error: "",
                                    user: createdUser
                                });
                            }
                        }
                    });
                }
            }
        });
    });

    /**
     * Synchronize user
     * 
     * Method: GET
     * 
     * res {
     *      email
     *      verified
     * }
     */
    app.get(CONSTANTS.ROUTES.SYNC_USER, function(req, res, next) {
        let email = req.query.email;
        let password = req.query.password;
        manager.findUserByEmail(db, email, function(err, user) {
            // internal error
            if (err) manager.handleError(err, res);
            else {
                // user exists
                if (!user) {
                    console.log("User exists");
                    res.status(404).json({ error: "User not found" });
                } else if (user.password !== password) {
                    console.log("Wrong password");
                    res.status(401).json({ error: "Password incorrect" });
                } else {
                    res.status(200).json({
                        email: email,
                        verified: user.verified
                    });
                }
            }
        });
    });

    /**
     * Change password
     * 
     * Method: POST
     * 
     * res {
     *      error
     * }
     */
    app.post(CONSTANTS.ROUTES.CHANGE_PASSWORD, bodyParser.urlencoded({ extended: true }), function(req, res, next) {
        let email = req.body.email;
        let oldPassword = req.body.oldPassword;
        let newPassword = req.body.newPassword;

        manager.findUserByEmail(db, email, function(err, user) {
            // internal error
            if (err) manager.handleError(err, res);
            else {
                // user doesn't exist
                if (!user) {
                    console.log("User not found");
                    res.status(404).json({ error: "User not found" });
                } else if (user.password !== oldPassword) {
                    console.log("Wrong old password");
                    res.status(401).json({ error: "Password incorrect" });
                } else {
                    db.collection(CONSTANTS.COLLECTION.USER).updateOne({
                        email: email
                    }, {
                        $set: { password: newPassword }
                    }, function(err, result) {
                        if (err) manager.handleError(err, res);
                        else res.status(200).json({ error: "" });
                    });
                }
            }
        });
    });

    /**
     * (Re-)Send verification email
     * 
     * Method: POST
     * 
     * res {
     *      error || message
     * }
     */
    app.post(CONSTANTS.ROUTES.SEND, bodyParser.urlencoded({ extended: true }), function(req, res, next) {
        let email = req.body.email;
        let password = req.body.password;

        manager.findUserByEmail(db, email, function(err, user) {
            // internal error
            if (err) manager.handleError(err, res);
            else {
                // user doesn't exist
                if (!user) {
                    console.log("User not found");
                    res.status(404).json({ error: "User not found" });
                } else if (user.password !== password) {
                    console.log("Wrong password");
                    res.status(401).json({ error: "Password incorrect" });
                } else if (user.verified) {
                    res.status(403).json({ error: "Already verified" });
                } else {
                    manager.sendVerificationEmail(user, res);
                }
            }
        });
    });

    /**
     * Verify email for each individual user
     * 
     * Method: GET
     * 
     * query: {
     *      userId
     * }
     * 
     * res: You have successfully verified your email!
     */
    app.get(CONSTANTS.ROUTES.VERIFY, function(req, res, next) {
        let userId = manager.getObjectId(req.query.userId);
        manager.findUserById(db, userId, function(err, user) {
            // internal error
            if (err) manager.handleError(err, res);
            else {
                // user doesn't exist
                if (!user) {
                    console.log("User not found");
                    res.status(404).send("User not found");
                } else if (user.verified) {
                    res.status(403).send("Already verified");
                } else {
                    db.collection(CONSTANTS.COLLECTION.USER).updateOne({
                        email: user.email
                    }, {
                        $set: { verified: true }
                    }, function(err, result) {
                        if (err) res.status(500).send("Failed to verify user");
                        else res.status(200).send(`Successfully verified ${user.email}`);
                    });
                }
            }
        });
    });

}