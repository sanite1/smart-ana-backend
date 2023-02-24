require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// for level 5 encryption
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

// level 6 
const findOrCreate = require("mongoose-findorcreate")

const app = express();

app.use(express.urlencoded({extended: true}));

app.use(express.static("public"));
app.use(express.json())

const corsOption = {
    origin: [
        process.env.FRONTEND_URL
    ],
    // credentials: true,
    optionSuccessStatus: 200
}
app.options("*", cors())

app.use(cors(corsOption))
app.use(cors({methods: ["GET", "POST"]}))

// level 5
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

const url = process.env.MONGOOSE_URL_ATLAS

mongoose.connect(url);

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    phoneNumber: String,
    country: String,
    state: String,
    username: String,
    password: String,
    dateCreated: String,
});

// for level 5 encryption
userSchema.plugin(passportLocalMongoose)

// for level 6 encryption
userSchema.plugin(findOrCreate)

// userSchema.plugin(passportLocalMongoose, {usernameQueryFields: ["username", "email"]})

const User = mongoose.model("User", userSchema);

// for level 5 encryption
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user._id);
    // if you use Model.id as your idAttribute maybe you'd want
    // done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


app.route("/register")
    .get((req, res) => {
        res.status(200).json({success: true, name: "username"})
    })
    .post((req, res) => {
        const { firstName, lastName, username, country, state, password, phoneNumber, dateCreated} = req.body
        User.findOne({username: username}, (err, result) => {
            if(err) {
                res.status(200).json({success: false, err: err, name: req.body.username})
            } else {
                if(result) {
                    res.status(200).json({success: false, exists: true, name: req.body.username})
                } else {
                    User.register(
                        {
                            username: username, 
                            firstName: firstName, 
                            lastName: lastName, 
                            country: country, 
                            state: state,
                            phoneNumber: phoneNumber, 
                            dateCreated: dateCreated,
                        }, 
                        password, 
                        (err, result) => {
                        if(err) {
                            res.status(200).json({success: false, message: err, name: result})
                        } else {
                            User.findOne({username: req.body.username}, (err, result) => {
                                if(err) {
                                    res.status(200).json({success: false, err: err, name: req.body.username})
                                } else {
                                    res.status(200).json({success: true, user: result})
                                }
                            })
                        }
                    })
                }
            }
        })
        
    });


app.route("/login")
    .get((req, res) => {
        res.render("login")
    })
    .post((req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        })
        req.login(user, (err) => {
            if(err) {
                console.log(err);
                res.status(200).json({success: false, err: err})
            } else {
                passport.authenticate("local") (req, res, () => {
                    User.findOne({username: req.body.username}, (err, result) => {
                        if(err) {
                            res.status(200).json({success: false, err: err, name: req.body.username})
                        } else {
                            res.status(200).json({success: true, user: result})
                        }
                    })
                })
                // res.status(200).json({success: false, name: req.body.username})
            }
        })
    });


app.route("/update")
    .get((req, res) => {
        res.render("login")
    })
    .patch((req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        })
        req.login(user, (err) => {
            if(err) {
                console.log(err);
                res.status(200).json({success: false, err: err})
            } else {
                passport.authenticate("local") (req, res, () => {
                    
                    User.updateOne(
                        {username: req.body.username},
                        {
                            username: req.body.username, 
                            firstName: req.body.firstName, 
                            lastName: req.body.lastName, 
                            country: req.body.country, 
                            state: req.body.state,
                            phoneNumber: req.body.phoneNumber, 
                        },
                        (err, result) => {
                            if(err) {
                                res.status(200).json({success: false, err: err, name: req.body.username})
                            } else {
                                User.findOne({username: req.body.username}, (err, result) => {
                                    if(err) {
                                        res.status(200).json({success: false, err: err, name: req.body.username})
                                    } else {
                                        res.status(200).json({success: true, user: result})
                                    }
                                })
                            }
                        }
                    )
                })
                // res.status(200).json({success: false, name: req.body.username})
            }
        })
    });

app.post("/api", (req, res) => {

    User.findOne({username: req.body.username}, (err, result) => {
        if(err) {
            res.status(200).json({success: false, message: err})
        } else {
            if(result) {
                res.status(200).json({success: true, data: result})
            } else {
                const user = new User({
                    username: req.body.username,
                    hitsNum: 0
                })
                user.save((err, result) => {
                    if (err) {
                        res.status(200).json({success: false, message: err})
                    } else {
                        res.status(200).json({success: true, message: result})
                    }
                })
            }
        }
    })
})

app.patch("/api/track", (req, res) => {
    
    const { name, hitsNum } = req.body;
    let hit;
    User.findOne({username: req.body.username}, (err, result) => {
        if(err) {
            console.log(err);
        } else {
            if(result) {
                result.hitsNum = result.hitsNum + hitsNum
                result.save(err => {
                    if (err) {
                        console.log("Could not update...");
                        res.json({success: false, data: err})            
                    } else {
                        res.json({success: true, data: result})
                    }
                })
                
            }
        }
    }) 
})
app.post("/api/delete", (req, res) => {
    
    const { name, hitsNum } = req.body;
    let hit;
    User.findOne({username: req.body.username}, (err, result) => {
        if(err) {
            console.log(err);
        } else {
            if(result) {
                result.hitsNum = result.hitsNum - 3
                result.save(err => {
                    if (err) {
                        console.log("Could not update...");
                        res.json({success: false, data: err})            
                    } else {
                        res.json({success: true, data: result})
                    }
                })
                
            }
        }
    })
})






port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log("Server started on port " + port);
})