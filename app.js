//导入该应用依赖的库
var createError = require('http-errors');
var express = require('express');
var path = require('path');//导入了一个node自带的库
var cookieParser = require('cookie-parser');
var logger = require('morgan');

//导入路由目录里的模块，这些模块用来处理路由
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var catalogRouter = require('./routes/catalog'); // 导入 catalog 路由
var compression = require('compression');
var helmet = require('helmet');

//利用express模块来创建应用对象
var app = express();

// 设置 Mongoose 连接
const mongoose = require('mongoose');
const mongoDB = 'mongodb+srv://Gary:1165340217@cluster0-ad5bi.mongodb.net/test?retryWrites=true&w=majority';
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;// 让 mongoose 使用全局 Promise 库
const db = mongoose.connection;// 取得默认连接
db.on('error', console.error.bind(console, 'MongoDB 连接错误：'));// 将连接与错误事件绑定（以获得连接错误的提示）

// view engine setup 模板引擎设置
app.set('views', path.join(__dirname, 'views'));//首先设置 'views' 以指定模板的存储文件夹（此处设为子文件夹 /views）
app.set('view engine', 'pug');//设置 'view engine' 以指定模板库（本例中设为 “pug” ）

//将中间件库添加进请求处理链
app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));//使用 express.static 中间件将项目根目录下所有静态文件托管至 /public 目录

//把（之前导入的）路由处理器添加到请求处理链中。
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/catalog', catalogRouter); // 将 catalog 路由添加进中间件链//实际是将users.js指定为"/users"下的响应路由
//app.use("/users/cool", userRouter);

// catch 404 and forward to error handler 捕获 404 并抛给错误处理器
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler错误处理器
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page渲染出错页面
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;//将其添加到 exports 模块（使它可以通过 /bin/www 导入）
