const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");

//创建书籍模式
const BookSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	author: {
		type: Schema.Types.ObjectId,
		ref: 'Author',
		required: true
	}, //引用Author模型，不可为空,书籍关联作者
	summary: {
		type: String,
		required: true
	},
	isbn: {
		type: String,
		required: true
	},
	genre: [{
		type: Schema.Types.ObjectId,
		ref: 'Genre'
	}] //引用Genre模型，书籍关联类别
});

// 虚拟属性'url'：藏书 URL
BookSchema
	.virtual('url')
	.get(function () {
		return '/catalog/book/' + this._id;
	});

BookSchema
	.virtual("due_back_formatted")
	.get(function () {
		return moment(this.due_back).format("YYYY-MM-DD");
	})

// 导出 Book 模块
module.exports = mongoose.model('Book', BookSchema);
