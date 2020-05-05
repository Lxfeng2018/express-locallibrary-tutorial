const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//创建类别模式
const GenreSchema = new Schema({
	name:{type:String, require:true, min:3, max: 100}//为什么要把类别单独建一个模型，当作书籍的一个字段不行吗？
});

GenreSchema
	.virtual("url")
	.get(function(){
	return "/catalog/genre/" + this._id;
})

module.exports = mongoose.model("Genre", GenreSchema);