require('dotenv').config();

const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const express      = require('express');
const favicon      = require('serve-favicon');
const hbs          = require('hbs');
const mongoose     = require('mongoose');
const logger       = require('morgan');
const path         = require('path');

const User         = require('./models/User');

const session = require("express-session");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const flash = require("connect-flash");

const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;


mongoose.Promise = Promise;
mongoose
  .connect(process.env.MONGODB_URI, {useMongoClient: true})
  .then(() => {
    console.log('Connected to Mongo!')
  }).catch(err => {
    console.error('Error connecting to mongo', err)
  });

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express View engine setup

app.use(require('node-sass-middleware')({
  src:  path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  sourceMap: true
}));
      

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));





// default value for title local
app.locals.title = 'Express - Generated with IronGenerator';


app.use(session({
  secret: "shhhhh-super-secret",
  resave: true,
  saveUninitialized: true
}));







passport.serializeUser((user, cb) => {
  cb(null, user._id);
});

passport.deserializeUser((id, cb) => {
  User.findById(id, (err, user) => {
    if (err) { return cb(err); }
    cb(null, user);
  });
});



app.use(flash());

// with passport you dont get to choose it looks for req.body.username 
// and req.body.password
// choose your name="" in the hbs file accordingly
passport.use(new LocalStrategy((username, password, next) => {
  User.findOne({ username }, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(null, false, { message: "Sorry we couldn't find that username" });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return next(null, false, { message: "Password not correct for that username" });
    }

    return next(null, user);
  });
}));







passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLEID,
  clientSecret: process.env.GOOGLESECRET,
  callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  User.findOne({ googleID: profile.id })
  .then(user => {


 
    if (user) {
      return done(null, user);
    } else{
      // this else means we did not find a user with this googleID 

      User.findOne({email: profile._json.email})
      .then((userWithThatName)=>{

        if(userWithThatName){
          userWithThatName.googleID = profile.id
          userWithThatName.save()
          .then((updatedUser)=>{
            done(null, updatedUser)
          })
          .catch((err)=>{
            next(err);
          })

        } else {
          // this else means theres nobody with that google id or with that name

          const newUser = new User({
            googleID: profile.id,
            email: profile._json.email
          });
      
          newUser.save()
          .then(user => {
            done(null, newUser);
          })
          .catch(error => {
            next(error)
          })


        }

      })
      .catch((err)=>{
        next(err);
      })


    


    }





  })
  .catch(error => {
    next(error)
  })
  

}));





app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.msg         = req.flash('error')
  next();
});






const index = require('./routes/index');
app.use('/', index);


const userRoutes = require('./routes/user-routes');
app.use('/', userRoutes);

const postRoutes = require('./routes/blog-post-routes');
app.use('/', postRoutes)


module.exports = app;
