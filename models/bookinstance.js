const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");


//创建书籍副本模式
const BookInstanceSchema = new Schema({
	book: {
		type: Schema.Types.ObjectId,
		ref: 'Book',
		required: true
	}, // 指向相关藏书的引用，书籍副本关联书
	imprint: {
		type: String,
		required: true
	}, // 出版项
	status: {
		type: String,
		required: true,
		enum: ['可供借阅', '馆藏维护', '已借出', '保留'],
		default: '馆藏维护'
	},
	due_back: {
		type: Date,
		default: Date.now
	}
});

// 虚拟属性'url'：藏书副本 URL
BookInstanceSchema
	.virtual('url')
	.get(function () {
		return '/catalog/bookinstance/' + this._id;
	});

//虚拟属性"due_back_formatted"
BookInstanceSchema
	.virtual('due_back_formatted')
	.get(function () {
		return moment(this.due_back).format('YYYY-MM-DD');
	});

// 导出 BookInstancec 模型
module.exports = mongoose.model('BookInstance', BookInstanceSchema);
