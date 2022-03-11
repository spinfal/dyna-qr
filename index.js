const JSONdb = require('simple-json-db');
const QRCode = require('qrcode')
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const helmet = require('helmet');
const app = express();
const config = require('./config.json');
const reg = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)$/;

String.prototype.htmlEscape = function () {
  return ('' + this).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
};

// Route Middlewares
app.use(helmet());
app.use(express.static('public')); // serve static files
app.use(cors());
app.options('https://dynaqr.clit.repl.co', cors());
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.ms, // 2 minutes (120000) is the default
  max: config.rateLimit.maxRequests,
  message: config.rateLimit.errorMessage
});

/*
// Handle 404
app.use((req, res) => {
  res.sendFile(__dirname + '/public/404.html', 404);
});
*/

app.use("/api/", apiLimiter);

app.post('/api/account/register', (req, res) => {
  if (req.headers['content-type'] !== 'application/x-www-form-urlencoded; charset=utf-8') return res.status(400).send('Invalid Content-Type');

  if (req.query.username && req.query.password) {
    const un = req.query.username.htmlEscape();
    const pw = req.query.password.htmlEscape();

    if (!/^[a-z0-9_-]{3,15}$/.test(un)) return res.status(400).send('Invalid Username');

    // check if username is taken
    const usernameDB = new JSONdb(`data/usernames.json`);
    if (usernameDB.has(un)) return res.sendStatus(409);

    const uuid = uuidv4();
    const db = new JSONdb(`data/${uuid}.json`);
    
    db.set('username', un);
    db.set('password', pw);
    
    usernameDB.set(un, uuid);
    return res.status(200).send(uuid);
  }
});

app.post('/api/account/login', (req, res) => {
  if (req.headers['content-type'] !== 'application/x-www-form-urlencoded; charset=utf-8') return res.status(400).send('Invalid Content-Type');

  if (req.query.username && req.query.uuid) {
    const db = new JSONdb(`data/${req.query.uuid}.json`);

    if (db.get('username') === req.query.username) {
      return res.sendStatus(204);
    } else {
      return res.sendStatus(401);
    }
  }
});

app.get('/api/account/details', (req, res) => {
  const userPath = `data/${req.headers.uuid.replace(/\//g, '\\\\')}.json`;
  fs.stat(userPath, function(err) {
    if (err == null) {
      const db = new JSONdb(userPath);
      return res.status(200).send(JSON.stringify(db.JSON()));
    } else if (err.code === 'ENOENT') {
      return res.status(401).send('Either that account does not exist or you have provided an invalid UUID.');
    } else {
      console.log('[ERROR]: ' + err.code);
      return res.sendStatus(500);
    }
  });
});

app.get('/api/account/destination', (req, res) => {
  if (!req.query.id) return res.status(400).send('No destination ID provided.');
  const dataPath = `data/urls.json`;
  fs.stat(dataPath, function(err) {
    if (err == null) {
      const urls = new JSONdb(dataPath);
      if (urls.has(req.query.id)) {
        switch (req.query.redirect) {
          case 'true':
            console.log(urls.get(req.query.id));
            res.redirect(urls.get(req.query.id));
            break;
          default:
            res.status(200).send(`http://${config.domain}/api/account/destination?id=${req.query.id}&redirect=true`);
            break;
        }
      } else {
        return res.status(404).send('No destination with that ID exists.');
      }
    } else {
      console.log('[ERROR]: ' + err.code);
      return res.sendStatus(500);
    }
  });
});

app.get('/api/account/qrcode', (req, res) => {
  if (!req.query.content) return res.status(400).send('No QR code content provided.');

  const content = req.query.content.htmlEscape();
  
  if (!reg.test(content)) {
      return res.status(400).send('You need to provide a valid URL.');
  }
  const dataPath = `data/urls.json`;
  const userPath = `data/${req.headers.uuid.replace(/\//g, '\\\\')}.json`;
  fs.stat(userPath, function(err) {
    if (err == null) {
      const urls = new JSONdb(dataPath);
      const db = new JSONdb(userPath);
      if (db.has('qrcode')) {
        return res.status(409).send(db.get('qrcode'));
      } else {
        const ID = Math.floor(+new Date() / 100);
        urls.set(ID, content);
        db.set(ID, content);
        db.set('redirectID', ID);
        QRCode.toDataURL(`https://${config.domain}/api/account/destination?id=${ID}&redirect=true`, config.qrOptions, function (qrErr, url) {
          if (qrErr) return res.status(500).send(qrErr);
          db.set('qrcode', url.htmlEscape());
          return res.status(200).send(url.htmlEscape());
        });
      }
    } else if (err.code === 'ENOENT') {
      return res.status(401).send('Unable to generate QR code as you are either not logged in or you have provided an invalid UUID.');
    } else {
      console.log('[ERROR]: ' + err.code);
      return res.sendStatus(500);
    }
  });
});

app.patch('/api/account/qrcode', express.json(), (req, res) => {
  if (!req.body.destination) return res.status(400).send('No QR code content provided.');

  const destination = req.body.destination.htmlEscape();

  if (!reg.test(destination)) {
      return res.status(400).send('You need to provide a valid URL.');
  }
  const dataPath = `data/urls.json`;
  const userPath = `data/${req.headers.uuid.replace(/\//g, '\\\\')}.json`;
  fs.stat(userPath, function(err) {
    if (err == null) {
      const urls = new JSONdb(dataPath);
      const db = new JSONdb(userPath);
      if (db.has('redirectID')) {
        const ID = db.get('redirectID');
        db.set(ID, destination);
        urls.set(ID, destination);
        return res.sendStatus(204);
      } else if (!db.has('redirectID')) {
        return res.status(404).send('You do not have a destination set yet.');
      } else {
        return res.sendStatus(500);
      }
    } else if (err.code === 'ENOENT') {
      return res.status(401).send('Unable to edit the QR code destination as you are either not logged in or you have provided an invalid UUID.');
    } else {
      console.log('[ERROR]: ' + err.code);
      return res.sendStatus(500);
    }
  });
});

app.delete('/api/account/qrcode', (req, res) => {
  const dataPath = `data/urls.json`;
  const userPath = `data/${req.headers.uuid.replace(/\//g, '\\\\')}.json`;
  fs.stat(userPath, function(err) {
    if (err == null) {
      const urls = new JSONdb(dataPath);
      const db = new JSONdb(userPath);
      if (db.has('qrcode')) {
        db.delete('qrcode');
        urls.delete(db.get('redirectID'));
        db.delete(db.get('redirectID'));
        db.delete('redirectID');
        return res.sendStatus(204);
      } else {
        return res.sendStatus(404);
      }
    } else if (err.code === 'ENOENT') {
      return res.status(401).send('Unable to complete request as you are either not logged in or you have provided an invalid UUID.');
    } else {
      console.log('[ERROR]: ' + err.code);
      return res.sendStatus(500);
    }
  });
});

app.listen(config.port, () => {
  console.log('Server is running on port ' + config.port);
});