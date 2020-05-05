const Author = require('../models/author');
const async = require("async");
const Book = require("../models/book");
const{body,validationResult} = require("express-validator/check");
const{sanitizeBody} = require("express-validator/filter");

// 显示完整的作者列表
exports.author_list = function(req, res, next) {

  Author.find()
    .sort([['family_name', 'ascending']])//按照family_name查询并升序排列
    .exec(function (err, list_authors) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('author_list', { title: '作者列表', author_list: list_authors });
    });

};

// 为每位作者显示详细信息的页面
exports.author_detail = (req, res, next) => { 
	async.parallel({
		author: function(callback){
			Author.findById(req.params.id).exec(callback)},
		author_books: function(callback){
			Book.find({"author": req.params.id}, "title summary").exec(callback);//这里是表示我们只想要书籍的名称和简介
		},
		},function(err, results){
		if(err){return next(err);}
		if(results.author == null){
			let err = new Error("未找到作者");
			err.status = 404;
			return next(err);
		}
		res.render("author_detail", {title:(results.author.first_name + "，" +results.author.family_name), author: results.author, author_books: results.author_books});
	});
};

// 由 GET 显示创建作者的表单
exports.author_create_get = (req, res, next) => { 
	res.render("author_form", {title:"创建作者"})
};

// 由 POST 处理作者创建操作
exports.author_create_post = [

    // 验证字段（field）
    body('first_name').trim().isLength({ min: 1 }).withMessage('必须指定名字'),
        //.isAlphanumeric().withMessage('姓氏包含非字母数字字符')
    body('family_name').trim().isLength({ min: 1 }).withMessage('必须指定姓氏。'),
        //.isAlphanumeric().withMessage('名字包含非字母数字字符')
    body('date_of_birth', '无效的出生日期').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', '无效的死亡日期').optional({ checkFalsy: true }).isISO8601(),//optional函数用于可选字段的验证，这里我们接受空值。

    // 清理字段
    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    // 验证和消毒后处理请求。
    (req, res, next) => {

        // 从请求中提取验证错误。
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // 有错误。再次使用已清理的值/错误消息呈现表单。
            res.render('author_form', { title: '创建作者', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // 表格中的数据有效。

            // 用转义和修剪的数据创建一个Author对象。
            var author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                });
            author.save(function (err) {
                if (err) { return next(err); }
                // 成功-重定向到新的作者记录。
                res.redirect(author.url);
            });
        }
    }
];
// 由 GET 显示删除作者的表单
exports.author_delete_get = (req, res, next) => { async.parallel({
        author: function(callback) {
            Author.findById(req.params.id).exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.params.id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.author==null) { // No results.
            res.redirect('/catalog/authors');
        }
        // Successful, so render.
        res.render('author_delete', { title: '删除作者', author: results.author, author_books: results.authors_books } );
    }); };

// 由 POST 处理作者删除操作
exports.author_delete_post = (req, res, next) => {    async.parallel({
        author: function(callback) {
          Author.findById(req.body.authorid).exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.body.authorid }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        // Success
        if (results.authors_books.length > 0) {
            // Author has books. Render in same way as for GET route.
            res.render('author_delete', { title: '删除作者', author: results.author, author_books: results.authors_books } );
            return;
        }
        else {
            // Author has no books. Delete object and redirect to the list of authors.
            Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/authors')
            })
        }
    });};

// 由 GET 显示更新作者的表单
exports.author_update_get = (req, res, next) => { 
        Author.findById(req.params.id).exec(function (err, results){
            if(err){return next(err)}
            res.render("author_form", {title: "更新作者",author: results})
        })
 };

// 由 POST 处理作者更新操作
exports.author_update_post = [
    // 验证字段（field）
    body('first_name').trim().isLength({ min: 1 }).withMessage('必须指定名字'),
        //.isAlphanumeric().withMessage('姓氏包含非字母数字字符')
    body('family_name').trim().isLength({ min: 1 }).withMessage('必须指定姓氏。'),
        //.isAlphanumeric().withMessage('名字包含非字母数字字符')
    body('date_of_birth', '无效的出生日期').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', '无效的死亡日期').optional({ checkFalsy: true }).isISO8601(),//optional函数用于可选字段的验证，这里我们接受空值。

    // 清理字段
    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

     // 验证和消毒后处理请求。
     (req, res, next) => {

        // 从请求中提取验证错误。
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // 有错误。再次使用已清理的值/错误消息呈现表单。这里先判断是否有错误再创建对象，和书籍不太一样
            res.render('author_form', { title: '更新作者', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // 表格中的数据有效。

            // 用转义和修剪的数据创建一个Author对象。
            var author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death,
                    _id: req.params.id
                });
            Author.findByIdAndUpdate(req.params.id , author, {}, function (err, theauthor) {
                if (err) { return next(err); }
                // 成功-重定向到新的作者记录。
                res.redirect(theauthor.url);
            });
        }
    }
    
]