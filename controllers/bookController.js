const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");
const {
	body,
	validationResult
} = require('express-validator/check');
const {
	sanitizeBody
} = require('express-validator/filter');

const async = require("async");


//主页控制函数
exports.index = (req, res) => {
	async.parallel({
		book_count: function (callback) {
			Book.count({}, callback); // 传递空对象作为匹配条件以查找此集合的所有文档
		},
		book_instance_count: function (callback) {
			BookInstance.count({}, callback);
		},
		book_instance_available_count: function (callback) {
			BookInstance.count({
				status: '可供借阅'
			}, callback); //计算可借的书籍副本数量
		},
		author_count: function (callback) {
			Author.count({}, callback);
		},
		genre_count: function (callback) {
			Genre.count({}, callback);
		},
	}, function (err, results) {
		res.render('index', {
			title: '本地图书馆主页',
			error: err,
			data: results
		});
	});
}; 
//书籍列表页控制函数
exports.book_list = function (req, res, next) {

	Book.find({}, 'title author')
		.populate('author')
		.exec(function (err, list_books) {
			if (err) {
				return next(err);
			}
			//Successful, so render
			res.render('book_list', {
				title: '书籍列表',
				book_list: list_books
			});
		});

}; 

//书籍详情控制函数
exports.book_detail = (req, res, next) => {
	async.parallel({
		book: function (callback) {
			Book.findById(req.params.id)
				.populate('author')
				.populate('genre')
				.exec(callback);
		}, //书籍信息
		book_instance: function (callback) {
			BookInstance.find({
					'book': req.params.id
				})
				.exec(callback);
		}, //书籍副本
	}, function (err, results) {
		if (err) {
			return next(err);
		}
		if (results.book == null) { // No results.
			var err = new Error("未找到该书籍");
			err.status = 404;
			return next(err);
		}
		// Successful, so render.
		res.render('book_detail', {
			title: results.book.title,
			book: results.book,
			book_instances: results.book_instance
		});
	});
};

//书籍创建表单控制函数get，这里将书籍作者和类型作为选择项供用户使用
exports.book_create_get = (req, res, next) => {
	async.parallel({
		authors: function (callback) {
			Author.find(callback);
		},
		genres: function (callback) {
			Genre.find(callback);
		},

	}, function (err, results) {
		if (err) {
			return next(err);
		}
		res.render("book_form", {
			title: "创建书籍",
			authors: results.authors,
			genres: results.genres
		});
	});

};

//书籍创建表单控制中间件组post
exports.book_create_post = [
    // 将类型转换为数组，可是为什么要转换了，不应该就是数组吗？难道是单个字符串？
   (req, res, next) => {
		if (!(req.body.genre instanceof Array)) { //如果genre不是数组
			if (typeof req.body.genre === 'undefined')
				req.body.genre = [];
			else
				req.body.genre = new Array(req.body.genre);
		}
		next();
		},

    // Validate fields.原始代码是先校验后清理，但这时候如果是输入空格，后面的校验就会出现问题，而这样就不会了
    body('title', '标题不能为空').trim().isLength({
		min: 1
	}),
    body('author', '作者不能为空').trim().isLength({
		min: 1
	}),
    body('summary', '简介不能为空').trim().isLength({
		min: 1
	}),
    body('isbn', 'ISBN不能为空').trim().isLength({
		min: 1
	}),
		body("genre", "至少选择一个类型").isLength({
		min: 1
	}), //最好这个验证原始代码中没有，加上之后能够避免类型为空的问题

    // Sanitize fields (using wildcard通配符).
		//sanitizeBody('*').trim().escape(), //使用通配符一次性清理和转义所有字段,但这个会把类型数组清理掉一部分，所以这里暂时不用了
		
    sanitizeBody('genre.*').escape(),
		// Process request after validation and sanitization.验证和清理后处理请求。

	//开始处理请求
    (req, res, next) => {

		// Extract the validation errors from a request.从请求中提取验证错误。
		const errors = validationResult(req);

		// 创建一本新书籍
		var book = new Book({
			title: req.body.title,
			author: req.body.author,
			summary: req.body.summary,
			isbn: req.body.isbn,
			genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre
		});

		if (!errors.isEmpty()) {
			// There are errors. Render form again with sanitized values/error messages.这是错误。再次使用已清理的值/错误消息呈现表单。

			// Get all authors and genres for form.获取所有作者和类型的表格。
			async.parallel({
				authors: function (callback) {
					Author.find(callback);
				},
				genres: function (callback) {
					Genre.find(callback);
				},
			}, function (err, results) {
				if (err) {
					return next(err);
				}

				// Mark our selected genres as checked.将我们选择的类型标记为选中。

				for (let i = 0; i < results.genres.length; i++) {
					if (book.genre.indexOf(results.genres[i]._id) > -1) {
						results.genres[i].checked = 'true';
					} //indexOf找出当前值在数组中的位置，book.genre数组中类型应是小于等于results.genre中的类型数量的，当验证值>-1，说明验证通过。所以能够通过验证的类型都是用户实际选择的，这是都为真.因为在pug模板中并没有判断是呈现初始表单还是错误后呈现，所以这里通过改变值来填充。get时，表单中的选中值是false，post出错时，表单中部分类型的选中值是true
				}
				res.render('book_form', {
					title: '创建书籍',
					authors: results.authors,
					genres: results.genres,
					book: book,
					errors: errors.array()
				});
			});
			return;
		} else {
			// Data from form is valid. Save book.
			book.save(function (err) {
				if (err) {
					return next(err);
				}
				//successful - redirect to new book record.
				res.redirect(book.url);
			});
		}
    }
];

//删除书籍控制get
exports.book_delete_get = (req, res, next) => {
	async.parallel(
		{book: function(callback){
			Book.findById(req.params.id).exec(callback);
		},
		book_bookinstances: function(callback){
			BookInstance.find({"book": req.params.id}).exec(callback);
		}

		},function(err, results){
			if (err) {return next(err);};
			if (results.book == null) {
				res.redirect("/catalog/books");
			}
			res.render("book_delete", {title:"删除书籍", book: results.book, book_bookinstances: results.book_bookinstances});

		}

	)
	
		
};

//删除书籍控制post
exports.book_delete_post = (req, res, next) => {
	async.parallel(
		{book: function(callback){
			Book.findById(req.params.id).exec(callback);
		},
		book_bookinstances: function(callback){
			BookInstance.find({"book": req.params.id}).exec(callback);
		}

		},function(err, results){
			if (err){return next(err);};
			if (results.book_bookinstances.length > 0) {
				res.render("book_delete", {title:"删除书籍",book: results.book, book_bookinstances:results.book_bookinstances})
			}
			else{
				Book.findByIdAndRemove(req.body.bookid,function deleteBook(err){
					if(err){return next(err);}
					res.redirect("/catalog/books")
				})
			}
		}
	);
};

//展示默认书籍更新表单（其实和创建表单要展示的字段都一致，只是有了已选值）
exports.book_update_get = (req, res, next) => {

	// 为表单获取书籍，全部作者和类型类型
	async.parallel({
		book: function (callback) {
			Book.findById(req.params.id).populate('author').populate('genre').exec(callback); //获取当前书籍
		},
		authors: function (callback) {
			Author.find(callback); //获取所有作者
		},
		genres: function (callback) {
			Genre.find(callback); //获取所有类型
		},
	}, function (err, results) {
		if (err) {
			return next(err); //获取错误则交给下一个函数处理错误
		}
		if (results.book == null) { // No results.
			var err = new Error('未找到该书籍');
			err.status = 404;
			return next(err);
		}
		// 获取成功
		// Mark our selected genres as checked.
		for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
			for (var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
				if (results.genres[all_g_iter]._id.toString() == results.book.genre[book_g_iter]._id.toString()) {
					results.genres[all_g_iter].checked = 'true'; //选定一个类型，遍历书籍中所有类型，如果书籍中有类型是该选定的类型，则将该类型设置为选中状态。
				}
			}
		}
		res.render('book_form', {
			title: '更新书籍',
			authors: results.authors,
			genres: results.genres,
			book: results.book
		});
	});

};

//更新书籍post
exports.book_update_post = [

    // 将类型转换为数组
    (req, res, next) => {
		if (!(req.body.genre instanceof Array)) {
			if (typeof req.body.genre === 'undefined')
				req.body.genre = [];
			else
				req.body.genre = new Array(req.body.genre);
		}
		next();
    },

    // Validate fields.
    body('title', '标题不能为空').trim().isLength({
		min: 1}),//我更换了清理空格的顺序
    body('author', '作者不能为空').trim().isLength({
		min: 1
	}),
    body('summary', '简介不能为空').trim().isLength({
		min: 1
	}),
    body('isbn', 'ISBN不能为空').trim().isLength({
		min: 1
	}),

    // Sanitize fields.
    sanitizeBody('title').trim().escape(),
    sanitizeBody('author').trim().escape(),
    sanitizeBody('summary').trim().escape(),
    sanitizeBody('isbn').trim().escape(),
    sanitizeBody('genre.*').trim().escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a Book object with escaped/trimmed data and old id.
		var book = new Book({
			title: req.body.title,
			author: req.body.author,
			summary: req.body.summary,
			isbn: req.body.isbn,
			genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
			_id: req.params.id //This is required, or a new ID will be assigned!这是必需的，否则将分配一个新的ID！
		});
		if (!errors.isEmpty()) {
			// There are errors. Render form again with sanitized values/error messages.

			// Get all authors and genres for form.
			async.parallel({
				authors: function (callback) {
					Author.find(callback);
				},
				genres: function (callback) {
					Genre.find(callback);
				},
			}, function (err, results) {
				if (err) {
					return next(err);
				}

				// Mark our selected genres as checked.
				for (let i = 0; i < results.genres.length; i++) {
					if (book.genre.indexOf(results.genres[i]._id) > -1) {
						results.genres[i].checked = 'true';
					}
				}
				res.render('book_form', {
					title: '更新书籍',
					authors: results.authors,
					genres: results.genres,
					book: book,
					errors: errors.array()
				});
			});
			return;
		} else {
			// Data from form is valid. Update the record.表格中的数据有效。更新记录。
			Book.findByIdAndUpdate(req.params.id, book, {}, function (err, thebook) {
				if (err) {
					return next(err);
				}
				// Successful - redirect to book detail page.
				res.redirect(thebook.url);
			});
		}
    }
];
