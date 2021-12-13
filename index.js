const JSONdb = require('simple-json-db');
const QRCode = require('qrcode')
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const config = require('./config.json');

// Route Middlewares
app.use(helmet());
app.use(express.static('public')); // serve static files
app.use(cors());
app.options('*', cors());

/*
// Handle 404
app.use((req, res) => {
  res.sendFile(__dirname + '/public/404.html', 404);
});
*/

app.post('/api/account/register', (req, res) => {
  if (req.headers['content-type'] !== 'application/x-www-form-urlencoded; charset=utf-8') return res.status(400).send('Invalid Content-Type');

  if (req.query.username && req.query.password) {
    if (!/^[a-z0-9_-]{3,15}$/.test(req.query.username)) return res.status(400).send('Invalid Username');

    // check if username is taken
    const usernameDB = new JSONdb(`data/usernames.json`);
    if (usernameDB.has(req.query.username)) return res.sendStatus(409);

    const uuid = uuidv4();
    const db = new JSONdb(`data/${uuid}.json`);
    
    db.set('username', req.query.username);
    db.set('password', req.query.password);
    
    usernameDB.set(req.query.username, uuid);
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
  const userPath = `data/${req.headers.uuid}.json`;
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
        switch (req.query?.redirect) {
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
  const dataPath = `data/urls.json`;
  const userPath = `data/${req.headers.uuid}.json`;
  fs.stat(userPath, function(err) {
    if (err == null) {
      const urls = new JSONdb(dataPath);
      const db = new JSONdb(userPath);
      if (db.has('qrcode')) {
        return res.status(409).send(db.get('qrcode'));
      } else {
        const ID = Math.floor(+new Date() / 100);
        urls.set(ID, req.query.content);
        db.set(ID, req.query.content);
        db.set('redirectID', ID);
        QRCode.toDataURL(`https://${config.domain}/api/account/destination?id=${ID}&redirect=true`, config.qrOptions, function (qrErr, url) {
          if (qrErr) return res.status(500).send(qrErr);
          db.set('qrcode', url);
          return res.status(200).send(url);
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

app.delete('/api/account/qrcode', (req, res) => {
  const dataPath = `data/urls.json`;
  const userPath = `data/${req.headers.uuid}.json`;
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