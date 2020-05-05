const Genre = require('../models/genre');
const Book =require("../models/book");
const async = require("async");
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// 显示完整的类型列表
exports.genre_list = (req, res,next) => { 
	Genre.find()
	.exec(function(err, list_genres){
		if(err){return next(err);}
		res.render("genre_list", {title:"类型列表", genre_list: list_genres});
		
	});
};

// 为每位类型显示详细信息的页面
exports.genre_detail = (req, res,next) => {     async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id)
              .exec(callback);
        },//返回genre文档

        genre_books: function(callback) {
          Book.find({ 'genre': req.params.id })
          .exec(callback);
        },//范围genre下的所有书籍

    }, function(err, results) {
        if (err) { return next(err); }
        if (results.genre==null) { // No results.
            var err = new Error('未找到该类型');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        res.render('genre_detail', { title: '类型详情', genre: results.genre, genre_books: results.genre_books } );
    });

};

// 由 GET 显示创建类型的表单
exports.genre_create_get = (req, res, next) => { res.render("genre_form", {title:"创建类型"}); };

// 由 POST 处理类型创建操作
exports.genre_create_post =  [
			
    //验证名称字段不为空。
	body('name', '需要填入类型名称').trim().isLength({min:1}),
    
    // 清理sanitize（修剪并转义escape）名称字段。
  sanitizeBody('name').trim().escape(),

    // 验证和消毒后处理请求。
    (req, res, next) => {
       //前面的中间件已经验证并清理了请求，这时候可以从请求中提取验证错误。
        const errors = validationResult(req);

        // 根据post要求，使用转义和修剪的数据创建一个类型对象。
        var genre = new Genre(
          { name: req.body.name }
        );


        if (!errors.isEmpty()) {
            // 如果errors不为空，则有错误。再次使用清理后的对象/错误消息呈现表单
            res.render('genre_form', { title: '创建类型', genre: genre, errors: errors.array()});
        return;
        }
        else {
            // 表格中的数据有效
            // 检查是否已经存在同名类型
            Genre.findOne({ 'name': req.body.name })
                .exec( function(err, found_genre) {
                     if (err) { return next(err); }

                     if (found_genre) {
                         //类型已经存在，请重定向到其详细信息页面。
                         res.redirect(found_genre.url);
                     }
                     else {

                         genre.save(function (err) {
                           if (err) { return next(err); }
                           // 保存类型。重定向到流派详细信息页面。

                           res.redirect(genre.url);
                         });

                     }

                 });
        }
    }
];

// 由 GET 显示删除类型的表单
exports.genre_delete_get = (req, res,next) => { 
    async.parallel({
        genre: function(callback){
            Genre.findById(req.params.id).exec(callback);
        },
        genre_books: function(callback){
            Book.find({"genre":req.params.id}).exec(callback)
        }
    }, function(err, results){
        if(err){return next(err);}
        res.render("genre_delete", {title:"删除类型", genre:results.genre, genre_books:results.genre_books})
    })
 };

// 由 POST 处理类型删除操作
exports.genre_delete_post = (req, res, next) => { 
    async.parallel(
        {genre: function(callback){
            Genre.findById(req.body.genreid).exec(callback);
        },
        genre_books: function(callback){
            Book.find({"genre": req.body.genreid}).exec(callback);
        }}, function(err, results){
            if(err){return next(err)}
            if(results.genre_books.length > 0){
                res.render("genre.delete",{title:"删除类型", genre:results.genre, genre_books:results.genre_books})
            }
            Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err){
                if(err){return next(err)}
                res.redirect("/catalog/genres")
            })
        }
    )
 };

// 由 GET 显示更新类型的表单
exports.genre_update_get = (req, res, next) => { 
    Genre.findById(req.params.id).exec(function(err, results){
        if(err){
            return next(err) 
        }
        res.render("genre_form",{
            title:"更新类型",
            genre:results
        })
    })
 };

// 由 POST 处理类型更新操作
exports.genre_update_post = [
    //验证名称字段不为空。
	body('name', '需要填入类型名称').trim().isLength({min:1}),
    
    // 清理sanitize（修剪并转义escape）名称字段。
  sanitizeBody('name').trim().escape(),

    // 验证和消毒后处理请求。
    (req, res, next) => {
       //前面的中间件已经验证并清理了请求，这时候可以从请求中提取验证错误。
        const errors = validationResult(req);

        // 根据post要求，使用转义和修剪的数据创建一个类型对象。
        var genre = new Genre(
          { name: req.body.name,
            _id: req.params.id }
        );


        if (!errors.isEmpty()) {
            // 如果errors不为空，则有错误。再次使用清理后的对象/错误消息呈现表单
            res.render('genre_form', { title: '更新类型', genre: genre, errors: errors.array()});
        return;
        }
        else {
            // 表格中的数据有效
            // 检查是否已经存在同名类型
            Genre.findOne({ 'name': req.body.name })
                .exec( function(err, found_genre) {
                     if (err) { return next(err); }

                     if (found_genre) {
                         //类型已经存在，请重定向到其详细信息页面。
                         res.redirect(found_genre.url);
                     }
                     else {

                         Genre.findByIdAndUpdate(req.params.id, genre, {}, function (err, thegenre) {
                           if (err) { return next(err); }
                           // 保存类型。重定向到流派详细信息页面。

                           res.redirect(thegenre.url);
                         });

                     }

                 });
        }
    }
] 