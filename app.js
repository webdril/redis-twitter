const express = require('express');
const app = express();
const path = require('path');
const redis = require('redis');
const client = redis.createClient();
const bcrypt = require('bcrypt');
const session = require('express-session');
const RedisStore = require('connect-redis')(session)




app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))



app.use(express.urlencoded({ extended: true }))

app.use(
    session({
        store: new RedisStore({ client: client }),
        resave: true,
        saveUninitialized: true,
        cookie: {
            maxAge: 36000000, //10 hours, in milliseconds
            httpOnly: false,
            secure: false,
        },
        secret: 'bM80SARMxlq4fiWhulfNSeUFURWgfdsajk',
    })
)






app.get('/', (req, res) => {
    if (req.session.userid) {
        res.render('dashboard')
    }  else {
        res.render("login")
    }
})





// Login/Register endpoint
app.post('/', (req, res) => {
    const { username, password } = req.body

    if (!username || !password) {
        res.render("error", {
            message: "Please set both username and password",
        })
        return
    }

    const saveSessionAndRenderDashboard = userid => {
        req.session.userid = userid
        req.session.save()
        res.render('dashboard')
    }
    
    const handleSignup = (username, password) => {
          // user does not  exist, sign up procedure should start
          client.incr('userid', async (err, userid) => {
            client.hset('users', username, userid)
            const saltRounds = 10
            const hash = await bcrypt.hash(password, saltRounds)
            client.hset(`user:${userid}`, 'hash', hash, 'username', username )
            saveSessionAndRenderDashboard(userid)
        })
    }

    const handleLogin = (userid, password) => {
         // user exists, login procedure
         client.hget(`user:${userid}`, 'hash', async (err, hash) => {
            const result = await bcrypt.compare(password, hash)
            if  (result) {
              //   that is password is ok
              saveSessionAndRenderDashboard(userid)
            }  else {
              //   Wrong password
              res.render('error', {
                  message: 'Incorrect password',
              })
              return
            }
          })
    }


    client.hget('users', username, (err, userid) => {
        if (!userid) {
            handleSignup(username, password)           
        } else {
            // Lgin Procedure
            handleLogin(userid, password)
        }
    })

})
app.listen(3000, () => console.log('Server ready'))