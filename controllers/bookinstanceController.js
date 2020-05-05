const Bookinstance = require('../models/bookinstance');
const Book = require("../models/book");
const async = require("async");
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// 显示完整的书籍实例列表
exports.bookinstance_list = function(req, res, next) {

  Bookinstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list', { title: '书籍副本列表', bookinstance_list: list_bookinstances });
    });
    
};

// 为每位书籍实例显示详细信息的页面
exports.bookinstance_detail = (req, res,next) => { 
	async.parallel(
	{bookinstance: function(callback){Bookinstance.findById(req.params.id).populate("book").exec(callback);},
	
		}, function(err, results){
			if(err){return next(err);}
			if(results.bookinstance == null){
				let err = new Error("未找到该书籍副本");
				err.status = 404;
				return next(err);
			}
			res.render("bookinstance_detail", {title: "书籍副本详情", bookinstance: results.bookinstance, book: results.bookinstance.book});
		
	})

};

// 由 GET 显示创建书籍实例的表单
exports.bookinstance_create_get = (req, res,next) => { 
	Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form', {title: '创建书籍副本', book_list:books});
    }); };

// 由 POST 处理书籍实例创建操作
exports.bookinstance_create_post = [

    // Validate fields.
    body('book', '必须选择书籍').trim().isLength({ min: 1 }),
    body('imprint', '必须填写出版信息').trim().isLength({ min: 1 }),
    body('due_back', '无效的日期').optional({ checkFalsy: true }).isISO8601(),
    body("status", "必须选择状态").trim().isLength({min: 1}),
    
    // Sanitize fields.
    sanitizeBody('book').trim().escape(),
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),
    
    // Process request after validation and sanitization.验证和消毒后处理请求
    (req, res, next) => {

        // Extract the validation errors from a request.从请求中提取验证错误。
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.使用转义和修剪的数据创建一个BookInstance对象。
        var bookinstance = new Bookinstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values and error messages.有错误。再次使用清理后的值和错误消息呈现表单。
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: '创建书籍副本', book_list : books, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            bookinstance.save(function (err) {
                if (err) { return next(err); }
                   // Successful - redirect to new record.
                   res.redirect(bookinstance.url);
                });
        }
    }
];

// 由 GET 显示删除书籍实例的表单
exports.bookinstance_delete_get = (req, res,next) => {
  async.parallel(
    {
      bookinstance: function(callback){
        Bookinstance.findById(req.params.id).exec(callback);
      },
      bookinstances_book: function(callback){
        Bookinstance.findById(req.params.id).exec(function(err,result){
          if(err){
            return next(err);}
          let bookinstance = result;
          Book.findById(bookinstance.book).populate("author").exec(callback)
        });
          
    } //这段是我自己瞎编的，为了让副本中可以展示数据信息。
  },function(err, results){
      if(err){return next(err);}
      res.render("bookinstance_delete",{
        title:"删除副本", bookinstance:results.bookinstance, book:results.bookinstances_book
      })
    });
  };

// 由 POST 处理书籍实例删除操作
exports.bookinstance_delete_post = (req, res,next) => { 
  Bookinstance.findByIdAndRemove(req.body.bookinstanceid, function deleteBookInstance(err){
    if(err){return next(err)}
    res.redirect("/catalog/bookinstances");
  });
 };//因为在前端中对已借出书籍进行了判断，所以后端就不判断了，严格来说还是需要后端判断最好

// 由 GET 显示更新书籍实例的表单
exports.bookinstance_update_get = (req, res, next) => {
  
  async.parallel({
    bookinstance: function(callback){
      Bookinstance.findById(req.params.id).populate("book").exec(callback);
    },
    books: function(callback){
      Book.find(callback);
    }
  }, function(err, results){
    if(err){return next(err)}
    if(results.bookinstance == null){
      let err = new Error("未找到该书籍实例");
      err.status = 404;
      return next(err);
    }
    console.log(results.bookinstance);
    res.render("bookinstance_form", {title:"更新书籍副本", bookinstance: results.bookinstance, book_list: results.books, book: results.bookinstance.book});
  });

};

// 由 POST 处理书籍实例更新操作
exports.bookinstance_update_post = [
  //验证字段
  body('book', '必须选择书籍').trim().isLength({ min: 1 }),
    body('imprint', '必须填写出版信息').trim().isLength({ min: 1 }),
    body('due_back', '无效的日期').optional({ checkFalsy: true }).isISO8601(),
    body("status", "必须选择状态").trim().isLength({min: 1}),
  
  //清理字段
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  //处理请求
  (req, res, next) => {
    const errors = validationResult(req);
    
    let bookinstance = new Bookinstance(
      {
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
        _id: req.params.id
      }
    )

    if(!errors.isEmpty()) {
      async.parallel({
        bookinstance: function(callback){
          Bookinstance.findById(req.params.id).populate("book").exec(callback);
        },
        books: function(callback){
          Book.find(callback);
        }
      }, function(err, results){
        if(err){return next(err)}
        if(results.bookinstance == null){
          let err = new Error("未找到该书籍实例");
          err.status = 404;
          return next(err);
        }
        console.log(results.bookinstance);
        res.render("bookinstance_form", {title:"更新书籍副本", bookinstance: results.bookinstance, book_list: results.books, book: results.bookinstance.book});
      })
    } else {
      Bookinstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function(err, thebookinstance){
        if(err){return next(err)}
        res.redirect(thebookinstance.url);
      });
    }
  }
  ]