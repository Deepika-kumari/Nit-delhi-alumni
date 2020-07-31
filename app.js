const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const mysqlconnection = require('./connection');
const bodyparser = require("body-parser");
const empty = require('is-empty');

var users = []
var students = []

function user_data(req, res, next) {
  mysqlconnection.query("SELECT * FROM account,data where email='" + req.body.email + "' ", (err, rows, fields) => {
    if (err) {
      console.log("*************" + err)
    }
    users=[]
    console.log("fields: " + fields)
    console.log("rows: " + rows.toString())
    const user1 = []
    user1.push(rows)
    console.log("user1: " + user1)
    console.log(empty(rows))
    if (empty(rows)) {
      return next()
    }
    users.push(JSON.parse(JSON.stringify(user1[0][0])))
    console.log("2")
    console.log(users[0])
    console.log("2")
    next()
  })
}

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  // email => {user_data(email);
  //   console.log('return:->'+users[0]+'<-')
  // return users},

  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id),
  // id => mysqlconnection.query("SELECT password FROM account WHERE id='"+ id +"'", (err,result,fields)=>{
  //   return result}),
)

app.set('view-engine', 'ejs')
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: 'secret',//process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkNotAuthenticated, (req, res) => {
  res.render('home.ejs');
})



app.get('/profile', checkAuthenticated, (req, res) => {
  res.render('profile.ejs',{data:users[0]})
})
app.get('/degree', checkNotAuthenticated, (req, res) => {
  res.render('degree.ejs',{message:""})
})
app.post('/degree', checkNotAuthenticated, (req, res) => {
  console.log(req.body.YOP)
  console.log(req.body.degree)
  console.log(req.body.branch)
  mysqlconnection.query("SELECT * FROM account,data where account.id=data.id AND YOP='" + req.body.YOP + "' AND degree='" + req.body.degree + "' AND branch='" + req.body.branch + "' ", (err, rows, fields) => {
    if (err) {
      console.log("*************" + err)
    }
    students=[]
    console.log("fields: " + fields)
    console.log("rows: " + rows.toString())
    const user1 = []
    user1.push(rows)
    console.log("user1: " + user1)
    console.log(empty(rows))
    if (empty(rows)) {
      res.render('degree.ejs',{message:"NO data Found"})
    }else{
    students.push(JSON.parse(JSON.stringify(user1[0])))
    console.log("2")
    console.log(students[0])
    console.log("2")
    res.render('students.ejs',{students:students[0], n:Object.keys(students[0]).length })
    }
  })
})
app.get('/students', checkNotAuthenticated, (req, res) => {
  res.redirect('/degree')
})
app.get('/public-profile', checkNotAuthenticated, (req, res) => {
  res.redirect('/degree')
})
app.get('/gallery', checkNotAuthenticated, (req, res) => {
  res.render('gallery.ejs')
})
app.get('/contact', checkNotAuthenticated, (req, res) => {
  res.render('contact.ejs')
})

app.post('/students', checkNotAuthenticated, (req, res) => {
  var n = req.body.index;
  console.log(n.toString())
  res.render('public-profile.ejs',{students:students[0][n]})
})
app.post('/profile', checkAuthenticated, (req, res) => {
  console.log(req.body.ugdate.substr(0, 10))
  mysqlconnection.query("UPDATE account,data SET email = '" + req.body.email + "', description = '" + req.body.description + "', phone = '" + req.body.phone + "', department = '" + req.body.department + "', career = '" + req.body.career + "', location = '" + req.body.location + "', skills = '" + req.body.skills + "', language = '" + req.body.language + "', ugclg = '" + req.body.ugclg + "', ugdate = '" + req.body.ugdate.substr(0, 10) + "', pgclg = '" + req.body.pgclg + "', pgdate = '" + req.body.pgdate.substr(0, 10) + "', phdclg = '" + req.body.phdclg + "', phddate = '" + req.body.phddate.substr(0, 10) + "', degree = '" + req.body.degree + "', branch = '" + req.body.branch + "', YOP = '" + req.body.YOP + "', resume = '" + req.body.resume + "', pic = '" + req.body.pic + "' WHERE account.id = '"+users[0].id+"' AND account.id=data.id", (err,results) => {
    if (!err) {
      
      res.render('dashboard.ejs', { data:users[0],message: 'DATA Updated Successfully!' })
    }
    else {
      console.log("Error: " + err);
      res.render('profile.ejs', { data:users[0]})
    }
  })
})

app.get('/dashboard', checkAuthenticated, (req, res) => {
  res.render('dashboard.ejs', { data:users[0],message:"" })
})

app.get('/change-pass', checkAuthenticatedPass, (req, res) => {
  res.render('auth-recoverpw2.ejs',{message:""})
})
app.post('/change-pass', checkAuthenticated, async (req, res) => {
  if (req.body.password === req.body.repassword) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
      console.log(hashedPassword);
      mysqlconnection.query("UPDATE account SET password = '" + hashedPassword + "' WHERE email = '"+users[0].email+"'", (err,results) => {
        if (!err) {
          console.log("changed");
          res.render('dashboard.ejs', { data:users[0],message: 'Password Changed Successfully!' })
        }
        else {
          console.log("Error: " + err);
          res.render('auth-recoverpw2.ejs', { message: 'Some Error Occured' })
        }
      })
}});
app.get('/reset-pass', checkNotAuthenticatedPass, (req, res) => {
  res.render('auth-recoverpw.ejs',{message:""})
})
app.post('/reset-pass', checkNotAuthenticated, user_data, (req, res) => {
  const email = req.body.email;
  if (empty(users)){
    console.log("'"+email+"' is not registered")
    res.render('auth-recoverpw.ejs',{message:"'"+email+"' is not registered"})
  }
  else{
    console.log("Password sent to '"+email+"'")
    res.render('auth-recoverpw.ejs',{message:"Password sent to '"+email+"'"})
  }
})
app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('auth-login.ejs')
})
app.post('/login', checkNotAuthenticated, user_data, passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true
}))
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('auth-register.ejs')
})
app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    // users.push({
    //   id: Date.now().toString(),
    //   name: req.body.name,
    //   email: req.body.email,
    //   password: hashedPassword
    // })
    console.log(users);
    //res.redirect('/login')
    mysqlconnection.query("INSERT INTO account VALUES('" + req.body.id + "','" + req.body.name + "','" + req.body.email + "','" + hashedPassword + "');", (err, rows, fields) => {
      if (!err) {
        res.redirect('/login')
      }
      else if (err.toString().startsWith('Error: ER_DUP_ENTRY')) {
        return done(null, false, { message: 'User Already Exists' })
      }
      else {
        console.log("Error: " + err);
        return done(null, false, { message: 'User Already Exists' })
      }
    })
  } catch {
    res.redirect('/register')
  }
})
app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})


function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard')
  }
  next()
}
function checkNotAuthenticatedPass(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/Change-pass')
  }
  next()
}
function checkAuthenticatedPass(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/reset-pass')
}


app.listen(4000, function () {
  console.log("Server started at PORT :4000");
})