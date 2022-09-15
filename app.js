const Koa = require('koa');
const Router = require('koa-router');
const send = require('koa-send');
const serve = require('koa-static');
const logger = require('koa-logger');
const session = require('koa-session');
const path = require('path');
require('dotenv').config();

const app = new Koa();
const router = new Router();

// Session Config
const CONFIG = {
  key: 'copilot.sess' /** (string) cookie key (default is koa.sess) */,
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 86400000,
  autoCommit: true /** (boolean) automatically commit headers (default true) */,
  overwrite: true /** (boolean) can overwrite or not (default true) */,
  httpOnly: true /** (boolean) httpOnly or not (default true) */,
  signed: true /** (boolean) signed or not (default true) */,
  rolling: false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */,
  renew: false /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
  secure: false /** (boolean) secure cookie*/,
  sameSite:
    null /** (string) session cookie sameSite options (default null, don't set it) */,
};

// Using the session
app.keys = [process.env.SECRET];
app.use(session(CONFIG, app));

// Sqlite3 Database
// Zac wrote this btw (delete if you want idc)
const sqlite3 = require('sqlite3');

// Creates Database if not exists
function createDatabase() {
  db = new sqlite3.Database('copilot.db', (err) => {
    if (err) {
      console.log('Getting error ' + err);
      exit(1);
    }
    createTables(db);
  });
}

// Creating tables in the database
function createTables(newdb) {
  newdb.exec(`
    CREATE TABLE IF NOT EXISTS userdata (
      id int not null,
      assignments text not null,
      tests text not null,
      projects text not null,
      importantdates text not null
    );
  `);

  newdb.exec(`
      CREATE TABLE IF NOT EXISTS user (
        id int not null,
        username text not null,
        password text not null
      )
  `);
}

var db;

db = new sqlite3.Database('./copilot.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err && err.code == 'SQLITE_CANTOPEN') {
    createDatabase();
    return;
  } else if (err) {
    console.log('Getting error ' + err);
    exit(1);
  }
});

console.clear();
console.log('Running scripts...');

app.use(logger());

router.get('/', async (ctx) => {
  await send(ctx, './views/index.html');
});

router.get('/about', async (ctx) => {
  await send(ctx, './views/about.html');
});

router.get('/login', async (ctx) => {
  await send(ctx, './views/login.html');
});

router.get('/signup', async (ctx) => {
  await send(ctx, './views/signup.html');
});

var data;

function set(toset) {
  data = toset;
}

router.get('/api/user', async (ctx) => {
  await send(ctx, "./views/blank.html"); 
  if (ctx.session) {
    if (ctx.session.username && ctx.session.password) {
      db.get("select * from user where username=? AND password=?", [ctx.session.username, ctx.session.password], (err, row) => {
        if (err) {
          return;
        }
    
        var id = row.id;

        db.get(
          'select * from userdata where id=?',
          [id],
          (error, userdata) => {
            if (error) {
              return;
            }

            if (!userdata) {
              return;
            }

            set(userdata);
          }
        );
      })
    } else {
      await send(ctx, './views/usernotloggedin.html');
      return;
    }
  } else {
    await send(ctx, './views/usernotloggedin.html');
    return;
  }

  ctx.redirect('/api/result');
});

router.get('/api/result', async (ctx) => {
  await send(ctx, './views/blank.html')
  ctx.body = JSON.stringify(data);
})

app.use(router.routes());
app.use(serve(path.join(__dirname, '/public')));

app.use(async (ctx) => {
  if (ctx.status != 404) return;
  await send(ctx, './views/error.html');
});

app.listen(3000);
console.log('Server running on port 3000\n');
