const express = require('express')
const mongoose = require('mongoose')
const app = express()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {secret} = require('./config')
const http = require('http').createServer(app);
const io = require('socket.io')(http)
const Schema = mongoose.Schema;

const articleSchema = new Schema({
    name: String,
    message: String,
    status: String,
    date: String,
}, {versionKey: false})

const userSchema = new Schema({
    email: {type: String, unique: true, required: true},
    pass: {type: String, unique: true, required: true}
}, {versionKey: false})

const articles = mongoose.model("Article", articleSchema)
const users = mongoose.model("User", userSchema)

const generateAccessToken = (id, name) => {
    const payload = {
        id,
        name
    }
    return jwt.sign(payload, secret, {expiresIn: "24h"})
}

app.use(express.json())
const PORT = 3000

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
})
connections = [];

io.sockets.on('connection', function (socket) {
    async function getArticles() {
        await articles.find({},
            function (err, articles) {
                if (err) return console.log(err)
                console.log("Loaded", articles)
                io.sockets.emit('post articles', {articles})
            })
    }

    console.log("Connected")
    connections.push(socket)

    socket.on('disconnect', function (data) {
        connections.splice(connections.indexOf(socket), 1)
        console.log("Disconnected")
    })

    socket.on("send newarticle", function (name, message, status, date) {
        try {
            addArticleToDB(name, message, status, date)
        } catch (e) {
            console.log(e)
        }
    });

    socket.on("get articles", function (data) {
        try {
            getArticles()
        } catch (e) {
            console.log(e)
        }
    });

    socket.on("login", function (email, password) {
        try {
            Authorization(email, password)
        } catch (e) {
            console.log(e)
        }
    });

    socket.on("signup", function (email, password) {
        try {
            Registration(email, password)
        } catch (e) {
            console.log(e)
        }
    });

    socket.on("exit", function (data) {
        try {
            Exit()
        } catch (e) {
            console.log(e)
        }
    });

});

async function Exit() {
    io.sockets.emit('delete token')
}

async function Authorization(email, password) {
    try {
        const existUser = await users.findOne({
            email: email
        });
        if (existUser !== null) {
            console.log(existUser.pass)
            const validPassword = await bcrypt.compareSync(password, existUser.pass)
            if (!validPassword) {
                console.log("Passwords are not equal")
            } else {
                let token = await generateAccessToken(existUser._id, email);
                io.sockets.emit('post token', token)
            }
        } else {
            console.log("Incorrect user")
        }
    } catch (e) {
        console.log(e)
    }
}

async function Registration(email, password) {
    try {
        const candidate = await users.findOne({
            email: email
        });
        if (candidate == null) {
            const hashPassword = bcrypt.hashSync(password, 4)
            console.log(hashPassword)
            await users.create({
                    email: email,
                    pass: hashPassword
                },
                async function (err, doc) {
                    if (err) return console.log(err);
                    console.log(doc);
                });
        } else {
        }
    } catch (e) {
        console.log(e)
    }
}

async function addArticleToDB(name, message, status, date) {
    await articles.create({
            name: name,
            message: message,
            status: status,
            date: date
        },
        function (err, doc) {
            if (err) return console.log(err)
            console.log("Article saved", doc)
        })
}

async function start() {
    try {
        await mongoose.connect('mongodb://localhost:27017/websokets',
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false
            }
        )
        http.listen(PORT, () => {
            console.log('Server has been started...')
        })
    } catch (e) {
        console.log(e)
    }
}

start()
